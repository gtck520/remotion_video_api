import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { SmartImage } from "../../components/SmartImage";

export const comparisonSchema = z.object({
  leftTitle: z.string(),
  leftColor: zColor(),
  leftPoints: z.array(z.string()),
  rightTitle: z.string(),
  rightColor: zColor(),
  rightPoints: z.array(z.string()),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
});

export const Comparison: React.FC<z.infer<typeof comparisonSchema>> = ({
  leftTitle,
  leftColor,
  leftPoints,
  rightTitle,
  rightColor,
  rightPoints,
  backgroundColor,
  backgroundImage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
      frame,
      fps,
      config: { damping: 200 }
  });

  const dividerHeight = interpolate(entrance, [0, 1], [0, 800]);

  return (
    <AbsoluteFill style={{ backgroundColor, flexDirection: "row", padding: 60 }}>
      {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <SmartImage src={backgroundImage} style={{ width: '100%', height: '100%' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ flexDirection: "row", padding: 60, zIndex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingRight: 40 }}>
            <h2 style={{ fontFamily: "sans-serif", fontSize: 60, color: leftColor, textAlign: 'center' }}>{leftTitle}</h2>
            {leftPoints.map((point, i) => (
                 <div key={i} style={{ 
                     fontSize: 40, 
                     color: '#333', 
                     marginTop: 30,
                     opacity: interpolate(frame, [30 + i * 10, 50 + i * 10], [0, 1])
                }}>
                    {point}
                 </div>
            ))}
          </div>
          
          <div style={{ width: 4, backgroundColor: '#ccc', height: dividerHeight, alignSelf: 'center' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 40 }}>
            <h2 style={{ fontFamily: "sans-serif", fontSize: 60, color: rightColor, textAlign: 'center' }}>{rightTitle}</h2>
             {rightPoints.map((point, i) => (
                 <div key={i} style={{ 
                     fontSize: 40, 
                     color: '#333', 
                     marginTop: 30,
                     opacity: interpolate(frame, [40 + i * 10, 60 + i * 10], [0, 1])
                }}>
                    {point}
                 </div>
            ))}
          </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
