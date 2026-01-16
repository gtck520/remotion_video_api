import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Audio, interpolate, spring } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const wordStreamSchema = z.object({
  words: z.array(z.object({
    word: z.string(),
    startFrame: z.number(),
    duration: z.number()
  })),
  audioUrl: z.string().optional(),
  fontFamily: z.string().optional(),
  highlightColor: zColor(),
  textColor: zColor(),
});

export const WordStream: React.FC<z.infer<typeof wordStreamSchema>> = ({
  words,
  audioUrl,
  fontFamily = 'Impact, sans-serif',
  highlightColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find current active word
  const activeWordIndex = words.findIndex(w => frame >= w.startFrame && frame < w.startFrame + w.duration);
  const activeWord = words[activeWordIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {audioUrl && <Audio src={audioUrl} />}
      
      <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {activeWord && (
          <h1
            style={{
              fontFamily,
              fontSize: 120,
              color: highlightColor,
              textTransform: 'uppercase',
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
              transform: `scale(${spring({
                frame: frame - activeWord.startFrame,
                fps,
                config: { stiffness: 200, damping: 10 }
              })}) rotate(${interpolate(frame - activeWord.startFrame, [0, 5], [-5, 5])}deg)`,
            }}
          >
            {activeWord.word}
          </h1>
        )}
      </div>
      
      {/* Context: Show upcoming words slightly faded */}
      <div style={{ position: 'absolute', bottom: 100, display: 'flex', gap: 20, opacity: 0.5 }}>
         {words.slice(activeWordIndex + 1, activeWordIndex + 4).map((w, i) => (
             <span key={i} style={{ fontFamily, fontSize: 40, color: textColor }}>{w.word}</span>
         ))}
      </div>
    </AbsoluteFill>
  );
};
