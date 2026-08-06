"use client";

export default function TutorialNavigator({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 p-2 border border-cyan-500/30 rounded bg-black/30">
      <img
        src="/characters/maya_transparent_asset.png"
        alt="Navigator"
        style={{ width: 54, height: 54, objectFit: "contain", objectPosition: "top" }}
      />
      <div className="text-left">
        <div className="font-size-7 text-color-cyan font-weight-bold">NAVI</div>
        <div className="font-size-7 text-white">{message}</div>
      </div>
    </div>
  );
}
