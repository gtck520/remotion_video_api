import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { SmartImage } from "../../components/SmartImage";

export const knowledgeCardSchema = z.object({
  title: z.string(),
  points: z.array(z.string()),
  imageUrl: z.string().optional(),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
  textColor: zColor(),
  variant: z.enum(['classic', 'cards', 'hero']).optional(),
});

const ClassicLayout: React.FC<any> = ({ title, points, imageUrl, textColor, frame, fps }) => {
    const titleOpacity = interpolate(frame, [0, 20], [0, 1]);
    const titleTranslateY = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [-50, 0]);

    return (
        <AbsoluteFill style={{ padding: 60, zIndex: 1 }}>
            <h1
                style={{
                    fontFamily: "sans-serif",
                    fontSize: 80,
                    color: textColor,
                    marginBottom: 60,
                    borderBottom: `5px solid ${textColor}`,
                    paddingBottom: 20,
                    opacity: titleOpacity,
                    transform: `translateY(${titleTranslateY}px)`,
                }}
            >
                {title}
            </h1>

            <div style={{ display: "flex", flexDirection: "row", gap: 60, flex: 1 }}>
                <div style={{ flex: 1 }}>
                    {points.map((point: string, index: number) => {
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
                        <SmartImage
                            src={imageUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 20,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                opacity: interpolate(frame, [10, 30], [0, 1])
                            }}
                        />
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
};

const CardsLayout: React.FC<any> = ({ title, points, textColor, frame, fps }) => {
    const titleOpacity = interpolate(frame, [0, 20], [0, 1]);

    return (
        <AbsoluteFill style={{ padding: 60, zIndex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1
                style={{
                    fontFamily: "sans-serif",
                    fontSize: 80,
                    color: textColor,
                    textAlign: 'center',
                    marginBottom: 80,
                    opacity: titleOpacity,
                }}
            >
                {title}
            </h1>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: points.length > 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: 40,
                flex: 1,
                alignContent: 'center'
            }}>
                {points.map((point: string, index: number) => {
                    const delay = index * 20 + 20;
                    const progress = spring({
                        frame: frame - delay,
                        fps,
                        config: { stiffness: 100 }
                    });
                    
                    const scale = interpolate(progress, [0, 1], [0.8, 1]);
                    const opacity = interpolate(progress, [0, 1], [0, 1]);

                    return (
                        <div key={index} style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 30,
                            padding: 40,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: `2px solid ${textColor}`,
                            opacity,
                            transform: `scale(${scale})`,
                        }}>
                            <div style={{
                                fontSize: 100,
                                fontWeight: 'bold',
                                color: textColor,
                                opacity: 0.3,
                                marginBottom: 20
                            }}>
                                {index + 1}
                            </div>
                            <div style={{
                                fontSize: 40,
                                color: textColor,
                                textAlign: 'center',
                                fontFamily: "sans-serif",
                            }}>
                                {point}
                            </div>
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}

const HeroLayout: React.FC<any> = ({ title, points, textColor, frame, fps }) => {
    return (
        <AbsoluteFill style={{ padding: 100, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <h1
                style={{
                    fontFamily: "sans-serif",
                    fontSize: 60,
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: 10,
                    opacity: 0.7,
                    marginBottom: 40
                }}
            >
                {title}
            </h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
                {points.map((point: string, index: number) => {
                    const delay = index * 40;
                    const progress = spring({
                        frame: frame - delay,
                        fps,
                        config: { damping: 20 }
                    });
                    
                    const x = interpolate(progress, [0, 1], [100, 0]);
                    const opacity = interpolate(progress, [0, 1], [0, 1]);

                    return (
                        <div key={index} style={{
                            fontSize: 90,
                            fontWeight: 'bold',
                            color: textColor,
                            fontFamily: "sans-serif",
                            transform: `translateX(${x}px)`,
                            opacity
                        }}>
                            {point}
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
}

export const KnowledgeCard: React.FC<z.infer<typeof knowledgeCardSchema>> = ({
  title,
  points,
  imageUrl,
  backgroundColor,
  backgroundImage,
  textColor,
  variant = 'classic',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <SmartImage src={backgroundImage} style={{ width: '100%', height: '100%' }} />
        </AbsoluteFill>
      )}
      
      {variant === 'classic' && <ClassicLayout title={title} points={points} imageUrl={imageUrl} textColor={textColor} frame={frame} fps={fps} />}
      {variant === 'cards' && <CardsLayout title={title} points={points} textColor={textColor} frame={frame} fps={fps} />}
      {variant === 'hero' && <HeroLayout title={title} points={points} textColor={textColor} frame={frame} fps={fps} />}
      
    </AbsoluteFill>
  );
};
