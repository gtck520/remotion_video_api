import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { z } from 'zod';
import { GlitchText } from '../../components/Effects/GlitchText';

export const cyberIntroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
});

const Scanline: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  
  const y = interpolate(frame % 120, [0, 120], [0, height]);
  
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        width: '100%',
        height: '2px',
        backgroundColor: 'rgba(0, 255, 255, 0.5)',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
        zIndex: 10,
      }}
    />
  );
};

const GridBackground: React.FC = () => {
    const frame = useCurrentFrame();
    // const { width, height } = useVideoConfig();
    const offset = (frame * 2) % 50;

    return (
        <AbsoluteFill style={{ zIndex: 0, overflow: 'hidden', perspective: 1000 }}>
             <div style={{
                 position: 'absolute',
                 width: '200%',
                 height: '200%',
                 left: '-50%',
                 top: '-50%',
                 backgroundImage: `
                    linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                 `,
                 backgroundSize: '50px 50px',
                 transform: `rotateX(60deg) translateY(${offset}px)`,
                 transformOrigin: 'center center',
             }} />
             <div style={{
                 position: 'absolute',
                 bottom: 0,
                 left: 0,
                 width: '100%',
                 height: '50%',
                 background: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
             }} />
        </AbsoluteFill>
    )
}

export const CyberIntro: React.FC<z.infer<typeof cyberIntroSchema>> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleProgress = spring({
      frame,
      fps,
      config: { stiffness: 50 }
  });

  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', color: 'white', overflow: 'hidden' }}>
      <GridBackground />
      <Scanline />
      
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
        <div style={{ transform: `scale(${titleProgress})` }}>
            <GlitchText 
                text={title} 
                fontSize={120} 
                color="#00ffff" 
                style={{ 
                    textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
                    letterSpacing: '10px'
                }} 
            />
        </div>
        
        <div style={{ marginTop: 40, opacity: subtitleOpacity }}>
             <GlitchText 
                text={subtitle} 
                fontSize={40} 
                color="#ff00ff" 
                style={{ 
                    fontFamily: 'sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '5px'
                }} 
            />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
