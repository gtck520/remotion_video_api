import React from 'react';
import { useCurrentFrame } from 'remotion';

export interface SubtitleItem {
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface SubtitlesProps {
  subtitles: SubtitleItem[];
  style?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ subtitles, style, textStyle }) => {
  const frame = useCurrentFrame();
  const currentSubtitle = subtitles.find(s => frame >= s.startFrame && frame < s.endFrame);

  if (!currentSubtitle) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 50,
      left: 0,
      width: '100%',
      textAlign: 'center',
      padding: '0 40px',
      zIndex: 1000, // Ensure subtitles are always on top
      ...style
    }}>
      <span style={{
        fontSize: 40, // Slightly smaller for better readability of long text
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: 'white',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        backgroundColor: 'rgba(0,0,0,0.6)', // Darker background
        padding: '15px 40px',
        borderRadius: 30,
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        ...textStyle
      }}>
        {currentSubtitle.text}
      </span>
    </div>
  );
};
