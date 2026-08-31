"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "@/audio/AudioProvider";
import { AUDIO_STORAGE_KEY, BGM_ASSETS, SE_ASSETS, type BgmScene, type SeEvent } from "@/audio/audioContract";
import "./audio-lifecycle.css";

type Result = "NOT_RUN" | "PASS" | "FAIL";
type ProbeEvent = { at: string; message: string };
type ProbeState = {
  contexts: AudioContext[];
  resumes: number;
  suspends: number;
  closes: number;
  starts: number;
  stops: number;
  events: ProbeEvent[];
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __tribeAudioLifecycleProbe?: ProbeState;
  }
}

const MATRIX = [
  ["A", "fresh load"], ["B", "first user gesture"], ["C", "Title → Home"],
  ["D", "Home → Battle → Home"], ["E", "Home → Raid → Home"],
  ["F", "tab/background → foreground"], ["G", "screen lock → unlock"],
  ["H", "Safari app switch → return"], ["I", "OAuth → return"], ["J", "reload"],
  ["K", "BGM OFF → ON"], ["L", "SE OFF → ON"], ["M", "volume change"],
  ["N", "consecutive Battle"], ["O", "long session"],
] as const;

const qaStorageKey = "tribe_neon_audio_lifecycle_qa_v1";
const clock = () => new Date().toLocaleTimeString("ja-JP", { hour12: false });

function addEvent(probe: ProbeState, message: string) {
  probe.events = [{ at: clock(), message }, ...probe.events].slice(0, 80);
}

function armProbe(): ProbeState {
  if (window.__tribeAudioLifecycleProbe) return window.__tribeAudioLifecycleProbe;
  const probe: ProbeState = { contexts: [], resumes: 0, suspends: 0, closes: 0, starts: 0, stops: 0, events: [] };
  window.__tribeAudioLifecycleProbe = probe;
  const NativeContext = window.AudioContext || window.webkitAudioContext;
  if (NativeContext) {
    const WrappedContext = new Proxy(NativeContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        probe.contexts.push(context);
        addEvent(probe, `AudioContext created (${context.state})`);
        context.addEventListener("statechange", () => addEvent(probe, `AudioContext state → ${context.state}`));
        return context;
      },
    });
    if (window.AudioContext) window.AudioContext = WrappedContext;
    if (window.webkitAudioContext) window.webkitAudioContext = WrappedContext;
  }
  const contextPrototype = NativeContext?.prototype;
  if (contextPrototype) {
    const resume = contextPrototype.resume;
    const suspend = contextPrototype.suspend;
    const close = contextPrototype.close;
    contextPrototype.resume = function () { probe.resumes += 1; addEvent(probe, "resume() requested"); return resume.call(this); };
    contextPrototype.suspend = function () { probe.suspends += 1; addEvent(probe, "suspend() requested"); return suspend.call(this); };
    contextPrototype.close = function () { probe.closes += 1; addEvent(probe, "close() requested"); return close.call(this); };
  }
  const sourcePrototype = window.AudioBufferSourceNode?.prototype;
  if (sourcePrototype) {
    const start = sourcePrototype.start;
    const stop = sourcePrototype.stop;
    sourcePrototype.start = function (...args) { probe.starts += 1; addEvent(probe, "source.start()"); return start.apply(this, args); };
    sourcePrototype.stop = function (...args) { probe.stops += 1; addEvent(probe, "source.stop()"); return stop.apply(this, args); };
  }
  addEvent(probe, "probe armed");
  return probe;
}

