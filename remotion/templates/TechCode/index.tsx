import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const techCodeSchema = z.object({
  code: z.string(),
  language: z.string(),
  theme: z.enum(['dark', 'light']),
  backgroundColor: zColor(),
});

export const TechCode: React.FC<z.infer<typeof techCodeSchema>> = ({
  code,
  language,
  theme,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  // const { fps } = useVideoConfig();

  // Typing effect logic
  const charsPerFrame = 2;
  const currentLength = Math.min(code.length, Math.floor(frame * charsPerFrame));
  const displayedCode = code.substring(0, currentLength);
  const showCursor = Math.floor(frame / 15) % 2 === 0;

  const textColor = theme === 'dark' ? '#f8f8f2' : '#282a36';
  const bgColor = theme === 'dark' ? '#282a36' : '#f8f8f2';
  const keywordColor = theme === 'dark' ? '#ff79c6' : '#d73a49';
  const stringColor = theme === 'dark' ? '#f1fa8c' : '#032f62';

  // Simple syntax highlighting (naive)
  const highlightedCode = useMemo(() => {
    return displayedCode.split(/(\s+)/).map((word, i) => {
      let style = { color: textColor };
      if (['const', 'let', 'var', 'function', 'return', 'import', 'from', 'async', 'await'].includes(word)) {
        style.color = keywordColor;
      } else if (word.startsWith("'") || word.startsWith('"')) {
        style.color = stringColor;
      }
      return <span key={i} style={style}>{word}</span>;
    });
  }, [displayedCode, textColor, keywordColor, stringColor]);

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: '80%',
        height: '70%',
        backgroundColor: bgColor,
        borderRadius: 12,
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Window Controls */}
        <div style={{
          height: 40,
          backgroundColor: 'rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27c93f' }} />
          <span style={{ marginLeft: 16, fontFamily: 'monospace', fontSize: 14, color: 'rgba(128,128,128,0.8)' }}>
            {language ? `${language}.ts` : 'script.ts'}
          </span>
        </div>

        {/* Code Area */}
        <div style={{
          flex: 1,
          padding: 24,
          fontFamily: 'Fira Code, monospace',
          fontSize: 24,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden'
        }}>
          {highlightedCode}
          {showCursor && <span style={{ borderRight: `2px solid ${textColor}` }} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};
