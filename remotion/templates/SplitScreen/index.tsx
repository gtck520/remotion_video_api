import React from 'react';
import { AbsoluteFill, OffthreadVideo, Img } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const splitScreenSchema = z.object({
  layout: z.enum(['horizontal', 'vertical']),
  items: z.array(z.object({
    type: z.enum(['video', 'image']),
    src: z.string(),
    title: z.string().optional()
  })),
  dividerColor: zColor().optional(),
  dividerWidth: z.number().optional(),
});

export const SplitScreen: React.FC<z.infer<typeof splitScreenSchema>> = ({
  layout,
  items,
  dividerColor = 'white',
  dividerWidth = 10,
}) => {
  const isHorizontal = layout === 'horizontal';
  const flexDirection = isHorizontal ? 'row' : 'column';

  return (
    <AbsoluteFill style={{ flexDirection, backgroundColor: 'black' }}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#333' }}>
            {/* Debug Info */}
            {/* <div style={{position: 'absolute', top: 0, left: 0, zIndex: 9999, color: 'red'}}>Title: {item.title}</div> */}

            {/* Fallback/Background in case image fails */}
            <AbsoluteFill style={{ backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#444', fontSize: 40, fontWeight: 'bold' }}>{item.type.toUpperCase()}</span>
            </AbsoluteFill>

            {item.type === 'video' ? (
              <OffthreadVideo 
                src={item.src} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} 
              />
            ) : (
              <Img 
                src={item.src} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} 
                onError={(e) => console.error('Image load failed', item.src)}
              />
            )}
            
            {item.title && (
                <div style={{
                    position: 'absolute',
                    top: '50%', // Center vertically
                    left: '50%', // Center horizontally
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '20px 40px',
                    borderRadius: 15,
                    color: 'white',
                    fontSize: 40,
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                    zIndex: 20, // Ensure title is above image
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    border: '2px solid rgba(255,255,255,0.2)'
                }}>
                    {item.title}
                </div>
            )}
          </div>
          
          {/* Divider */}
          {index < items.length - 1 && (
            <div style={{
              width: isHorizontal ? dividerWidth : '100%',
              height: isHorizontal ? '100%' : dividerWidth,
              backgroundColor: dividerColor,
              zIndex: 10
            }} />
          )}
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};
