import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const DynamicBackground: React.FC<{
    variant?: 'gradient' | 'mesh' | 'particles';
    colors?: string[];
}> = ({ variant = 'gradient', colors }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (variant === 'particles') {
      return (
          <AbsoluteFill style={{ backgroundColor: '#000', zIndex: -1 }}>
             {new Array(30).fill(0).map((_, i) => {
                 const speed = (i % 5) + 1;
                 const y = (frame * speed + i * 100) % height;
                 const x = (Math.sin(frame / 50 + i) * 100) + (i * 50) % width;
                 const opacity = Math.sin(frame / 20 + i);
                 
                 return (
                     <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: x,
                            top: y,
                            width: 10,
                            height: 10,
                            backgroundColor: colors ? colors[i % colors.length] : 'white',
                            borderRadius: '50%',
                            opacity: Math.abs(opacity),
                            filter: 'blur(5px)',
                        }}
                     />
                 );
             })}
          </AbsoluteFill>
      );
  }

  // Default Gradient
  const degrees = (frame * 0.5) % 360;
  const x = Math.sin(frame / 60) * 10;
  const y = Math.cos(frame / 60) * 10;

  const bgColors = colors || ['#1a1a2e', '#16213e', '#0f3460'];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${degrees}deg, ${bgColors[0]} 0%, ${bgColors[1]} 50%, ${bgColors[2]} 100%)`,
        backgroundSize: '200% 200%',
        backgroundPosition: `${50 + x}% ${50 + y}%`,
        zIndex: -1, 
      }}
    />
  );
};
