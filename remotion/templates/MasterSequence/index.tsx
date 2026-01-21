import React from 'react';
import { AbsoluteFill, useCurrentFrame, Audio, useVideoConfig, Sequence, Loop } from 'remotion';
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
  // Allow flat props (direct properties) or nested props (scene.props)
  // This handles both { type: "SmartExplainer", title: "..." } and { type: "SmartExplainer", props: { title: "..." } }
  props: z.record(z.any()).optional(), 
  transition: z.enum(['none', 'slide', 'fade', 'wipe', 'flip']).optional(),
}).passthrough(); // Allow extra properties for flat structure

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
  subtitleSettings: z.object({
      variant: z.enum(['default', 'clean', 'neon', 'comic']).optional(),
      style: z.record(z.any()).optional(), // Custom container style
      textStyle: z.record(z.any()).optional() // Custom text style
  }).optional(),
  bgMusic: z.object({
      src: z.string().optional(),
      style: z.string().optional(), // Used for server-side selection
      volume: z.number().optional(), // Default 0.5
      loop: z.boolean().optional(), // Default true
      durationInFrames: z.number().optional() // Provided by server
  }).optional(),
});

export const MasterSequence: React.FC<z.infer<typeof masterSequenceSchema>> = ({
  scenes,
  globalOverlay,
  subtitles,
  subtitleSettings,
  bgMusic
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Debug logging
  if (frame % 30 === 0) {
     console.log(`Frame ${frame}: Subtitles present?`, !!subtitles, subtitles?.length);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <DynamicBackground />
      {bgMusic && bgMusic.src && (
          <Sequence from={0}>
             {(() => {
                 const volume = bgMusic.volume ?? 0.5;
                 const shouldLoop = bgMusic.loop ?? true;
                 
                 // If music is shorter than video and loop is true
                 if (shouldLoop && bgMusic.durationInFrames && bgMusic.durationInFrames < durationInFrames) {
                     return (
                         <Loop durationInFrames={bgMusic.durationInFrames}>
                             <Audio src={bgMusic.src} volume={volume} />
                         </Loop>
                     );
                 }
                 
                 // Default: Play once (will be truncated by Sequence/Video end automatically)
                 return <Audio src={bgMusic.src} volume={volume} />;
             })()}
          </Sequence>
      )}
      <TransitionSeries>
        {scenes.map((scene, index) => {
          let Component: any = null;
          const sceneType = scene.type || (scene as any).component;
          
          // Normalize props: Merge top-level properties (like text, imageQuery) with the props object
          // This allows fields like "text" to be passed at the scene root level and still be received by the component
          const { type, component, durationInFrames, transition, props, ...rest } = scene as any;
          const componentProps = { ...rest, ...(props || {}) };
          
          if (typeof durationInFrames !== 'number') {
            console.error(`[MasterSequence] Scene ${index} (${type}) is missing durationInFrames!`, scene);
          }

          switch (sceneType) {
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
              console.warn(`[MasterSequence] Scene ${index}: Type '${sceneType}' not found! Full scene object:`, JSON.stringify(scene));
              Component = () => (
                  <AbsoluteFill style={{ backgroundColor: 'red', alignItems: 'center', justifyContent: 'center' }}>
                      <h1 style={{ color: 'white' }}>Missing Component: {sceneType}</h1>
                      <p style={{ color: 'white' }}>Index: {index}</p>
                  </AbsoluteFill>
              );
          }

          const sequence = (
            <TransitionSeries.Sequence 
              key={index} 
              durationInFrames={durationInFrames}
            >
              <AbsoluteFill>
                  <Component {...componentProps} />
              </AbsoluteFill>
              
              {/* Voiceover Layer - Rendered in parallel AbsoluteFill to ensure it's not blocked */}
              {componentProps.audio && (
                  <AbsoluteFill>
                      <Audio 
                        src={componentProps.audio} 
                        volume={1.0}
                        onError={(e) => console.error(`[MasterSequence] Audio load failed for scene ${index}:`, e)}
                      />
                  </AbsoluteFill>
              )}
            </TransitionSeries.Sequence>
          );

          // Handle Transitions
          if (index < scenes.length - 1 && transition && transition !== 'none') {
             let presentation = null;
             switch (transition) {
                 case 'slide': presentation = slide(); break;
                 case 'fade': presentation = fade(); break;
                 case 'wipe': presentation = wipe(); break;
                 case 'flip': presentation = flip(); break;
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
             }
          }
          
          return sequence;
        })}
      </TransitionSeries>

      {/* Global Overlays */}
      {globalOverlay?.qrCode && <QRCodeOverlay url={globalOverlay.qrCode} />}
      {globalOverlay?.watermark && (
        <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'flex-start', padding: 40, pointerEvents: 'none' }}>
           <h2 style={{ color: 'rgba(255,255,255,0.5)', fontSize: 30, fontFamily: 'sans-serif' }}>{globalOverlay.watermark}</h2>
        </AbsoluteFill>
      )}

      {/* Subtitles Layer */}
      {subtitles && (
        <Subtitles 
            subtitles={subtitles} 
            variant={subtitleSettings?.variant}
            style={subtitleSettings?.style}
            textStyle={subtitleSettings?.textStyle}
        />
      )}
    </AbsoluteFill>
  );
};
