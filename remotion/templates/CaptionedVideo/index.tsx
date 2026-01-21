import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img } from 'remotion';
import { z } from 'zod';
import { Subtitles } from '../../components/Subtitles';

export const captionedVideoSchema = z.object({
  src: z.string(),
  mediaType: z.enum(['video', 'image']).optional(), // Renamed from type
  type: z.enum(['video', 'image']).optional(), // Keep for backward compatibility
  audioUrl: z.string().optional(),
  subtitles: z.array(z.object({
    startFrame: z.number(),
    endFrame: z.number(),
    text: z.string()
  })).optional(), // Make optional
  loop: z.boolean().optional(),
  title: z.string().optional(),
  titleStyle: z.any().optional(),
  backgroundColor: z.string().optional(),
});

export const CaptionedVideo: React.FC<z.infer<typeof captionedVideoSchema>> = ({
  src,
  mediaType,
  type,
  audioUrl,
  subtitles,
  loop = true,
  title,
  titleStyle,
  backgroundColor = 'black',
}) => {
  const safeSrc = src || '';
  const actualType = mediaType || type || (safeSrc.endsWith('.mp4') ? 'video' : 'image');

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {actualType === 'video' && safeSrc ? (
        <OffthreadVideo 
          src={safeSrc} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          shouldLoop={loop}
        />
      ) : safeSrc ? (
        <Img src={safeSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      
      {title && (
         <div style={{
            position: 'absolute',
            top: '30%',
            left: 0,
            width: '100%',
            textAlign: 'center',
            zIndex: 10,
            ...titleStyle
         }}>
            <h1 style={{ 
               fontSize: 80, 
               color: 'white', 
               textShadow: '0 4px 10px rgba(0,0,0,0.8)',
               fontFamily: 'sans-serif' 
            }}>{title}</h1>
         </div>
      )}

      {audioUrl && <Audio src={audioUrl} />}
      
      {subtitles && <Subtitles subtitles={subtitles} />}
    </AbsoluteFill>
  );
};
