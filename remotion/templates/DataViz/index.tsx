import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const dataVizSchema = z.object({
  title: z.string(),
  data: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: zColor()
  })),
  backgroundColor: zColor().optional(),
  textColor: zColor().optional(),
});

export const DataViz: React.FC<z.infer<typeof dataVizSchema>> = ({
  title,
  data,
  backgroundColor = 'transparent',
  textColor = 'white',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1]);
  const titleTranslateY = interpolate(spring({ frame, fps }), [0, 1], [-50, 0]);

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <AbsoluteFill style={{ backgroundColor, padding: 60, alignItems: 'center', justifyContent: 'center' }}>
      <h1
        style={{
          fontFamily: "sans-serif",
          fontSize: 80,
          color: textColor,
          marginBottom: 100,
          opacity: titleOpacity,
          transform: `translateY(${titleTranslateY}px)`,
          position: 'absolute',
          top: 60
        }}
      >
        {title}
      </h1>

      <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'flex-end', 
          justifyContent: 'center', 
          gap: 40,
          height: '60%',
          width: '80%'
      }}>
          {data.map((item, index) => {
              const delay = index * 10 + 20;
              const progress = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 15 }
              });

              const barHeight = (item.value / maxValue) * 100;

              return (
                  <div key={index} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      width: 150,
                      height: '100%',
                      justifyContent: 'flex-end'
                  }}>
                      <div style={{
                          fontSize: 40,
                          color: textColor,
                          marginBottom: 10,
                          opacity: progress
                      }}>
                          {Math.round(interpolate(progress, [0, 1], [0, item.value]))}
                      </div>
                      <div style={{
                          width: '100%',
                          height: `${barHeight}%`,
                          backgroundColor: item.color,
                          borderRadius: '20px 20px 0 0',
                          transformOrigin: 'bottom center',
                          transform: `scaleY(${progress})`
                      }} />
                      <div style={{
                          marginTop: 20,
                          fontSize: 30,
                          color: textColor,
                          fontWeight: 'bold',
                          textAlign: 'center'
                      }}>
                          {item.label}
                      </div>
                  </div>
              );
          })}
      </div>
    </AbsoluteFill>
  );
};
