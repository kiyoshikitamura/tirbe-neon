"use client";

export default function TutorialNavigator({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 p-2 border border-cyan-500/30 rounded bg-black/30">
      <img
        src="/characters/maya_transparent_asset.png"
        alt="ナビ"
        style={{ width: 92, height: 116, objectFit: "contain", objectPosition: "bottom" }}
      />
      <div className="text-left">
        <div className="font-size-8 text-color-cyan font-weight-bold">ナビ</div>
        <div className="font-size-8 text-white">{message}</div>
      </div>
    </div>
  );
}
