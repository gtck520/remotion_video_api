import React from 'react';
import { AbsoluteFill, OffthreadVideo, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
import { SmartImage } from '../../components/SmartImage';

export const phoneMockupSchema = z.object({
  src: z.string(),
  type: z.enum(['video', 'image']),
  backgroundColor: zColor(),
  frameColor: zColor().optional(),
});

export const PhoneMockup: React.FC<z.infer<typeof phoneMockupSchema>> = ({
  src,
  type,
  backgroundColor,
  frameColor = '#1a1a1a',
}) => {
  const { height } = useVideoConfig();
  
  // Phone dimensions (roughly iPhone aspect ratio 9:19.5)
  const phoneWidth = height * 0.45; // Scale relative to screen height
  const phoneHeight = height * 0.85;
  const borderRadius = 40;
  const bezel = 15;

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      {/* Phone Body */}
      <div style={{
        width: phoneWidth,
        height: phoneHeight,
        backgroundColor: frameColor,
        borderRadius: borderRadius + bezel,
        padding: bezel,
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.4), 0 30px 60px -30px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Screen Content */}
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          borderRadius: borderRadius,
          overflow: 'hidden',
          position: 'relative',
        }}>
            {/* Fallback */}
            <AbsoluteFill style={{ backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ color: '#333' }}>Loading...</span>
            </AbsoluteFill>

            {type === 'video' ? (
                <OffthreadVideo 
                    src={src} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} 
                />
            ) : (
                <SmartImage 
                    src={src} 
                    style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} 
                />
            )}
        </div>

        {/* Notch / Dynamic Island */}
        <div style={{
            position: 'absolute',
            top: bezel + 10,
            width: '30%',
            height: 25,
            backgroundColor: 'black',
            borderRadius: 20,
            zIndex: 10,
        }} />
      </div>
    </AbsoluteFill>
  );
};
