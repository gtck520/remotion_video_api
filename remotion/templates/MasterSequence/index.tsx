import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { IntroTitle } from '../IntroTitle';
import { KineticText } from '../KineticText';
import { Comparison } from '../Comparison';
import { KnowledgeCard } from '../KnowledgeCard';
import { TechCode } from '../TechCode';
import { LottieSticker } from '../LottieSticker';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';

// We define a recursive-like schema manually because Zod recursion is tricky
// A Scene is { type: string, duration: number, props: any, transition?: string }

import { Audiogram } from '../Audiogram';
import { WordStream } from '../WordStream';
import { SplitScreen } from '../SplitScreen';
import { CaptionedVideo } from '../CaptionedVideo';
import { PhoneMockup } from '../PhoneMockup';
import { DataViz } from '../DataViz';
import { CyberIntro } from '../CyberIntro';
import { PhysicsStack } from '../PhysicsStack';
import { ParticleFlow } from '../ParticleFlow';
import { ProductShowcase3D } from '../ProductShowcase3D';
import { ThreeDText } from '../ThreeDText';
import { SmartExplainer } from '../SmartExplainer';
import { QRCodeOverlay } from '../../components/QRCodeOverlay';
import { Subtitles } from '../../components/Subtitles';
import { DynamicBackground } from '../../components/DynamicBackground';

const sceneSchema = z.object({
  type: z.enum(['IntroTitle', 'KineticText', 'Comparison', 'KnowledgeCard', 'TechCode', 'LottieSticker', 'Audiogram', 'WordStream', 'SplitScreen', 'CaptionedVideo', 'PhoneMockup', 'DataViz', 'CyberIntro', 'PhysicsStack', 'ParticleFlow', 'ProductShowcase3D', 'ThreeDText', 'SmartExplainer']),
  durationInFrames: z.number(),
  props: z.record(z.any()),
  transition: z.enum(['none', 'slide', 'fade', 'wipe', 'flip']).optional(),
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
      <TransitionSeries>
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
            case 'DataViz': Component = DataViz; break;
            case 'CyberIntro': Component = CyberIntro; break;
            case 'PhysicsStack': Component = PhysicsStack; break;
            case 'ParticleFlow': Component = ParticleFlow; break;
            case 'ProductShowcase3D': Component = ProductShowcase3D; break;
            case 'ThreeDText': Component = ThreeDText; break;
            case 'SmartExplainer': Component = SmartExplainer; break;
          }

          if (!Component) {
              console.warn(`Scene type ${scene.type} not found!`);
              Component = () => (
                  <AbsoluteFill style={{ backgroundColor: 'red', alignItems: 'center', justifyContent: 'center' }}>
                      <h1 style={{ color: 'white' }}>Missing Component: {scene.type}</h1>
                  </AbsoluteFill>
              );
          }

          console.log(`Rendering Scene ${index}: ${scene.type}`);

          const sequence = (
            <TransitionSeries.Sequence 
              key={index} 
              durationInFrames={scene.durationInFrames}
            >
              <Component {...scene.props} />
            </TransitionSeries.Sequence>
          );

          if (index === scenes.length - 1) {
             return sequence;
          }

          // Determine transition
          let presentation = null;
          switch (scene.transition) {
              case 'slide': presentation = slide(); break;
              case 'fade': presentation = fade(); break;
              case 'wipe': presentation = wipe(); break;
              case 'flip': presentation = flip(); break;
              default: presentation = null; // Hard cut
          }

          if (presentation) {
              return (
                  <React.Fragment key={index}>
                      {sequence}
                      <TransitionSeries.Transition
                          presentation={presentation as any}
                          timing={linearTiming({ durationInFrames: 30 })}
                      />
                  </React.Fragment>
              );
          } else {
              return sequence;
          }
        })}
      </TransitionSeries>
      
      {/* Global Overlays */}
      {globalOverlay?.qrCode && (
        <QRCodeOverlay text={globalOverlay.qrCode} />
      )}

      {/* Global Subtitles */}
      {subtitles && <Subtitles subtitles={subtitles} />}
    </AbsoluteFill>
  );
};
