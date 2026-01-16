import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from 'remotion';
import { createNoise3D } from 'simplex-noise';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const particleFlowSchema = z.object({
  primaryColor: zColor(),
  secondaryColor: zColor(),
  speed: z.number().min(0.1).max(5).default(1),
  particleCount: z.number().min(50).max(500).default(200),
});

export const ParticleFlow: React.FC<z.infer<typeof particleFlowSchema>> = ({
  primaryColor,
  secondaryColor,
  speed = 1,
  particleCount = 200,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const noise3D = useMemo(() => createNoise3D(), []);

  const particles = useMemo(() => {
    return new Array(particleCount).fill(0).map((_, i) => {
      // Deterministic random start positions
      const x = random(i) * width;
      const y = random(i + 1000) * height;
      const size = random(i + 2000) * 10 + 2;
      return { x, y, size, id: i };
    });
  }, [width, height, particleCount]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <svg width={width} height={height}>
        {particles.map((p) => {
          // Animate position based on flow field (noise)
          // We use frame * speed as time dimension
          const time = frame * 0.005 * speed;
          
          // Current position calculation with noise
          // We wrap around screen
          const noiseX = noise3D(p.x * 0.002, p.y * 0.002, time);
          const noiseY = noise3D(p.x * 0.002 + 100, p.y * 0.002 + 100, time);
          
          let currentX = (p.x + noiseX * 100 + frame * speed) % width;
          let currentY = (p.y + noiseY * 100 + frame * 0.5 * speed) % height;
          
          if (currentX < 0) currentX += width;
          if (currentY < 0) currentY += height;

          const color = (i: number) => i % 2 === 0 ? primaryColor : secondaryColor;
          const opacity = Math.abs(noiseX) * 0.8 + 0.2;

          return (
            <circle
              key={p.id}
              cx={currentX}
              cy={currentY}
              r={p.size * (Math.abs(noiseY) + 0.5)}
              fill={color(p.id)}
              opacity={opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
