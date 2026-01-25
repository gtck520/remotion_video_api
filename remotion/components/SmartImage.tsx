import React, { useState } from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate, OffthreadVideo, Loop, Video } from 'remotion';

interface SmartImageProps {
  src: string;
  style?: React.CSSProperties;
  enableKenBurns?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  style,
  enableKenBurns = true 
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [error, setError] = useState(false);

  // Simple video detection by extension
  const isVideo = src && (src.toLowerCase().endsWith('.mp4') || src.toLowerCase().endsWith('.webm'));

  // Ken Burns Effect: 缓慢放大
  // 从 1.0 放大到 1.15，产生缓慢推镜头的效果
  const scale = enableKenBurns ? interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.15],
    { extrapolateRight: 'clamp' }
  ) : 1;

  // 也可以加一点点平移，增加动感
  const translateX = enableKenBurns ? interpolate(
    frame,
    [0, durationInFrames],
    [0, -2], // 轻微向左
    { extrapolateRight: 'clamp' }
  ) : 0;

  if (error) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2c3e50',
        color: '#ecf0f1',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
        <div style={{ fontSize: 16 }}>Image Unavailable</div>
      </div>
    );
  }

  if (isVideo) {
    return (
        <div style={{ ...style, overflow: 'hidden' }}>
            <Loop durationInFrames={durationInFrames}>
                <Video
                    src={src}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                    muted={true}
                    crossOrigin="anonymous"
                />
            </Loop>
        </div>
    );
  }

  return (
    <div style={{ ...style, overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}%)`,
          transformOrigin: 'center center',
        }}
        onError={() => {
          console.error(`SmartImage: Failed to load ${src}`);
          setError(true);
        }}
      />
    </div>
  );
};
