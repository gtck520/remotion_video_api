import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import Matter from 'matter-js';

export const physicsStackSchema = z.object({
  items: z.array(z.string()), // Text content for items
  itemColors: z.array(z.string()).optional(),
  backgroundColor: z.string().optional(),
});

export const PhysicsStack: React.FC<z.infer<typeof physicsStackSchema>> = ({
  items,
  itemColors = ['#e74c3c', '#3498db', '#9b59b6', '#2ecc71', '#f1c40f'],
  backgroundColor = '#111',
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  
  // We use a state to force re-render if needed, but Matter.js handles canvas
  const [, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Deterministic physics for video consistency
    // Note: Matter.js can be non-deterministic. For perfect consistency, we should pre-calculate or use a seeded random.
    // For now, we rely on basic setup.

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;

    // Boundaries
    const ground = Matter.Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true, render: { fillStyle: 'transparent' } });
    const leftWall = Matter.Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true });

    Matter.World.add(engine.world, [ground, leftWall, rightWall]);

    // Add items
    items.forEach((item, index) => {
        // Stagger creation slightly or place them high up
        const x = width / 2 + (Math.random() - 0.5) * 200;
        const y = -100 - (index * 200); // Start above screen
        
        const color = itemColors[index % itemColors.length];
        
        // We create rectangles with text textures or just colored boxes for now
        // To render text, Matter.js Render module is limited. We might need a custom renderer loop or overlay.
        // Let's stick to colored boxes for the physics demo, and overlay React components if we can track them.
        // BUT, for simplicity in this turn, let's just use Matter's renderer for shapes and maybe try to map React nodes to bodies later.
        // Actually, let's do the "React follows Physics" approach.
        
        const body = Matter.Bodies.rectangle(x, y, 300, 80, {
            restitution: 0.5,
            label: item, // Store text in label
            render: {
                fillStyle: color,
            }
        });
        
        Matter.World.add(engine.world, body);
    });

    // Matter.Render.run(render); // We will manually update in the loop
    setIsLoaded(true);

    return () => {
        Matter.Render.stop(render);
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
        if(render.canvas) render.canvas.remove();
    };
  }, []);

  // Update physics based on frame
  // This is crucial for Remotion: Physics must depend on 'frame', not wall-clock time
  useEffect(() => {
      if(!engineRef.current || !renderRef.current) return;
      
      const engine = engineRef.current;
      // const render = renderRef.current;
      
      // Reset world to initial state and simulate up to current frame
      // This is expensive but ensures frame-perfect seeking.
      // Optimization: For forward playback, we could just step. But for rendering, we need determinism.
      // A better approach for heavy physics is to pre-bake. 
      // For this demo, let's just assume linear playback or fast enough simulation.
      
      // Actually, for Remotion, we should reset and step 'frame' times.
      // CAUTION: This might be slow for long scenes.
      
      // Let's try a simpler approach: Just run the engine step-by-step from 0 to frame.
      // To avoid re-calculating from 0 every React render, we can't easily do it without memoization or a heavy cost.
      // However, since Remotion renders frame by frame, if we just step() once per frame update during render, it works for sequential render.
      // But seeking backwards breaks.
      
      // Correct Remotion approach:
      // 1. Clear World
      // 2. Re-add bodies at initial positions
      // 3. Step engine 'frame' times
      
      // Re-init Logic (Simplified for performance, might be jittery on seek)
       Matter.World.clear(engine.world, false);
       Matter.Engine.clear(engine);
       
       // Re-add boundaries
       const ground = Matter.Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true });
       const leftWall = Matter.Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true });
       const rightWall = Matter.Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true });
       Matter.World.add(engine.world, [ground, leftWall, rightWall]);

       // Re-add bodies
       items.forEach((item, index) => {
           // Use deterministic random based on index
           const pseudoRandom = Math.sin(index * 999);
           const x = width / 2 + pseudoRandom * 200;
           const y = -100 - (index * 200); 
           const color = itemColors[index % itemColors.length];
           
           const body = Matter.Bodies.rectangle(x, y, 400, 100, {
               restitution: 0.6,
               friction: 0.1,
               label: item,
               angle: pseudoRandom * 0.5, // Initial rotation
           });
           (body as any).render.fillStyle = color;
           Matter.World.add(engine.world, body);
       });
       
       // Simulate
       const timeStep = 1000 / fps;
       for(let i = 0; i < frame; i++) {
           Matter.Engine.update(engine, timeStep);
       }
       
       // Render one frame
       // We use custom rendering mapping React elements to Body positions
       // So we don't need Matter.Render here, we just need the body positions.
       
       // Trigger re-render of React components
       setIsLoaded(prev => !prev); // Force update
       
  }, [frame, width, height, fps, items, itemColors]); // Re-run every frame change

  // Get bodies to render
  const bodies = engineRef.current ? Matter.Composite.allBodies(engineRef.current.world).filter(b => !b.isStatic) : [];

  return (
    <AbsoluteFill style={{ backgroundColor }}>
       {bodies.map((body, i) => {
           const { position, angle, label } = body;
           const color = (body as any).render.fillStyle;
           return (
               <div
                key={i}
                style={{
                    position: 'absolute',
                    left: position.x - 200, // Width/2
                    top: position.y - 50, // Height/2
                    width: 400,
                    height: 100,
                    backgroundColor: color,
                    transform: `rotate(${angle}rad)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                    fontSize: 40,
                    fontWeight: 'bold'
                }}
               >
                 {label}
               </div>
           )
       })}
    </AbsoluteFill>
  );
};
