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
    fontFamily: '"Source Han Sans SC", "Source Han Serif SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Hiragino Sans GB", "Heiti SC", "Inter", "system-ui", "sans-serif"',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '15px 40px',
    borderRadius: 30,
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    lineHeight: 1.5,
  },
  clean: {
    fontSize: 42,
    fontFamily: '"Source Han Sans SC", "Source Han Serif SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Hiragino Sans GB", "Heiti SC", "Inter", "system-ui", "sans-serif"',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
    backgroundColor: 'transparent',
    padding: '10px',
    lineHeight: 1.5,
  },
  neon: {
    fontSize: 45,
    fontFamily: '"Source Han Sans SC", "Source Han Serif SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei", "Hiragino Sans GB", "Heiti SC", "Inter", "system-ui", "sans-serif"',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 30px #ff00de',
    backgroundColor: 'transparent',
    padding: '10px',
    lineHeight: 1.5,
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
    lineHeight: 1.5,
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
      pointerEvents: 'none', // Allow clicking through
      ...style
    }}>
      <div style={{
        display: 'inline-block',
        maxWidth: '100%',
        ...baseStyle,
        ...textStyle
      }}>
        {currentSubtitle.text}
      </div>
    </div>
  );
};
