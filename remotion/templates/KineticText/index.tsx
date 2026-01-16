import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Sequence } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const kineticTextSchema = z.object({
  texts: z.array(z.string()),
  colors: z.array(zColor()),
  backgroundColor: zColor(),
});

export const KineticText: React.FC<z.infer<typeof kineticTextSchema>> = ({
  texts,
  colors,
  backgroundColor,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Calculate duration per word
  const durationPerText = Math.floor(durationInFrames / texts.length);

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      {texts.map((text, index) => {
        const from = index * durationPerText;
        const color = colors[index % colors.length];

        return (
          <Sequence key={index} from={from} durationInFrames={durationPerText} layout="none">
             <Word text={text} color={color} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Word: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const rotate = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
    from: -10,
    to: 0,
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    }}>
      <h1 style={{
        fontFamily: 'Impact, sans-serif',
        fontSize: 200,
        color: color,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1,
      }}>
        {text}
      </h1>
    </div>
  );
};
