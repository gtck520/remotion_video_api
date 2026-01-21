
import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:3006/renders';

const payload = {
  compositionId: "MasterSequence",
  token: "debug_magic_token",
  inputProps: {
    subtitleSettings: {
        variant: "clean"
    },
    scenes: [
      // Scene 1: CyberIntro (Hook) - High impact intro
      {
        type: "CyberIntro",
        title: "读书的意义",
        subtitle: "Why We Study?",
        text: "小时候我们常问，为什么要努力读书？",
        durationInFrames: 120 // 4s
      },
      // Scene 2: SmartExplainer (BulletList) - Logical breakdown
      {
        type: "SmartExplainer",
        layout: "BulletList",
        title: "读书带来的改变",
        points: ["改变命运", "增长见识", "报效祖国"],
        text: "读书不仅仅是为了考试，更是为了拥有选择的权利。",
        durationInFrames: 150 // 5s
      },
      // Scene 3: PhysicsStack (Visual Metaphor) - Accumulation
      {
        type: "PhysicsStack",
        items: ["书籍", "逻辑", "智慧", "视野", "未来"],
        text: "每一本书都是一级台阶，带你看到更远的风景。",
        durationInFrames: 150 // 5s
      },
      // Scene 4: CaptionedVideo (AI Image) - Emotional connection
      {
        type: "CaptionedVideo",
        aiImage: true,
        imageQuery: "A child looking at a starry sky full of mathematical formulas, cinematic lighting, hopeful atmosphere",
        text: "当你陷入迷茫时，书本会成为你最忠实的指路明灯。",
        durationInFrames: 150 // 5s
      },
      // Scene 5: ThreeDText (Conclusion) - Strong ending
      {
        type: "ThreeDText",
        text: "坚持",
        textStyle: { color: "#FFD700" }, // Gold color
        durationInFrames: 90 // 3s
      }
    ]
  }
};

async function generateVideo() {
  console.log("🚀 Sending request to generate Smart & Varied Video...");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Video generation started successfully!");
    console.log("Response:", data);
    console.log(`\n👉 Track progress at: http://localhost:3006/renders/${data.renderId || data.id}`);
  } catch (error) {
    console.error("❌ Error generating video:", error);
  }
}

generateVideo();
