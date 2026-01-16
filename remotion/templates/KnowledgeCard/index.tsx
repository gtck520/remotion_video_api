import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Img, interpolate, spring } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const knowledgeCardSchema = z.object({
  title: z.string(),
  points: z.array(z.string()),
  imageUrl: z.string().optional(),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
  textColor: zColor(),
});

export const KnowledgeCard: React.FC<z.infer<typeof knowledgeCardSchema>> = ({
  title,
  points,
  imageUrl,
  backgroundColor,
  backgroundImage,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor, padding: 60 }}>
      {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <Img src={backgroundImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ padding: 60, zIndex: 1 }}>
          <h1
            style={{
              fontFamily: "sans-serif",
              fontSize: 80,
              color: textColor,
              marginBottom: 60,
              borderBottom: `5px solid ${textColor}`,
              paddingBottom: 20,
            }}
          >
            {title}
          </h1>
          
          <div style={{ display: "flex", flexDirection: "row", gap: 60, flex: 1 }}>
            <div style={{ flex: 1 }}>
                {points.map((point, index) => {
                    const delay = index * 30;
                    const progress = spring({
                        frame: frame - delay - 15,
                        fps,
                        config: { damping: 200 },
                    });
                    
                    const opacity = interpolate(frame, [delay + 15, delay + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                    const translateX = interpolate(progress, [0, 1], [50, 0]);

                    return (
                        <div
                            key={index}
                            style={{
                                fontFamily: "sans-serif",
                                fontSize: 50,
                                color: textColor,
                                marginBottom: 40,
                                opacity,
                                transform: `translateX(${translateX}px)`,
                                display: 'flex',
                                alignItems: 'flex-start'
                            }}
                        >
                            <span style={{ marginRight: 20 }}>•</span>
                            {point}
                        </div>
                    );
                })}
            </div>
            {imageUrl && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                     <Img 
                        src={imageUrl} 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            borderRadius: 20,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            opacity: interpolate(frame, [10, 30], [0, 1])
                        }} 
                     />
                </div>
            )}
          </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
