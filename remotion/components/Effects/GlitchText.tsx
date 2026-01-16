import React from 'react';
import { useCurrentFrame, random } from 'remotion';

export const GlitchText: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ text, fontSize = 80, color = 'white', style }) => {
  const frame = useCurrentFrame();
  
  // Create deterministic noise based on frame
  // We want glitch to happen occasionally, not every frame
  const glitchTrigger = random(Math.floor(frame / 5)) > 0.8;
  
  const offsetX = glitchTrigger ? (random(frame) - 0.5) * 20 : 0;
  const offsetY = glitchTrigger ? (random(frame + 1) - 0.5) * 10 : 0;
  
  const baseStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize,
    color,
    position: 'relative',
    display: 'inline-block',
    ...style,
  };

  return (
    <div style={baseStyle}>
      {/* Main Text */}
      <span style={{ position: 'relative', zIndex: 2 }}>{text}</span>
      
      {/* Red Channel */}
      {glitchTrigger && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            color: 'red',
            transform: `translate(${offsetX}px, ${offsetY}px)`,
            opacity: 0.8,
            clipPath: `inset(${random(frame) * 100}% 0 ${random(frame + 2) * 50}% 0)`,
            zIndex: 1,
          }}
        >
          {text}
        </span>
      )}

      {/* Blue Channel */}
      {glitchTrigger && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            color: 'cyan',
            transform: `translate(${-offsetX}px, ${-offsetY}px)`,
            opacity: 0.8,
            clipPath: `inset(${random(frame + 3) * 50}% 0 ${random(frame + 4) * 100}% 0)`,
            zIndex: 1,
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
};
