import React from 'react';
import { AbsoluteFill, Series, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { IntroTitle } from '../IntroTitle';
import { KineticText } from '../KineticText';
import { Comparison } from '../Comparison';
import { KnowledgeCard } from '../KnowledgeCard';
import { TechCode } from '../TechCode';
import { LottieSticker } from '../LottieSticker';
import { LinearTransition, SlideTransition } from '@remotion/transitions';

// We define a recursive-like schema manually because Zod recursion is tricky
// A Scene is { type: string, duration: number, props: any, transition?: string }

import { Audiogram } from '../Audiogram';
import { WordStream } from '../WordStream';
import { SplitScreen } from '../SplitScreen';
import { CaptionedVideo } from '../CaptionedVideo';
import { PhoneMockup } from '../PhoneMockup';
import { QRCodeOverlay } from '../../components/QRCodeOverlay';
import { Subtitles } from '../../components/Subtitles';
import { DynamicBackground } from '../../components/DynamicBackground';

const sceneSchema = z.object({
  type: z.enum(['IntroTitle', 'KineticText', 'Comparison', 'KnowledgeCard', 'TechCode', 'LottieSticker', 'Audiogram', 'WordStream', 'SplitScreen', 'CaptionedVideo', 'PhoneMockup']),
  durationInFrames: z.number(),
  props: z.record(z.any()),
  transition: z.enum(['none', 'slide', 'fade']).optional(),
});

const subtitleItemSchema = z.object({
  startFrame: z.number(),
  endFrame: z.number(),
  text: z.string(),
});

export const masterSequenceSchema = z.object({
  scenes: z.array(sceneSchema),
  globalOverlay: z.object({
    qrCode: z.string().optional(),
    watermark: z.string().optional()
  }).optional(),
  subtitles: z.array(subtitleItemSchema).optional(),
});

export const MasterSequence: React.FC<z.infer<typeof masterSequenceSchema>> = ({
  scenes,
  globalOverlay,
  subtitles
}) => {
  const frame = useCurrentFrame();
  
  // Debug logging
  if (frame % 30 === 0) {
     console.log(`Frame ${frame}: Subtitles present?`, !!subtitles, subtitles?.length);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <DynamicBackground />
      <Series>
        {scenes.map((scene, index) => {
          let Component: any = null;
          
          switch (scene.type) {
            case 'IntroTitle': Component = IntroTitle; break;
            case 'KineticText': Component = KineticText; break;
            case 'Comparison': Component = Comparison; break;
            case 'KnowledgeCard': Component = KnowledgeCard; break;
            case 'TechCode': Component = TechCode; break;
            case 'LottieSticker': Component = LottieSticker; break;
            case 'Audiogram': Component = Audiogram; break;
            case 'WordStream': Component = WordStream; break;
            case 'SplitScreen': Component = SplitScreen; break;
            case 'CaptionedVideo': Component = CaptionedVideo; break;
            case 'PhoneMockup': Component = PhoneMockup; break;
          }

          if (!Component) {
              console.warn(`Scene type ${scene.type} not found!`);
              return (
                  <Series.Sequence key={index} durationInFrames={scene.durationInFrames}>
                      <AbsoluteFill style={{ backgroundColor: 'red', alignItems: 'center', justifyContent: 'center' }}>
                          <h1 style={{ color: 'white' }}>Missing Component: {scene.type}</h1>
                      </AbsoluteFill>
                  </Series.Sequence>
              );
          }

          console.log(`Rendering Scene ${index}: ${scene.type}`);

          return (
            <Series.Sequence 
              key={index} 
              durationInFrames={scene.durationInFrames}
              layout="none"
            >
              <Component {...scene.props} />
            </Series.Sequence>
          );
        })}
      </Series>
      
      {/* Global Overlays */}
      {globalOverlay?.qrCode && (
        <QRCodeOverlay text={globalOverlay.qrCode} />
      )}

      {/* Global Subtitles */}
      {subtitles && <Subtitles subtitles={subtitles} />}
    </AbsoluteFill>
  );
};
