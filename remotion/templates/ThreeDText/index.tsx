import React, { useRef } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, staticFile } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFrame } from '@react-three/fiber';
import { Text, Center, Float, Stars } from '@react-three/drei';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const threeDTextSchema = z.object({ text: z.string(),
  color: zColor().optional(),
  textStyle: z.object({
      color: z.string().optional()
  }).optional(),
  size: z.number().min(1).max(10).default(3),
  thickness: z.number().min(0.1).max(5).default(1),
});

const AnimatedText: React.FC<{ text: string; color: string; size: number; thickness: number }> = ({ text, color, size, thickness }) => {
  const meshRef = useRef<any>(null);
  const frame = useCurrentFrame();
  
  useFrame(() => {
    if (!meshRef.current) return;
    // Rotate slightly
    meshRef.current.rotation.y = Math.sin(frame * 0.05) * 0.5;
    meshRef.current.rotation.x = Math.cos(frame * 0.03) * 0.2;
  });

  return (
    <Float speed={4} rotationIntensity={0.5} floatIntensity={0.5}>
      <Center>
        <Text
          ref={meshRef}
          font={staticFile("fonts/SourceHanSansSC-Bold.otf")}
          fontSize={size}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
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
  textStyle,
  size,
  thickness,
}) => {
  const { width, height } = useVideoConfig();
  
  // Resolve color from direct prop or textStyle or default
  const resolvedColor = color || textStyle?.color || "#ffffff";

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        style={{ backgroundColor: '#111' }}
        camera={{ position: [0, 0, 15], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={1} color="#ff0055" />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} color="#00ff55" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <AnimatedText text={text} color={resolvedColor} size={size} thickness={thickness} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
