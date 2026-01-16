import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const dataChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ label: z.string(), value: z.number(), color: zColor() })),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
  textColor: zColor(),
});

export const DataChart: React.FC<z.infer<typeof dataChartSchema>> = ({
  title,
  data,
  backgroundColor,
  backgroundImage,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <AbsoluteFill style={{ backgroundColor, padding: 60, alignItems: 'center' }}>
      {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <Img src={backgroundImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ padding: 60, alignItems: 'center', zIndex: 1 }}>
          <h1 style={{ fontFamily: "sans-serif", fontSize: 80, color: textColor, marginBottom: 100 }}>{title}</h1>
          
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', height: 600, width: '100%', gap: 40, padding: '0 40px' }}>
            {data.map((item, index) => {
                const progress = spring({
                    frame: frame - index * 10,
                    fps,
                    config: { damping: 200 }
                });
                
                const barHeight = interpolate(progress, [0, 1], [0, (item.value / maxValue) * 100]);
                
                return (
                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                         <div style={{ fontSize: 40, color: textColor, marginBottom: 10, opacity: interpolate(progress, [0.8, 1], [0, 1]) }}>{item.value}</div>
                         <div style={{ 
                             width: '100%', 
                             height: `${barHeight}%`, 
                             backgroundColor: item.color, 
                             borderRadius: '10px 10px 0 0',
                             boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }} />
                         <div style={{ fontSize: 30, color: textColor, marginTop: 20 }}>{item.label}</div>
                    </div>
                )
            })}
          </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
