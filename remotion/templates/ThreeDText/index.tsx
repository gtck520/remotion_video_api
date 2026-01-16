import React, { useRef } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFrame } from '@react-three/fiber';
import { Text, Environment, Float, Center } from '@react-three/drei';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const threeDTextSchema = z.object({
  text: z.string(),
  color: zColor(),
  size: z.number().min(1).max(10).default(3),
  thickness: z.number().min(0.1).max(5).default(1),
});

const AnimatedText: React.FC<{ text: string; color: string; size: number }> = ({ text, color, size }) => {
  const meshRef = useRef<any>(null);
  const frame = useCurrentFrame();
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = Math.sin(frame * 0.05) * 0.3;
    meshRef.current.rotation.x = Math.cos(frame * 0.03) * 0.1;
  });

  return (
    <Float speed={3} rotationIntensity={0.5} floatIntensity={0.5}>
      <Center>
        <Text
          ref={meshRef}
          fontSize={size}
          color={color}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
          anchorX="center"
          anchorY="middle"
        >
          {text}
        </Text>
      </Center>
    </Float>
  );
};

export const ThreeDText: React.FC<z.infer<typeof threeDTextSchema>> = ({
  text,
  color,
  size,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        style={{ backgroundColor: '#000' }}
        camera={{ position: [0, 0, 10], fov: 60 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <AnimatedText text={text} color={color} size={size} />
        
        <Environment preset="city" />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
