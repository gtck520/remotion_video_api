import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const podcastAudioSchema = z.object({
  audioUrl: z.string(),
  coverImg: z.string(),
  title: z.string(),
  artist: z.string(),
  backgroundColor: zColor(),
  barColor: zColor(),
});

export const PodcastAudio: React.FC<z.infer<typeof podcastAudioSchema>> = ({
  audioUrl,
  coverImg,
  title,
  artist,
  backgroundColor,
  barColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(audioUrl);

  if (!audioData) {
    return null;
  }

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 64, // Number of bars
  });

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <Audio src={audioUrl} />
      
      {/* Cover Art */}
      <div style={{
        width: 400,
        height: 400,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        marginBottom: 60,
        position: 'relative'
      }}>
        <img src={coverImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
      </div>

      {/* Text Info */}
      <h1 style={{ color: 'white', fontFamily: 'sans-serif', fontSize: 48, marginBottom: 16 }}>{title}</h1>
      <h2 style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', fontSize: 32, marginBottom: 60 }}>{artist}</h2>

      {/* Visualizer */}
      <div style={{ display: 'flex', alignItems: 'center', height: 100, gap: 4 }}>
        {visualization.map((v, i) => {
          return (
            <div
              key={i}
              style={{
                width: 10,
                height: 100 * v,
                backgroundColor: barColor,
                borderRadius: 5,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
