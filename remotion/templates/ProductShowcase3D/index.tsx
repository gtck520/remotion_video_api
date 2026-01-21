import React, { useRef } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFrame } from '@react-three/fiber';
import { Box, Environment, ContactShadows, Float } from '@react-three/drei';
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const productShowcase3DSchema = z.object({
  productColor: zColor(),
  boxSize: z.number().min(1).max(5).default(2),
  rotationSpeed: z.number().min(0).max(5).default(1),
  environmentPreset: z.enum(['sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby']).default('city'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

const ProductBox: React.FC<{ color: string; size: number; speed: number }> = ({ color, size, speed }) => {
  const meshRef = useRef<any>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useFrame(() => {
    if (!meshRef.current) return;
    // Deterministic rotation based on frame
    meshRef.current.rotation.y = (frame / fps) * speed;
    meshRef.current.rotation.x = Math.sin((frame / fps) * speed * 0.5) * 0.2;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Box args={[size, size, size]} ref={meshRef}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </Box>
    </Float>
  );
};

export const ProductShowcase3D: React.FC<z.infer<typeof productShowcase3DSchema>> = ({
  productColor,
  boxSize,
  rotationSpeed,
  environmentPreset,
  title,
  subtitle,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        style={{ backgroundColor: '#111' }}
        camera={{ position: [0, 0, 10], fov: 50 }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        <ProductBox color={productColor} size={boxSize} speed={rotationSpeed} />
        
        {/* Use a valid preset or fallback to ambient light only if network fails */}
        {/* <Environment preset={environmentPreset as any} /> */}
        <ContactShadows position={[0, -3.5, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
      </ThreeCanvas>
      
      {/* Title Overlay */}
      {(title || subtitle) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{
                textAlign: 'center',
                zIndex: 10,
                marginTop: 200 // Push text down or up
            }}>
                {title && (
                    <h1 style={{
                        fontSize: 100,
                        color: 'white',
                        marginBottom: 20,
                        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                        fontFamily: 'sans-serif',
                        fontWeight: 900,
                        letterSpacing: -2
                    }}>
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <h2 style={{
                        fontSize: 40,
                        color: '#aaa',
                        fontWeight: 'normal',
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                        fontFamily: 'sans-serif',
                        letterSpacing: 1
                    }}>
                        {subtitle}
                    </h2>
                )}
            </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
