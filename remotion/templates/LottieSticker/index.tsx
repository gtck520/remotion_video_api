import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Lottie, LottieAnimationData } from '@remotion/lottie';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';
import { useEffect, useState } from 'react';

export const lottieStickerSchema = z.object({
  lottieUrl: z.string(), // URL to JSON file
  loop: z.boolean(),
  backgroundColor: zColor(),
});

export const LottieSticker: React.FC<z.infer<typeof lottieStickerSchema>> = ({
  lottieUrl,
  loop,
  backgroundColor,
}) => {
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(lottieUrl)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((e) => console.error('Failed to load lottie:', e));
  }, [lottieUrl]);

  if (!animationData) {
    return null;
  }

  return (
    <AbsoluteFill style={{ backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        style={{ width: 600, height: 600 }}
      />
    </AbsoluteFill>
  );
};