export default function AudioLifecycleHarness() {
  const audio = useAudio();
  const [tick, setTick] = useState(0);
  const [results, setResults] = useState<Record<string, { result: Result; note: string }>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      const storedResults = JSON.parse(localStorage.getItem(qaStorageKey) || "{}");
      queueMicrotask(() => setResults(storedResults));
    } catch { /* QA notes are optional. */ }
    const lifecycle = ["visibilitychange", "pageshow", "pagehide", "focus", "blur", "online", "offline"] as const;
    const record = (event: Event) => {
      const probe = window.__tribeAudioLifecycleProbe;
      if (probe) addEvent(probe, `${event.type} (hidden=${document.hidden})`);
      setTick((value) => value + 1);
    };
    lifecycle.forEach((name) => window.addEventListener(name, record));
    const interval = window.setInterval(() => setTick((value) => value + 1), 500);
    return () => {
      lifecycle.forEach((name) => window.removeEventListener(name, record));
      window.clearInterval(interval);
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  const persistResults = useCallback((next: typeof results) => {
    setResults(next);
    try { localStorage.setItem(qaStorageKey, JSON.stringify(next)); } catch { /* QA notes are optional. */ }
  }, []);

  const runSequence = useCallback((scenes: BgmScene[]) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = scenes.map((scene, index) => window.setTimeout(() => audio.playBgm(scene), index * 1800));
  }, [audio]);

  const probe = typeof window === "undefined" ? undefined : window.__tribeAudioLifecycleProbe;
  const contextStates = probe?.contexts.map((context) => context.state).join(", ") || "not created";
  void tick;
  const storedSettings = typeof window === "undefined"
    ? "not available"
    : localStorage.getItem(AUDIO_STORAGE_KEY) || "not written";

  const armAndUnlock = async () => {
    armProbe();
    setTick((value) => value + 1);
    await audio.unlockAudio();
    setTick((value) => value + 1);
  };

  const playSe = (event: SeEvent) => {
    audio.playSe(event);
    window.setTimeout(() => setTick((value) => value + 1), 120);
  };

  return <main className="audio-qa" data-qa-harness="audio-lifecycle">
    <header>
      <small>PREVIEW / DEVELOPMENT ONLY</small>
      <h1>Audio Lifecycle Human QA</h1>
      <p>Ear check + lifecycle telemetry. Production Audio implementation is used unchanged.</p>
    </header>

    <section className="audio-qa-warning">
      <strong>First action:</strong> On a fresh load, confirm silence and <code>not created</code>, then tap the unlock button exactly once.
    </section>

    <section className="audio-qa-grid">
      <article>
        <h2>Live state</h2>
        <dl>
          <div><dt>Provider unlocked</dt><dd>{String(audio.unlocked)}</dd></div>
          <div><dt>Desired scene</dt><dd>{audio.currentScene || "none"}</dd></div>
          <div><dt>Context state</dt><dd>{contextStates}</dd></div>
          <div><dt>Context count</dt><dd>{probe?.contexts.length || 0}</dd></div>
          <div><dt>resume / suspend</dt><dd>{probe?.resumes || 0} / {probe?.suspends || 0}</dd></div>
          <div><dt>source start / stop</dt><dd>{probe?.starts || 0} / {probe?.stops || 0}</dd></div>
          <div><dt>document.hidden</dt><dd>{String(typeof document !== "undefined" && document.hidden)}</dd></div>
        </dl>
        <button className="audio-qa-primary" onClick={() => void armAndUnlock()}>Arm probe + unlock (user gesture)</button>
      </article>

      <article>
        <h2>BGM scene controls</h2>
        <div className="audio-qa-actions">
          {(Object.keys(BGM_ASSETS) as BgmScene[]).map((scene) => <button key={scene} onClick={() => audio.playBgm(scene)}>{scene}</button>)}
          <button onClick={audio.stopBgm}>STOP</button>
        </div>
        <h3>Route simulations (1.8s per leg)</h3>
        <div className="audio-qa-actions">
          <button onClick={() => runSequence(["TITLE", "HOME"])}>Title → Home</button>
          <button onClick={() => runSequence(["HOME", "BATTLE", "HOME"])}>Home → Battle → Home</button>
          <button onClick={() => runSequence(["HOME", "RAID", "HOME"])}>Home → Raid → Home</button>
          <button onClick={() => runSequence(["BATTLE", "HOME", "BATTLE"])}>Consecutive Battle</button>
        </div>
      </article>

      <article>
        <h2>SE checks</h2>
        <div className="audio-qa-actions">
          <button onClick={() => playSe("UI_TAP")}>UI_TAP</button>
          <button onClick={() => playSe("UI_MODAL_OPEN")}>UI_MODAL_OPEN</button>
          <button onClick={() => playSe("BATTLE_SKILL")}>BATTLE_SKILL</button>
          <button onClick={() => playSe("BATTLE_CRITICAL")}>BATTLE_CRITICAL</button>
        </div>
        <p>One tap must produce one audible SE and a +1 source-start delta after the asset is cached.</p>
      </article>

      <article>
        <h2>Settings / persistence</h2>
        <div className="audio-qa-switches">
          <button aria-pressed={audio.bgmEnabled} onClick={() => audio.setBgmEnabled(!audio.bgmEnabled)}>BGM {audio.bgmEnabled ? "ON" : "OFF"}</button>
          <button aria-pressed={audio.seEnabled} onClick={() => audio.setSeEnabled(!audio.seEnabled)}>SE {audio.seEnabled ? "ON" : "OFF"}</button>
        </div>
        <label>BGM volume <output>{Math.round(audio.bgmVolume * 100)}%</output><input aria-label="BGM volume" type="range" min="0" max="1" step="0.05" value={audio.bgmVolume} onChange={(event) => audio.setBgmVolume(Number(event.target.value))} /></label>
        <label>SE volume <output>{Math.round(audio.seVolume * 100)}%</output><input aria-label="SE volume" type="range" min="0" max="1" step="0.05" value={audio.seVolume} onChange={(event) => audio.setSeVolume(Number(event.target.value))} /></label>
        <code className="audio-qa-storage" suppressHydrationWarning>{storedSettings}</code>
        <button onClick={() => window.location.reload()}>Reload harness</button>
      </article>
    </section>

    <section>
      <h2>Lifecycle event log</h2>
      <ol className="audio-qa-log">{(probe?.events || []).map((entry, index) => <li key={`${entry.at}-${index}`}><time>{entry.at}</time> {entry.message}</li>)}</ol>
    </section>

    <section>
      <div className="audio-qa-matrix-heading"><h2>Acceptance matrix</h2><button onClick={() => persistResults({})}>Reset results</button></div>
      <p>Check: blocked/silent/double/previous-track residue/suspended context/double SE/volume reset/settings persistence.</p>
      <div className="audio-qa-matrix">{MATRIX.map(([id, label]) => {
        const row = results[id] || { result: "NOT_RUN" as Result, note: "" };
        return <article key={id} data-result={row.result}>
          <strong>{id}. {label}</strong>
          <select aria-label={`${id} result`} value={row.result} onChange={(event) => persistResults({ ...results, [id]: { ...row, result: event.target.value as Result } })}>
            <option value="NOT_RUN">NOT RUN</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option>
          </select>
          <input aria-label={`${id} note`} placeholder="device / observation" value={row.note} onChange={(event) => persistResults({ ...results, [id]: { ...row, note: event.target.value } })} />
        </article>;
      })}</div>
    </section>

    <details><summary>Canonical asset registry</summary><pre>{JSON.stringify({ BGM_ASSETS, SE_ASSETS }, null, 2)}</pre></details>
  </main>;
}
