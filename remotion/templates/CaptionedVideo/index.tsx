import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Img, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { z } from 'zod';
import { Subtitles } from '../../components/Subtitles';

export const captionedVideoSchema = z.object({
  src: z.string().optional(), // Made optional to support imageUrl alias
  imageUrl: z.string().optional(), // Alias for src
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
  // Animation props
  imageAnimation: z.enum(['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'static']).optional().default('zoom-in'),
  textAnimation: z.enum(['slide-up', 'fade-in', 'scale-up', 'pop-in']).optional().default('slide-up'),
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
  imageAnimation = 'zoom-in',
  textAnimation = 'slide-up',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Fix: props is not defined, use destructured src directly.
  // We expect src to be populated by the caller (mcp.ts).
  const safeSrc = src || ''; 
  const actualType = mediaType || type || (safeSrc.endsWith('.mp4') ? 'video' : 'image');

  // --- Image Animation Logic ---
  let imageTransform = {};
  
  if (actualType === 'image') {
      const duration = durationInFrames || 150;
      
      switch (imageAnimation) {
          case 'zoom-in':
              imageTransform = { transform: `scale(${interpolate(frame, [0, duration], [1, 1.15])})` };
              break;
          case 'zoom-out':
              imageTransform = { transform: `scale(${interpolate(frame, [0, duration], [1.15, 1])})` };
              break;
          case 'pan-left':
              imageTransform = { 
                  transform: `scale(1.1) translateX(${interpolate(frame, [0, duration], [0, -5])}%)` 
              };
              break;
          case 'pan-right':
              imageTransform = { 
                  transform: `scale(1.1) translateX(${interpolate(frame, [0, duration], [0, 5])}%)` 
              };
              break;
          case 'static':
          default:
              imageTransform = {};
              break;
      }
  }

  // Fade in for media (always applied for smoothness)
  const mediaOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // --- Text Animation Logic ---
  const titleEntrance = spring({
    frame: frame - 5, // Slight delay
    fps,
    config: { damping: 15, stiffness: 100 }
  });
  
  let titleStyleAnim = { opacity: 1, transform: 'none' };

  switch (textAnimation) {
      case 'slide-up':
          titleStyleAnim = {
              opacity: interpolate(titleEntrance, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleEntrance, [0, 1], [50, 0])}px)`
          };
          break;
      case 'fade-in':
          titleStyleAnim = {
              opacity: interpolate(frame, [5, 25], [0, 1]),
              transform: 'none'
          };
          break;
      case 'scale-up':
          titleStyleAnim = {
              opacity: interpolate(titleEntrance, [0, 1], [0, 1]),
              transform: `scale(${interpolate(titleEntrance, [0, 1], [0.8, 1])})`
          };
          break;
      case 'pop-in':
           titleStyleAnim = {
              opacity: 1,
              transform: `scale(${interpolate(spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 200 } }), [0, 1], [0, 1])})`
          };
          break;
  }

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: 'hidden' }}>
      {actualType === 'video' && safeSrc ? (
        <OffthreadVideo 
          src={safeSrc} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: mediaOpacity }} 
          shouldLoop={loop}
        />
      ) : safeSrc ? (
        <Img 
            src={safeSrc} 
            style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                opacity: mediaOpacity,
                ...imageTransform
            }} 
        />
      ) : null}
      
      {title && (
         <div style={{
            position: 'absolute',
            top: '35%', // Slightly lower to account for movement
            left: 0,
            width: '100%',
            textAlign: 'center',
            zIndex: 10,
            ...titleStyle,
            ...titleStyleAnim
         }}>
            <h1 style={{ 
               fontSize: 80, 
               color: 'white', 
               textShadow: '0 4px 20px rgba(0,0,0,0.8)',
               fontFamily: '"Source Han Sans SC", "Source Han Serif SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Hiragino Sans GB", "Heiti SC", "Inter", "system-ui", "sans-serif"',
               margin: 0,
               padding: '0 40px'
            }}>{title}</h1>
         </div>
      )}

      {audioUrl && <Audio src={audioUrl} />}
      
      {subtitles && <Subtitles subtitles={subtitles} />}
    </AbsoluteFill>
  );
};
