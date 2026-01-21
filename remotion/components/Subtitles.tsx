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
  variant?: 'default' | 'clean' | 'neon' | 'comic';
}

const VARIANTS: Record<string, React.CSSProperties> = {
  default: {
    fontSize: 40,
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '15px 40px',
    borderRadius: 30,
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  },
  clean: {
    fontSize: 42,
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
    backgroundColor: 'transparent',
    padding: '10px',
  },
  neon: {
    fontSize: 45,
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 30px #ff00de',
    backgroundColor: 'transparent',
    padding: '10px',
  },
  comic: {
    fontSize: 45,
    fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
    fontWeight: '900',
    color: '#FFD700',
    WebkitTextStroke: '2px black',
    textShadow: '3px 3px 0px #000',
    backgroundColor: 'transparent',
    padding: '10px',
  }
};

export const Subtitles: React.FC<SubtitlesProps> = ({ subtitles, style, textStyle, variant = 'default' }) => {
  const frame = useCurrentFrame();
  
  if (!subtitles || !Array.isArray(subtitles)) {
    return null;
  }

  const currentSubtitle = subtitles.find(s => frame >= s.startFrame && frame < s.endFrame);

  if (!currentSubtitle) return null;

  const baseStyle = VARIANTS[variant] || VARIANTS.default;

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
        ...baseStyle,
        ...textStyle
      }}>
        {currentSubtitle.text}
      </span>
    </div>
  );
};
