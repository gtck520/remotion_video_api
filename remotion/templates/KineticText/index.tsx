import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Sequence } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const kineticTextSchema = z.object({
  texts: z.array(z.string()).optional(),
  text: z.string().optional(),
  colors: z.array(zColor()).optional(),
  backgroundColor: zColor().optional(),
});

export const KineticText: React.FC<z.infer<typeof kineticTextSchema>> = ({
  texts,
  text,
  colors = ['#ffffff', '#fbbf24', '#34d399', '#60a5fa', '#f87171'],
  backgroundColor = 'black',
}) => {
  const { durationInFrames } = useVideoConfig();
  const actualTexts = texts || (text ? text.split(' ') : ['HELLO', 'WORLD']);

  // Calculate duration per word
  const durationPerText = Math.floor(durationInFrames / actualTexts.length);

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      {actualTexts.map((textItem, index) => {
        const from = index * durationPerText;
        const color = colors[index % colors.length];

        return (
          <Sequence key={index} from={from} durationInFrames={durationPerText} layout="none">
             <Word text={textItem} color={color} />
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
        fontFamily: 'Impact, "Noto Sans CJK SC", "WenQuanYi Zen Hei", sans-serif',
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
