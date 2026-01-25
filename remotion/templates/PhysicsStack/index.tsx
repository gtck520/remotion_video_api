import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, OffthreadVideo, Loop } from 'remotion';
import { z } from 'zod';
import Matter from 'matter-js';

export const physicsStackSchema = z.object({
  items: z.array(z.string()), // Text content for items
  itemColors: z.array(z.string()).optional(),
  backgroundColor: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  src: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
});

export const PhysicsStack: React.FC<z.infer<typeof physicsStackSchema>> = ({
  items,
  itemColors = ['#e74c3c', '#3498db', '#9b59b6', '#2ecc71', '#f1c40f'],
  backgroundColor = '#111',
  title,
  subtitle,
  src,
  mediaType,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();

  // Deterministic simulation per frame
  // This ensures that for a given frame, the output is always the same
  // and doesn't rely on React state updates or useEffect timing.
  const bodies = useMemo(() => {
    const engine = Matter.Engine.create();
    
    // Boundaries
    const ground = Matter.Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true });

    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // Add items
    items.forEach((item, index) => {
        // Deterministic random position based on index
        // Using Math.sin/cos to generate "random" but consistent values
        const seed = index * 12345;
        const randX = (Math.sin(seed) + 1) / 2; // 0..1
        
        const x = width / 2 + (randX - 0.5) * 300;
        const y = -200 - (index * 250); // Start well above screen to fall in sequence
        
        const color = itemColors[index % itemColors.length];
        
        const body = Matter.Bodies.rectangle(x, y, 400, 100, {
            restitution: 0.6,
            friction: 0.1,
            label: item,
            angle: (Math.cos(seed) * 0.2), // Slight random initial rotation
        });
        // Store color in plugin data or custom property
        (body as any).render.fillStyle = color;
        
        Matter.World.add(engine.world, body);
    });

    // Simulate up to current frame
    // We step the simulation 'frame' times
    // This can be performance intensive for very long scenes, but for < 10s it's fine.
    // Optimization: For longer scenes, we'd use a seeded random generator and pre-calculate positions.
    const timeStep = 1000 / fps;
    for (let i = 0; i <= frame; i++) {
        Matter.Engine.update(engine, timeStep);
    }

    // Extract render data
    return Matter.Composite.allBodies(engine.world)
        .filter(b => !b.isStatic)
        .map((b, i) => ({
            key: i,
            x: b.position.x,
            y: b.position.y,
            angle: b.angle,
            label: b.label,
            color: (b as any).render.fillStyle
        }));
  }, [frame, width, height, fps, items, itemColors]);

  return (
    <AbsoluteFill style={{ backgroundColor }}>
       {src && (
          <AbsoluteFill style={{ zIndex: 0 }}>
              {mediaType === 'video' ? (
                  <Loop durationInFrames={durationInFrames}>
                      <OffthreadVideo src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
                  </Loop>
              ) : (
                  <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
              )}
              {/* Dark overlay to ensure physics items pop */}
              <AbsoluteFill style={{ backgroundColor: backgroundColor, opacity: 0.8 }} />
          </AbsoluteFill>
       )}

       {bodies.map((body) => (
           <div
            key={body.key}
            style={{
                position: 'absolute',
                left: body.x - 200, // Width/2
                top: body.y - 50, // Height/2
                width: 400,
                height: 100,
                backgroundColor: body.color,
                transform: `rotate(${body.angle}rad)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 15,
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: 42,
                fontWeight: 'bold',
                border: '4px solid rgba(255,255,255,0.2)'
            }}
           >
             {body.label}
           </div>
       ))}

        {/* Title Overlay */}
        {(title || subtitle) && (
            <div style={{
                position: 'absolute',
                top: 100,
                width: '100%',
                textAlign: 'center',
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                {title && (
                    <h1 style={{
                        fontSize: 80,
                        color: 'white',
                        marginBottom: 20,
                        textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                        fontFamily: 'sans-serif',
                        fontWeight: 900
                    }}>
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <h2 style={{
                        fontSize: 40,
                        color: 'rgba(255,255,255,0.9)',
                        fontFamily: 'sans-serif',
                        fontWeight: 500,
                        maxWidth: '80%',
                        margin: '0 auto',
                        lineHeight: 1.4,
                        background: 'rgba(0,0,0,0.4)',
                        padding: '10px 30px',
                        borderRadius: 50,
                        backdropFilter: 'blur(10px)'
                    }}>
                        {subtitle}
                    </h2>
                )}
            </div>
        )}
    </AbsoluteFill>
  );
};