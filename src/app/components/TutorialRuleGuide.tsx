"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import CharacterPresentation from "./character/CharacterPresentation";
import BrandedLoading from "./ui/BrandedLoading";
import { getTutorialCompletionAssetStatus, preloadTutorialCompletionAssets } from "../lib/tutorialCompletionAssets";
import "./TutorialRuleGuide.css";

const slides = [
  {
    key: "WORLD",
    image: "/branding/world.png",
    alt: "夜の街で暮らすアゲハとレオ、行き交うさまざまな人々",
    title: "いろんな奴が、この街で生きてる。",
    body: <>新宿、渋谷、池袋、六本木、秋葉原。川崎、横浜。<br />街が違えば、そこにいる奴らも違う。まずは、この世界を好きに歩いてみよう。</>,
  },
  {
    key: "POWER",
    image: "/branding/power.png",
    alt: "仲間を育成し、スキルや装備を整えるゴウとカエデ",
    title: "仲間を集めて、もっと強くなる。",
    body: <>キャラクター、スキル、装備。組み合わせて育てれば、総合力はもっと上がる。<br />強くなったら、バトルでその力を試そう。</>,
  },
  {
    key: "TRIBE",
    image: "/branding/tribe.png",
    alt: "レイジを中心に集まったTRIBEの仲間たち",
    title: "気の合う奴らと、TRIBEへ。",
    body: <>この街には、たくさんのプレイヤーがいる。仲間を見つけて、TRIBEに集まろう。<br />そしていつか、<strong>自分たちのTRIBEで頂点を目指せ。</strong><br /><small>TRIBE設立はプレイヤーLv8で解放</small></>,
  },
] as const;

const LANDING_DELAY_MS = 240;
const SLIDE_SWAP_MS = 180;
const SLIDE_TRANSITION_MS = 420;

export default function TutorialRuleGuide() {
  const { onboardingState, setOnboardingState, playCyberSe, navigateTab, setShowMissionPanel } = useGame();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"BRIDGE" | "SLIDES">("BRIDGE");
  const [working, setWorking] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const workingRef = useRef(false);
  const landedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const tutorialStep = onboardingState?.tutorial_step;

  useEffect(() => {
    if (tutorialStep !== "RULE_GUIDE") return;
    if (!landedRef.current) {
      landedRef.current = true;
      navigateTab("home");
      setShowMissionPanel(false);
    }
    void preloadTutorialCompletionAssets();
    const landingTimer = window.setTimeout(() => setOverlayVisible(true), LANDING_DELAY_MS);
    return () => window.clearTimeout(landingTimer);
    // The tutorial step is the lifecycle boundary. Context action identities
    // may change during bootstrap and must not keep restarting this reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStep]);

  useEffect(() => () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => setImageFailed(false), [index]);

  if (tutorialStep !== "RULE_GUIDE") return null;
  const slide = slides[index];

  const next = async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    playCyberSe("click");

    if (phase === "BRIDGE") {
      setWorking(true);
      await Promise.race([
        preloadTutorialCompletionAssets(),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      setPhase("SLIDES");
      setWorking(false);
      workingRef.current = false;
      return;
    }

    if (index < slides.length - 1) {
      setTransitioning(true);
      timersRef.current.push(window.setTimeout(() => setIndex((value) => value + 1), SLIDE_SWAP_MS));
      timersRef.current.push(window.setTimeout(() => {
        setTransitioning(false);
        workingRef.current = false;
      }, SLIDE_TRANSITION_MS));
      return;
    }

    setWorking(true);
    setError(null);
    try {
      const { error: progressError } = await supabase.rpc("advance_tutorial_progress", { p_expected_step: "RULE_GUIDE", p_next_step: "COMPLETE" });
      if (progressError) {
        setError("進行を保存できませんでした。通信状態を確認して、もう一度お試しください。");
        return;
      }
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "COMPLETE" } : current);
      navigateTab("home");
      setShowMissionPanel(true);
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  };

  if (!overlayVisible) return <div className="tutorial-rule-landing-guard" aria-hidden="true" />;

  if (phase === "BRIDGE") {
    return (
      <div className="tutorial-rule-screen tutorial-completion-bridge" role="dialog" aria-modal="true" aria-label="チュートリアル完了" data-acceptance-state="COMPLETION_DIALOGUE" data-completion-assets={getTutorialCompletionAssetStatus()}>
        <section className="tutorial-completion-scene">
          <div className="tutorial-completion-ageha" aria-hidden="true">
            <CharacterPresentation src="/characters/ageha_transparent_asset.png" alt="" variant="dialogue-bust" />
          </div>
          <div className="tutorial-completion-dialogue">
            <small>アゲハ</small>
            <p>これでチュートリアルは終わり。<br />最後に、TRIBE NEONの世界を紹介するね。</p>
            {working && <BrandedLoading className="tutorial-completion-loading" label="世界紹介を準備中" />}
            <button className="semantic-cta semantic-cta--primary width-100" onClick={() => void next()} disabled={working} aria-busy={working}>次へ</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="tutorial-rule-screen" role="dialog" aria-modal="true" aria-label="チュートリアル完了案内" data-rule-slide={slide.key} data-acceptance-state={slide.key}>
      <section className={`tutorial-rule-card tutorial-rule-card--${slide.key.toLowerCase()} ${transitioning ? "is-transitioning" : ""}`}>
        <div className="tutorial-rule-illustration">
          {!imageFailed ? <Image
            src={slide.image}
            alt={slide.alt}
            fill
            quality={95}
            sizes="(max-width: 430px) 100vw, 430px"
            priority={index === 0}
            onError={() => setImageFailed(true)}
          /> : <BrandedLoading className="tutorial-rule-image-fallback" label={`${slide.key}を準備中`} />}
          <div className="tutorial-rule-illustration-shade" aria-hidden="true" />
        </div>

        <div className="tutorial-rule-content">
          <div className="tutorial-rule-heading">
            <span className="tutorial-rule-kicker">{slide.key}</span>
            <span className="tutorial-rule-count">{index + 1} / {slides.length}</span>
          </div>
          <h2>{slide.title}</h2>
          <div className="tutorial-rule-body">{slide.body}</div>
          <div className="tutorial-rule-progress" aria-label={`${index + 1} / ${slides.length}`}>
            {slides.map((entry, slideIndex) => <i key={entry.key} className={slideIndex === index ? "active" : ""} />)}
          </div>
          {error && <div className="tutorial-rule-error" role="alert">{error}</div>}
          <button
            className="semantic-cta semantic-cta--primary width-100"
            onClick={() => void next()}
            disabled={working || transitioning}
            aria-busy={working || transitioning}
          >
            {working ? "保存中..." : index < slides.length - 1 ? "次へ" : "ミッションへ"}
          </button>
        </div>
      </section>
    </div>
  );
}
