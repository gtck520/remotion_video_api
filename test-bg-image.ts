
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3005';

async function testBackgroundImage() {
  console.log('🖼️ Testing Background Image...');

  const payload = {
    compositionId: 'IntroTitle',
    inputProps: {
      title: 'Background Image Test',
      subtitle: 'Overlay on Image',
      titleColor: '#ffffff',
      backgroundColor: '#000000',
      backgroundImage: 'https://picsum.photos/seed/bg/1920/1080', // Random HD background
    }
  };

  try {
    const res = await fetch(`${BASE_URL}/renders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const { jobId } = await res.json();
    console.log(`✅ Job Created: ${jobId}`);

    while (true) {
      const statusRes = await fetch(`${BASE_URL}/renders/${jobId}`);
      const status = await statusRes.json();
      
      if (status.status === 'completed') {
        console.log(`🎉 Video with BG Image: ${status.videoUrl}`);
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

testBackgroundImage();
