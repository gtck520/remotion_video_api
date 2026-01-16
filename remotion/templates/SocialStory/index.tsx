import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const socialStorySchema = z.object({
  imageUrl: z.string(),
  title: z.string(),
  profileName: z.string(),
  profileImg: z.string(),
  accentColor: zColor(),
});

export const SocialStory: React.FC<z.infer<typeof socialStorySchema>> = ({
  imageUrl,
  title,
  profileName,
  profileImg,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Progress bar calculation
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Blurred Background */}
      <AbsoluteFill>
        <Img 
          src={imageUrl} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            filter: 'blur(20px) brightness(0.7)',
            transform: 'scale(1.1)' 
          }} 
        />
      </AbsoluteFill>

      {/* Main Content Area (9:16 aspect ratio centered) */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 540, // 9:16 ratio relative to 1080 height approx
          height: 960,
          backgroundColor: 'white',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Header */}
          <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
            <Img 
              src={profileImg} 
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accentColor}` }} 
            />
            <span style={{ fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 18 }}>{profileName}</span>
          </div>

          {/* Progress Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.1)' }}>
             <div style={{ width: `${progress}%`, height: '100%', backgroundColor: accentColor }} />
          </div>

          {/* Main Image */}
          <div style={{ flex: 1, position: 'relative' }}>
             <Img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             
             {/* Overlay Text */}
             <div style={{
               position: 'absolute',
               bottom: 40,
               left: 20,
               right: 20,
               backgroundColor: 'rgba(255,255,255,0.9)',
               padding: 20,
               borderRadius: 12,
               boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
             }}>
                <h2 style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 24, color: '#333' }}>{title}</h2>
             </div>
          </div>
          
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
