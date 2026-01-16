import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, spring, interpolate } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const gallerySchema = z.object({
  title: z.string(),
  images: z.array(z.string()),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
  textColor: zColor(),
});

export const Gallery: React.FC<z.infer<typeof gallerySchema>> = ({
  title,
  images,
  backgroundColor,
  backgroundImage,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor, padding: 60, alignItems: 'center' }}>
       {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <Img src={backgroundImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ padding: 60, alignItems: 'center', zIndex: 1 }}>
           <h1 style={{ fontFamily: "sans-serif", fontSize: 80, color: textColor, marginBottom: 60 }}>{title}</h1>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, width: '100%' }}>
                {images.map((img, index) => {
                     const scale = spring({
                         frame: frame - index * 5,
                         fps,
                         config: { damping: 200 }
                     });
                     
                     return (
                         <div key={index} style={{ 
                             aspectRatio: '16/9', 
                             overflow: 'hidden', 
                             borderRadius: 20, 
                             transform: `scale(${scale})`,
                             boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                        }}>
                            <Img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                     );
                })}
           </div>
       </AbsoluteFill>
    </AbsoluteFill>
  );
};
