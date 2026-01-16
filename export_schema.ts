import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs';
import path from 'path';

// Import all schemas
import { masterSequenceSchema } from './remotion/templates/MasterSequence';
import { introTitleSchema } from './remotion/templates/IntroTitle';
import { kineticTextSchema } from './remotion/templates/KineticText';
import { comparisonSchema } from './remotion/templates/Comparison';
import { knowledgeCardSchema } from './remotion/templates/KnowledgeCard';
import { techCodeSchema } from './remotion/templates/TechCode';
import { lottieStickerSchema } from './remotion/templates/LottieSticker';
import { audiogramSchema } from './remotion/templates/Audiogram';
import { wordStreamSchema } from './remotion/templates/WordStream';
import { splitScreenSchema } from './remotion/templates/SplitScreen';
import { captionedVideoSchema } from './remotion/templates/CaptionedVideo';
import { phoneMockupSchema } from './remotion/templates/PhoneMockup';
import { dataVizSchema } from './remotion/templates/DataViz';
import { cyberIntroSchema } from './remotion/templates/CyberIntro';
import { physicsStackSchema } from './remotion/templates/PhysicsStack';
import { particleFlowSchema } from './remotion/templates/ParticleFlow';
import { productShowcase3DSchema } from './remotion/templates/ProductShowcase3D';
import { threeDTextSchema } from './remotion/templates/ThreeDText';
import { smartExplainerSchema } from './remotion/templates/SmartExplainer';

const schemas = {
    MasterSequence: masterSequenceSchema,
    Scenes: {
        IntroTitle: introTitleSchema,
        KineticText: kineticTextSchema,
        Comparison: comparisonSchema,
        KnowledgeCard: knowledgeCardSchema,
        TechCode: techCodeSchema,
        LottieSticker: lottieStickerSchema,
        Audiogram: audiogramSchema,
        WordStream: wordStreamSchema,
        SplitScreen: splitScreenSchema,
        CaptionedVideo: captionedVideoSchema,
        PhoneMockup: phoneMockupSchema,
        DataViz: dataVizSchema,
        CyberIntro: cyberIntroSchema,
        PhysicsStack: physicsStackSchema,
        ParticleFlow: particleFlowSchema,
        ProductShowcase3D: productShowcase3DSchema,
        ThreeDText: threeDTextSchema,
        SmartExplainer: smartExplainerSchema
    }
};

const jsonSchema = zodToJsonSchema(masterSequenceSchema, 'MasterSequenceInput');

const documentation = {
    description: "Full schema for generating videos using MasterSequence. Use 'compositionId': 'MasterSequence' and provide 'inputProps' matching this schema.",
    availableScenes: Object.keys(schemas.Scenes),
    schema: jsonSchema,
    examples: {
        PhysicsScene: {
            type: "PhysicsStack",
            durationInFrames: 300,
            props: {
                items: ["React", "Vue", "Angular", "Svelte", "Solid"],
                itemColors: ["#61dafb", "#42b883", "#dd1b16", "#ff3e00", "#2c4f7c"]
            }
        },
        ParticleScene: {
            type: "ParticleFlow",
            durationInFrames: 300,
            props: {
                primaryColor: "#00ffff",
                secondaryColor: "#ff00ff",
                speed: 2,
                particleCount: 300
            }
        },
        Product3DScene: {
            type: "ProductShowcase3D",
            durationInFrames: 300,
            props: {
                productColor: "#ffcc00",
                boxSize: 2.5,
                rotationSpeed: 1.5,
                environmentPreset: "studio"
            }
        },
        Text3DScene: {
            type: "ThreeDText",
            durationInFrames: 300,
            props: {
                text: "HELLO 3D",
                color: "#ff0055",
                size: 3,
                thickness: 1
            }
        }
    }
};

fs.writeFileSync(path.resolve('schema_export.json'), JSON.stringify(documentation, null, 2));
console.log('Schema exported to schema_export.json');
