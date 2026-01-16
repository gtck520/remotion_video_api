import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Img } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { SmartImage } from "../../components/SmartImage";

export const introTitleSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  titleColor: zColor(),
  backgroundColor: zColor(),
  backgroundImage: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const IntroTitle: React.FC<z.infer<typeof introTitleSchema>> = ({
  title,
  subtitle,
  titleColor,
  backgroundColor,
  backgroundImage,
  logoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
  });

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const titleY = interpolate(entrance, [0, 1], [50, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor, justifyContent: "center", alignItems: "center" }}>
        {backgroundImage && (
        <AbsoluteFill style={{ zIndex: 0 }}>
            <SmartImage src={backgroundImage} style={{ width: '100%', height: '100%' }} />
        </AbsoluteFill>
      )}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 1 }}>
            {logoUrl && (
                <Img src={logoUrl} style={{ width: 200, height: 200, marginBottom: 50, opacity: titleOpacity }} />
            )}
            <h1
              style={{
                fontFamily: "sans-serif",
                fontSize: 100,
                color: titleColor,
                opacity: titleOpacity,
                transform: `translateY(${titleY}px)`,
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <h2
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 50,
                  color: titleColor,
                  opacity: interpolate(frame, [20, 40], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  marginTop: 20,
                }}
              >
                {subtitle}
              </h2>
            )}
        </AbsoluteFill>
    </AbsoluteFill>
  );
};
