"use client";

import React from "react";
import PageShell from "./ui/PageShell";
import type { HomeResumeSnapshot } from "../lib/homeResumePresentation";
import { markHomeReloadStage } from "../lib/homeResumePresentation";
import "./HomeResumeShell.css";

export default function HomeResumeShell({ snapshot }: { snapshot: HomeResumeSnapshot }) {
  React.useLayoutEffect(() => {
    markHomeReloadStage("homeShellReady");
  }, []);

  return (
    <div className="app-container home-resume-app" data-home-resume-shell="true" aria-busy="true" inert>
      <PageShell
        header={<div className="home-resume-header"><i /><i /><i /></div>}
        footer={<div className="home-resume-footer">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>}
      >
        <div className="home-resume-content">
          <div className="home-resume-activity"><i /></div>
          <div className="home-resume-visual" style={{ backgroundImage: `url(${snapshot.backgroundUrl})` }}>
            <div className="home-resume-visual-veil" />
            <img src={snapshot.leaderImageUrl} alt="" aria-hidden="true" />
          </div>
          <div className="home-resume-actions">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
          <div className="home-resume-cta"><i /></div>
          <div className="home-resume-banner"><i /></div>
        </div>
      </PageShell>
    </div>
  );
}
