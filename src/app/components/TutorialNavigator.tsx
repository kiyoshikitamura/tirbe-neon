"use client";

import CharacterPresentation from "./character/CharacterPresentation";

export default function TutorialNavigator({ message }: { message: string }) {
  return (
    <div className="tutorial-navigator">
      <div className="tutorial-navigator-portrait">
        <CharacterPresentation
          src="/characters/ageha_transparent_asset.png"
          alt="アゲハ"
          variant="portrait"
          className="tutorial-navigator-character"
        />
      </div>
      <div className="tutorial-navigator-copy text-left">
        <div className="tutorial-navigator-name font-size-8 text-color-cyan font-weight-bold">アゲハ</div>
        <div className="tutorial-navigator-message text-white">{message}</div>
      </div>
    </div>
  );
}
