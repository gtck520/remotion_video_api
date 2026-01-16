import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img } from 'remotion';
import { z } from 'zod';
import { Subtitles } from '../../components/Subtitles';

export const captionedVideoSchema = z.object({
  src: z.string(),
  type: z.enum(['video', 'image']),
  audioUrl: z.string().optional(),
  subtitles: z.array(z.object({
    startFrame: z.number(),
    endFrame: z.number(),
    text: z.string()
  })),
  backgroundColor: z.string().optional(),
});

export const CaptionedVideo: React.FC<z.infer<typeof captionedVideoSchema>> = ({
  src,
  type,
  audioUrl,
  subtitles,
  backgroundColor = 'black',
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {type === 'video' ? (
        <OffthreadVideo src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      
      {audioUrl && <Audio src={audioUrl} />}
      
      <Subtitles subtitles={subtitles} />
    </AbsoluteFill>
  );
};
