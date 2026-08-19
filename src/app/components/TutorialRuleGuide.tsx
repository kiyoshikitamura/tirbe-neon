"use client";

import { useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import CharacterPresentation from "./character/CharacterPresentation";
import "./TutorialRuleGuide.css";

const slides = [
  { key: "WORLD", background: "/bg/bg_street_shinjuku.png", title: "いろんな奴が、この街で生きてる。", body: <>新宿、渋谷、池袋、六本木、秋葉原。川崎、横浜。<br />街が違えば、そこにいる奴らも違う。まずは、この世界を好きに歩いてみよう。</> },
  { key: "POWER", background: "/bg/bg_street_shibuya.png", title: "仲間を集めて、もっと強くなる。", body: <>キャラクター、スキル、装備。組み合わせて育てれば、総合力はもっと上がる。<br />強くなったら、バトルでその力を試そう。</> },
  { key: "TRIBE", background: "/bg/bg_street_roppongi.png", title: "気の合う奴らと、TRIBEへ。", body: <>この街には、たくさんのプレイヤーがいる。仲間を見つけて、TRIBEに集まろう。<br />そしていつか、<strong>自分たちのTRIBEで頂点を目指せ。</strong><br /><small>TRIBE設立はプレイヤーLv8で解放</small></> },
];

export default function TutorialRuleGuide() {
  const { onboardingState, setOnboardingState, playCyberSe, navigateTab, setShowMissionPanel } = useGame();
  const [index, setIndex] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workingRef = useRef(false);
  if (onboardingState?.tutorial_step !== "RULE_GUIDE") return null;
  const slide = slides[index];

  const next = async () => {
    if (workingRef.current) return;
    playCyberSe("click");
    if (index < slides.length - 1) { setIndex(value => value + 1); return; }
    workingRef.current = true; setWorking(true); setError(null);
    try {
      const { error: progressError } = await supabase.rpc("advance_tutorial_progress", { p_expected_step: "RULE_GUIDE", p_next_step: "COMPLETE" });
      if (progressError) { setError("進行を保存できませんでした。通信状態を確認して、もう一度お試しください。"); return; }
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "COMPLETE" } : current);
      navigateTab("home");
      setShowMissionPanel(true);
    } finally { workingRef.current = false; setWorking(false); }
  };

  return (
    <div className="tutorial-rule-screen" role="dialog" aria-modal="true" aria-label="チュートリアル完了案内" style={{ backgroundImage: `linear-gradient(180deg,rgba(1,4,10,.3),rgba(1,4,10,.94)),url(${slide.background})` }}>
      <div className="tutorial-rule-ageha" aria-hidden="true"><CharacterPresentation src="/characters/ageha_transparent_asset.png" alt="" variant="dialogue-bust" /></div>
      <div className="tutorial-rule-slides" key={slide.key}>
        <div className="tutorial-rule-progress">{slides.map((entry,i)=><i key={entry.key} className={i<=index?"active":""}/>)}</div>
        <span className="tutorial-rule-kicker">{slide.key}</span>
        <h2>{slide.title}</h2>
        <div className="tutorial-rule-body">{slide.body}</div>
        {index === slides.length - 1 && <p className="tutorial-rule-closing">まあ、最初から全部覚えなくて大丈夫。<br /><br />次にやることは、ミッションを見れば分かるよ。<br />できそうなところから進めてみて。</p>}
        {error && <div className="text-color-red font-size-7" role="alert">{error}</div>}
        <button className="semantic-cta semantic-cta--primary width-100" onClick={() => void next()} disabled={working} aria-busy={working}>
          {working ? "保存中..." : index < slides.length - 1 ? "次へ" : "ミッションへ"}
        </button>
      </div>
    </div>
  );
}
