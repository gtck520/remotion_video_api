
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3005';

async function testDarkBackground() {
  console.log('🎨 Testing Custom Background Color...');

  const payload = {
    compositionId: 'IntroTitle',
    inputProps: {
      title: 'Dark Mode Test',
      subtitle: 'Custom Background #1a1a1a',
      titleColor: '#ffffff',       // White text
      backgroundColor: '#1a1a1a',  // Dark background
    }
  };

  try {
    // 1. Submit
    const res = await fetch(`${BASE_URL}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const { jobId } = await res.json();
    console.log(`✅ Job Created: ${jobId}`);

    // 2. Poll
    while (true) {
      const statusRes = await fetch(`${BASE_URL}/renders/${jobId}`);
      const status = await statusRes.json();
      
      if (status.status === 'completed') {
        console.log(`🎉 Dark Mode Video: ${status.videoUrl}`);
        break;
      } else if (status.status === 'failed') {
        console.error('❌ Failed:', status.error);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

  } catch (e) {
    console.error('Error:', e);
  }
}

testDarkBackground();
