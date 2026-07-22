"use client";

import React, { useState, useEffect } from "react";
import "./AvatarRenderer.css";

interface AvatarConfig {
  gender: string;
  hair_id: string;
  face_id: string;
  body_id: string;
  shoes_id: string | null;
  accessory_id: string | null;
  bg_effect_1_id: string | null;
  bg_effect_2_id: string | null;
}

interface AvatarRendererProps {
  avatar: AvatarConfig | null;
  size?: number; // 表示サイズ (px)
  showBackground?: boolean; // 固定アバター背景を表示するかどうか
}

export default function AvatarRenderer({ avatar, size = 250, showBackground = false }: AvatarRendererProps) {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);

  // 装着されているパーツ一覧から、有効な画像URLのリストを構築する
  const getActiveLayers = () => {
    if (!avatar) return [];

    const layers: { id: string; zIndex: number; path: string }[] = [];

    // 1. 背景エフェクト1
    if (avatar.bg_effect_1_id) {
      layers.push({ id: "bg1", zIndex: 1, path: `/avatar/${avatar.bg_effect_1_id}.webp` });
    }
    // 2. 背景エフェクト2
    if (avatar.bg_effect_2_id) {
      layers.push({ id: "bg2", zIndex: 2, path: `/avatar/${avatar.bg_effect_2_id}.webp` });
    }
    // 3. 素体 (gender に基づく)
    const baseId = avatar.gender === "FEMALE" ? "base_female" : "base_male";
    layers.push({ id: "base", zIndex: 3, path: `/avatar/${baseId}.webp` });

    // 4. 表情
    if (avatar.face_id) {
      layers.push({ id: "face", zIndex: 4, path: `/avatar/${avatar.face_id}.webp` });
    }
    // 5. 服装
    if (avatar.body_id) {
      layers.push({ id: "body", zIndex: 5, path: `/avatar/${avatar.body_id}.webp` });
    }
    // 6. 靴
    if (avatar.shoes_id) {
      layers.push({ id: "shoes", zIndex: 6, path: `/avatar/${avatar.shoes_id}.webp` });
    }
    // 7. 髪型
    if (avatar.hair_id) {
      layers.push({ id: "hair", zIndex: 7, path: `/avatar/${avatar.hair_id}.webp` });
    }
    // 8. アクセサリー
    if (avatar.accessory_id) {
      layers.push({ id: "accessory", zIndex: 8, path: `/avatar/${avatar.accessory_id}.webp` });
    }

    return layers;
  };

  const activeLayers = getActiveLayers();

  // アバター構成が変わるたびにロード状態をリセット
  useEffect(() => {
    setLoadedImages({});
    setIsReady(false);
    
    if (activeLayers.length === 0) {
      setIsReady(true);
    }
  }, [
    avatar?.gender,
    avatar?.hair_id,
    avatar?.face_id,
    avatar?.body_id,
    avatar?.shoes_id,
    avatar?.accessory_id,
    avatar?.bg_effect_1_id,
    avatar?.bg_effect_2_id
  ]);

  const handleImageLoad = (layerId: string) => {
    setLoadedImages(prev => {
      const next = { ...prev, [layerId]: true };
      
      // すべての有効レイヤーがロード完了したか確認
      const allLoaded = activeLayers.every(layer => next[layer.id]);
      if (allLoaded) {
        setIsReady(true);
      }
      return next;
    });
  };

  if (!avatar) {
    return (
      <div 
        className="avatar-renderer-placeholder flex-col-center justify-center bg-black-60 border-subtle" 
        style={{ width: size, height: size }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div 
      className={`avatar-renderer-container ${showBackground ? "has-avatar-bg" : ""}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* 読込中のプレースホルダー影絵表示 */}
      {!isReady && (
        <div className="avatar-renderer-skeleton flex-col-center justify-center">
          <div className="avatar-shadow-silhouette" />
          <div className="spinner absolute" />
        </div>
      )}

      {/* レイヤードアバター画像群 */}
      <div 
        className="avatar-layers-wrapper"
        style={{ 
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.3s ease-in-out"
        }}
      >
        {activeLayers.map(layer => (
          <img
            key={layer.id}
            src={layer.path}
            alt={layer.id}
            onLoad={() => handleImageLoad(layer.id)}
            onError={() => handleImageLoad(layer.id)} // エラー時も進行させるためにロード完了扱いにする
            className="avatar-layer-image"
            style={{ zIndex: layer.zIndex }}
          />
        ))}
      </div>
    </div>
  );
}
