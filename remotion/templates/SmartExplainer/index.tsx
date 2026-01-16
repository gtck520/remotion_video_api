import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const smartExplainerSchema = z.object({
  layout: z.enum(['Title', 'BulletList', 'Quote', 'SplitImage', 'BigStat']),
  title: z.string(),
  subtitle: z.string().optional(),
  points: z.array(z.string()).optional(),
  image: z.string().optional(),
  accentColor: zColor().optional().default('#3b82f6'),
  theme: z.enum(['Light', 'Dark', 'Navy']).optional().default('Dark'),
});

const themes = {
  Light: { bg: '#ffffff', text: '#1e293b', secondary: '#64748b' },
  Dark: { bg: '#0f172a', text: '#f8fafc', secondary: '#94a3b8' },
  Navy: { bg: '#1e1b4b', text: '#e0e7ff', secondary: '#6366f1' },
};

export const SmartExplainer: React.FC<z.infer<typeof smartExplainerSchema>> = ({
  layout,
  title,
  subtitle,
  points,
  image,
  accentColor,
  theme = 'Dark',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = themes[theme];

  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  const opacity = interpolate(entranceSpring, [0, 1], [0, 1]);
  const translateY = interpolate(entranceSpring, [0, 1], [50, 0]);

  const containerStyle: React.CSSProperties = {
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: 60,
  };

  const renderContent = () => {
    switch (layout) {
      case 'Title':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: 120,
              fontWeight: 800,
              margin: 0,
              opacity,
              transform: `translateY(${translateY}px)`,
              background: `linear-gradient(135deg, ${colors.text}, ${accentColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {title}
            </h1>
            {subtitle && (
              <h2 style={{
                fontSize: 48,
                color: colors.secondary,
                marginTop: 40,
                fontWeight: 400,
                opacity: interpolate(frame, [15, 45], [0, 1]),
                transform: `translateY(${interpolate(spring({ frame: frame - 15, fps }), [0, 1], [30, 0])}px)`,
              }}>
                {subtitle}
              </h2>
            )}
          </div>
        );

      case 'BulletList':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1 style={{
              fontSize: 80,
              marginBottom: 60,
              borderBottom: `4px solid ${accentColor}`,
              paddingBottom: 20,
              opacity,
              transform: `translateY(${translateY}px)`,
            }}>
              {title}
            </h1>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40 }}>
              {points?.map((point, i) => {
                const delay = 30 + i * 20;
                const pSpring = spring({ frame: frame - delay, fps, config: { damping: 12 } });
                const pOpacity = interpolate(pSpring, [0, 1], [0, 1]);
                const pX = interpolate(pSpring, [0, 1], [50, 0]);
                
                return (
                  <div key={i} style={{
                    fontSize: 50,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: pOpacity,
                    transform: `translateX(${pX}px)`,
                  }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: accentColor,
                      marginRight: 30,
                    }} />
                    {point}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'Quote':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: 80,
            textAlign: 'center',
          }}>
             <div style={{
               fontSize: 180,
               color: accentColor,
               opacity: 0.2,
               fontFamily: 'serif',
               marginBottom: -80,
             }}>“</div>
             <p style={{
               fontSize: 70,
               fontStyle: 'italic',
               lineHeight: 1.4,
               opacity,
               transform: `scale(${interpolate(entranceSpring, [0, 1], [0.9, 1])})`,
             }}>
               {title}
             </p>
             {subtitle && (
               <div style={{
                 marginTop: 60,
                 fontSize: 40,
                 color: colors.secondary,
                 fontWeight: 600,
                 opacity: interpolate(frame, [20, 50], [0, 1]),
               }}>
                 — {subtitle}
               </div>
             )}
          </div>
        );

      case 'SplitImage':
        return (
          <div style={{ display: 'flex', height: '100%', gap: 60 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{
                fontSize: 80,
                marginBottom: 40,
                color: accentColor,
                opacity,
                transform: `translateX(${interpolate(entranceSpring, [0, 1], [-50, 0])}px)`,
              }}>
                {title}
              </h1>
              <p style={{
                fontSize: 40,
                lineHeight: 1.6,
                color: colors.secondary,
                opacity: interpolate(frame, [10, 40], [0, 1]),
              }}>
                {subtitle}
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {image ? (
                <img src={image} style={{
                  width: '100%',
                  borderRadius: 24,
                  boxShadow: `0 20px 50px -20px ${accentColor}40`,
                  opacity: interpolate(frame, [20, 50], [0, 1]),
                  transform: `scale(${interpolate(spring({ frame: frame - 20, fps }), [0, 1], [0.9, 1])})`,
                }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '60%',
                  backgroundColor: '#334155',
                  borderRadius: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: 30,
                  opacity: 0.5
                }}>
                  Image Placeholder
                </div>
              )}
            </div>
          </div>
        );
        
      case 'BigStat':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}>
            <h1 style={{
              fontSize: 250,
              fontWeight: 900,
              margin: 0,
              color: accentColor,
              lineHeight: 1,
              opacity,
              transform: `scale(${interpolate(entranceSpring, [0, 1], [0.5, 1])})`,
            }}>
              {title}
            </h1>
            <h2 style={{
              fontSize: 60,
              marginTop: 20,
              color: colors.secondary,
              opacity: interpolate(frame, [15, 45], [0, 1]),
            }}>
              {subtitle}
            </h2>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={containerStyle}>
      {renderContent()}
    </AbsoluteFill>
  );
};
