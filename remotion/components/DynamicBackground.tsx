import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const DynamicBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 缓慢旋转渐变角度
  const degrees = (frame * 0.5) % 360;
  
  // 缓慢移动背景位置 (用于 Mesh Gradient 效果)
  const x = Math.sin(frame / 60) * 10;
  const y = Math.cos(frame / 60) * 10;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${degrees}deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
        backgroundSize: '200% 200%',
        backgroundPosition: `${50 + x}% ${50 + y}%`,
        zIndex: -1, // 确保在最底层
      }}
    />
  );
};
