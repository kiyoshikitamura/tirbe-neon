"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_DEFAULTS,
  AUDIO_STORAGE_KEY,
  BGM_ASSETS,
  LEGACY_SE_EVENT_MAP,
  SE_ASSETS,
  SE_COOLDOWN_MS,
  SE_PRIORITY,
  type BgmScene,
  type SeEvent,
} from "./audioContract";

type AudioSettings = {
  bgmEnabled: boolean;
  seEnabled: boolean;
  bgmVolume: number;
  seVolume: number;
};

type AudioContextValue = AudioSettings & {
  currentScene: BgmScene | null;
  unlocked: boolean;
  unlockAudio: () => Promise<void>;
  playBgm: (scene: BgmScene) => void;
  stopBgm: () => void;
  playSe: (event: SeEvent) => void;
  playLegacySe: (event: string) => void;
  preloadAudio: (options: { scene?: BgmScene; events?: SeEvent[] }) => void;
  setBgmVolume: (volume: number) => void;
  setSeVolume: (volume: number) => void;
  setBgmEnabled: (enabled: boolean) => void;
  setSeEnabled: (enabled: boolean) => void;
};

const AudioContextState = createContext<AudioContextValue | null>(null);
const FADE_SECONDS = 0.3;

const clampVolume = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(AUDIO_DEFAULTS);
  const [currentScene, setCurrentScene] = useState<BgmScene | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const settingsRef = useRef(settings);
  const desiredSceneRef = useRef<BgmScene | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmPathRef = useRef<string | null>(null);
  const bufferCacheRef = useRef(new Map<string, AudioBuffer | null>());
  const pendingBufferRef = useRef(new Map<string, Promise<AudioBuffer | null>>());
  const lastSeAtRef = useRef(new Map<SeEvent, number>());
  const recentPriorityRef = useRef({ priority: -1, at: 0 });
  const transitionRef = useRef(0);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(AUDIO_STORAGE_KEY) || "null");
      if (stored && typeof stored === "object") {
        setSettings({
          bgmEnabled: stored.bgmEnabled !== false,
          seEnabled: stored.seEnabled !== false,
          bgmVolume: clampVolume(Number(stored.bgmVolume ?? AUDIO_DEFAULTS.bgmVolume)),
          seVolume: clampVolume(Number(stored.seVolume ?? AUDIO_DEFAULTS.seVolume)),
        });
      }
    } catch {
      // Corrupt client preferences fall back to safe defaults.
    }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage is optional */ }
  }, [settings]);

  const getContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      contextRef.current = new AudioContextClass();
      return contextRef.current;
    } catch {
      return null;
    }
  }, []);

  const loadBuffer = useCallback(async (path: string): Promise<AudioBuffer | null> => {
    if (bufferCacheRef.current.has(path)) return bufferCacheRef.current.get(path) ?? null;
    const pending = pendingBufferRef.current.get(path);
    if (pending) return pending;
    const request = (async () => {
      try {
        const response = await fetch(path, { cache: "force-cache" });
        if (!response.ok) {
          bufferCacheRef.current.set(path, null);
          return null;
        }
        const context = getContext();
        if (!context) return null;
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        bufferCacheRef.current.set(path, buffer);
        return buffer;
      } catch {
        bufferCacheRef.current.set(path, null);
        return null;
      } finally {
        pendingBufferRef.current.delete(path);
      }
    })();
    pendingBufferRef.current.set(path, request);
    return request;
  }, [getContext]);

  const stopActiveBgm = useCallback((fade = true) => {
    const context = contextRef.current;
    const source = bgmSourceRef.current;
    const gain = bgmGainRef.current;
    bgmSourceRef.current = null;
    bgmGainRef.current = null;
    bgmPathRef.current = null;
    if (!source) return;
    try {
      if (fade && context && gain) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
        source.stop(now + FADE_SECONDS + 0.02);
      } else {
        source.stop();
      }
    } catch { /* an already-ended source is safe */ }
  }, []);

  const startDesiredBgm = useCallback(async () => {
    const scene = desiredSceneRef.current;
    if (!scene || !settingsRef.current.bgmEnabled || document.hidden) return;
    const context = getContext();
    if (!context || context.state !== "running") return;
    const path = BGM_ASSETS[scene];
    if (bgmPathRef.current === path && bgmSourceRef.current) return;
    const transition = ++transitionRef.current;
    const buffer = await loadBuffer(path);
    if (!buffer || transition !== transitionRef.current || desiredSceneRef.current !== scene || !settingsRef.current.bgmEnabled || document.hidden) return;
    stopActiveBgm(true);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(settingsRef.current.bgmVolume, now + FADE_SECONDS);
    source.start();
    bgmSourceRef.current = source;
    bgmGainRef.current = gain;
    bgmPathRef.current = path;
  }, [getContext, loadBuffer, stopActiveBgm]);

  const unlockAudio = useCallback(async () => {
    const context = getContext();
    if (!context) return;
    try {
      if (context.state !== "running") await context.resume();
      if (context.state === "running") {
        setUnlocked(true);
        void startDesiredBgm();
      }
    } catch {
      // Browser policy failures never block gameplay; the next gesture can retry.
    }
  }, [getContext, startDesiredBgm]);

  const playBgm = useCallback((scene: BgmScene) => {
    const previousPath = desiredSceneRef.current ? BGM_ASSETS[desiredSceneRef.current] : null;
    desiredSceneRef.current = scene;
    setCurrentScene(scene);
    if (previousPath === BGM_ASSETS[scene] && bgmSourceRef.current) return;
    void startDesiredBgm();
  }, [startDesiredBgm]);

  const stopBgm = useCallback(() => {
    desiredSceneRef.current = null;
    setCurrentScene(null);
    transitionRef.current += 1;
    stopActiveBgm(true);
  }, [stopActiveBgm]);

  const playSe = useCallback((event: SeEvent) => {
    if (!settingsRef.current.seEnabled || document.hidden) return;
    const context = contextRef.current;
    if (!context || context.state !== "running") return;
    const nowMs = performance.now();
    const cooldown = SE_COOLDOWN_MS[event] ?? 0;
    if (nowMs - (lastSeAtRef.current.get(event) ?? -Infinity) < cooldown) return;
    const priority = SE_PRIORITY[event];
    const recent = recentPriorityRef.current;
    if (nowMs - recent.at < 180 && priority < recent.priority) return;
    lastSeAtRef.current.set(event, nowMs);
    if (priority >= recent.priority || nowMs - recent.at >= 180) recentPriorityRef.current = { priority, at: nowMs };
    void loadBuffer(SE_ASSETS[event]).then((buffer) => {
      if (!buffer || !settingsRef.current.seEnabled || document.hidden || context.state !== "running") return;
      try {
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = settingsRef.current.seVolume;
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
      } catch { /* a single unavailable sound never blocks the UI */ }
    });
  }, [loadBuffer]);

  const playLegacySe = useCallback((event: string) => {
    const semanticEvent = LEGACY_SE_EVENT_MAP[event] ?? event;
    if (semanticEvent in SE_ASSETS) playSe(semanticEvent as SeEvent);
  }, [playSe]);

  const preloadAudio = useCallback(({ scene, events = [] }: { scene?: BgmScene; events?: SeEvent[] }) => {
    if (scene) void loadBuffer(BGM_ASSETS[scene]);
    events.forEach((event) => { void loadBuffer(SE_ASSETS[event]); });
  }, [loadBuffer]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const context = contextRef.current;
      if (!context) return;
      if (document.hidden) {
        void context.suspend().catch(() => undefined);
      } else if (unlocked) {
        void context.resume().then(() => startDesiredBgm()).catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [startDesiredBgm, unlocked]);

  useEffect(() => {
    if (!settings.bgmEnabled) {
      transitionRef.current += 1;
      stopActiveBgm(true);
    } else {
      void startDesiredBgm();
    }
  }, [settings.bgmEnabled, startDesiredBgm, stopActiveBgm]);

  useEffect(() => {
    const context = contextRef.current;
    const gain = bgmGainRef.current;
    if (!context || !gain) return;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.linearRampToValueAtTime(settings.bgmVolume, context.currentTime + 0.08);
  }, [settings.bgmVolume]);

  useEffect(() => () => {
    transitionRef.current += 1;
    stopActiveBgm(false);
    void contextRef.current?.close().catch(() => undefined);
  }, [stopActiveBgm]);

  const value = useMemo<AudioContextValue>(() => ({
    ...settings,
    currentScene,
    unlocked,
    unlockAudio,
    playBgm,
    stopBgm,
    playSe,
    playLegacySe,
    preloadAudio,
    setBgmVolume: (volume) => setSettings((current) => ({ ...current, bgmVolume: clampVolume(volume) })),
    setSeVolume: (volume) => setSettings((current) => ({ ...current, seVolume: clampVolume(volume) })),
    setBgmEnabled: (enabled) => setSettings((current) => ({ ...current, bgmEnabled: enabled })),
    setSeEnabled: (enabled) => setSettings((current) => ({ ...current, seEnabled: enabled })),
  }), [currentScene, playBgm, playLegacySe, playSe, preloadAudio, settings, stopBgm, unlockAudio, unlocked]);

  return <AudioContextState.Provider value={value}>{children}</AudioContextState.Provider>;
}

export function useAudio() {
  const value = useContext(AudioContextState);
  if (!value) throw new Error("useAudio must be used inside AudioProvider");
  return value;
}
