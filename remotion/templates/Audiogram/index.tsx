import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, Audio } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
import { SmartImage } from '../../components/SmartImage';

export const audiogramSchema = z.object({
  audioUrl: z.string(),
  coverImg: z.string(),
  title: z.string(),
  waveColor: zColor(),
  backgroundColor: zColor(),
});

export const Audiogram: React.FC<z.infer<typeof audiogramSchema>> = ({
  audioUrl,
  coverImg,
  title,
  waveColor,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  
  // NOTE: For demo stability, we use simulated data. 
  // In production with valid CORS audio, uncomment the next line:
  // const audioData = useAudioData(audioUrl);
  const audioData = null;

  // Generate visualization data with fallback
  const visualization = useMemo(() => {
    if (!audioData) {
        // Fallback simulation: random value smoothed with some beat logic
        return (Math.sin(frame * 0.2) * 0.5 + 0.5) * (0.5 + Math.random() * 0.5); 
    }
    return 0; // Placeholder for when audioData is enabled
  }, [frame, audioData]);

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <Audio src={audioUrl} />
      
      {/* Cover Art with pulse effect */}
      <div style={{ 
          width: 400, 
          height: 400, 
          borderRadius: 20, 
          overflow: 'hidden',
          boxShadow: `0 10px 30px ${waveColor}40`,
          transform: `scale(${1 + visualization * 0.05})`, // Pulse to beat
          marginBottom: 60
      }}>
          <SmartImage src={coverImg} style={{ width: '100%', height: '100%' }} />
      </div>

      <h1 style={{ fontFamily: 'sans-serif', fontSize: 50, color: 'white', marginBottom: 60 }}>{title}</h1>

      {/* Waveform Visualization */}
      <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 6,
          height: 200,
          width: '80%'
      }}>
          {Array.from({ length: 64 }).map((_, i) => {
              // Get amplitude for this frequency band
              // Note: visualizeAudio returns single float usually, we need to implement frequency bands manually or simulate
              // For simplicity in this demo, we simulate bands using the single volume + random variation that is consistent per frame
              
              // Correct approach for real frequency data: useAudioData returns frequency data if configured? 
              // Actually useAudioData returns { visualisation: number[] } if configured or just volume.
              // Let's use a simpler randomized wave that reacts to volume for now as useAudioData default gives overall amplitude.
              
              const volume = visualization; // 0 to 1
              
              // Create a consistent "shape" for the wave
              const shape = Math.sin(i * 0.2) * 0.5 + 0.5;
              
              const barHeight = 20 + volume * 150 * shape * (1 + Math.random() * 0.2);
              
              return (
                  <div
                      key={i}
                      style={{
                          width: 8,
                          height: barHeight,
                          backgroundColor: waveColor,
                          borderRadius: 4,
                          opacity: 0.8
                      }}
                  />
              );
          })}
      </div>
    </AbsoluteFill>
  );
};
