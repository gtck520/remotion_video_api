
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3005';

// Define the Master Sequence Scenes
// This combines all previous concepts + new TechCode/Lottie + transitions
const scenes = [
  {
    type: 'IntroTitle',
    durationInFrames: 120,
    props: {
      title: 'n8n 自动化',
      subtitle: 'The Workflow Automation Tool',
      titleColor: '#ffffff',
      backgroundColor: '#ea4b71',
    }
  },
  {
    type: 'KineticText',
    durationInFrames: 90,
    props: {
      texts: ['OPEN SOURCE', 'POWERFUL', 'EXTENSIBLE'],
      colors: ['#ea4b71', '#333333', '#ea4b71'],
      backgroundColor: '#ffffff'
    }
  },
  {
    type: 'TechCode',
    durationInFrames: 150,
    props: {
      code: `// n8n Workflow Example
import { n8n } from 'n8n-core';

export async function run() {
  const data = await fetch('https://api.stripe.com');
  return process(data);
}`,
      language: 'typescript',
      theme: 'dark',
      backgroundColor: '#282a36'
    }
  },
  {
    type: 'Comparison',
    durationInFrames: 150,
    props: {
      leftTitle: 'Manual Work',
      leftColor: '#95a5a6',
      leftPoints: ['Slow', 'Boring', 'Error-prone'],
      rightTitle: 'n8n Workflows',
      rightColor: '#ea4b71',
      rightPoints: ['Fast', 'Fun', 'Reliable'],
      backgroundColor: '#f0f0f0'
    }
  },
  {
    type: 'LottieSticker',
    durationInFrames: 120,
    props: {
      lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_g48j9z.json', // Rocket animation
      loop: true,
      backgroundColor: '#ffffff'
    }
  },
  {
    type: 'IntroTitle',
    durationInFrames: 120,
    props: {
      title: 'Start Now',
      subtitle: 'n8n.io',
      titleColor: '#ffffff',
      backgroundColor: '#333333',
    }
  }
];

async function generateMasterVideo() {
  console.log('🎬 Starting Master Sequence Generation (One-Shot Render)...');

  try {
    const res = await fetch(`${BASE_URL}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        compositionId: 'MasterSequence', 
        inputProps: { scenes } 
      })
    });
    
    const data = await res.json();
    
    if (data.jobId) {
      console.log(`✅ Job Created: ${data.jobId}`);
      await pollJob(data.jobId);
    } else {
      console.error('❌ Failed to create job:', data);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

async function pollJob(jobId) {
  console.log('⏳ Polling status...');
  while (true) {
    try {
      const res = await fetch(`${BASE_URL}/renders/${jobId}`);
      const data = await res.json();
      
      if (data.status === 'completed') {
        console.log('\n=============================================');
        console.log('✨ Master Video Ready!');
        console.log('📺 Watch here:', data.videoUrl);
        console.log('=============================================');
        break;
      } else if (data.status === 'failed') {
        console.error('❌ Render Failed:', data);
        break;
      }
      
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error('Polling error:', e);
      break;
    }
  }
}

generateMasterVideo();
