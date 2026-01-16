import { Composition } from "remotion";
import { HelloWorld, helloWorldCompSchema } from "./HelloWorld";
import { IntroTitle, introTitleSchema } from "./templates/IntroTitle";
import { KnowledgeCard, knowledgeCardSchema } from "./templates/KnowledgeCard";
import { Comparison, comparisonSchema } from "./templates/Comparison";
import { DataChart, dataChartSchema } from "./templates/DataChart";
import { Gallery, gallerySchema } from "./templates/Gallery";
import { PodcastAudio, podcastAudioSchema } from "./templates/PodcastAudio";
import { KineticText, kineticTextSchema } from "./templates/KineticText";
import { SocialStory, socialStorySchema } from "./templates/SocialStory";
import { TechCode, techCodeSchema } from "./templates/TechCode";
import { LottieSticker, lottieStickerSchema } from "./templates/LottieSticker";
import { MasterSequence, masterSequenceSchema } from "./templates/MasterSequence";
import { CaptionedVideo, captionedVideoSchema } from "./templates/CaptionedVideo";
import { PhoneMockup, phoneMockupSchema } from "./templates/PhoneMockup";
import { Audiogram, audiogramSchema } from "./templates/Audiogram";
import { WordStream, wordStreamSchema } from "./templates/WordStream";
import { SplitScreen, splitScreenSchema } from "./templates/SplitScreen";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
        schema={captionedVideoSchema}
        defaultProps={{
          src: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          type: "video",
          subtitles: [
            { startFrame: 30, endFrame: 90, text: "This is a captioned video" },
            { startFrame: 90, endFrame: 150, text: "Powered by Remotion" },
            { startFrame: 150, endFrame: 210, text: "Fully automated subtitles" }
          ],
          backgroundColor: "#000000"
        }}
      />
      <Composition
        id="PhoneMockup"
        component={PhoneMockup}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={phoneMockupSchema}
        defaultProps={{
          src: "https://picsum.photos/seed/phone/1080/1920",
          type: "image",
          backgroundColor: "#f0f0f0",
          frameColor: "#1a1a1a"
        }}
      />
      <Composition
        id="Audiogram"
        component={Audiogram}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
        schema={audiogramSchema}
        defaultProps={{
          audioUrl: "https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3",
          coverImg: "https://picsum.photos/seed/cover/800/800",
          title: "Podcast Episode 1",
          waveColor: "#e74c3c",
          backgroundColor: "#1a1a1a"
        }}
      />
      <Composition
        id="WordStream"
        component={WordStream}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={wordStreamSchema}
        defaultProps={{
          words: [
            { word: "STOP", startFrame: 0, duration: 15 },
            { word: "SCROLLING", startFrame: 15, duration: 20 },
            { word: "WATCH", startFrame: 35, duration: 15 },
            { word: "THIS", startFrame: 50, duration: 10 },
            { word: "RIGHT", startFrame: 60, duration: 15 },
            { word: "NOW", startFrame: 75, duration: 30 }
          ],
          highlightColor: "#f1c40f",
          textColor: "#ffffff"
        }}
      />
      <Composition
        id="SplitScreen"
        component={SplitScreen}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={splitScreenSchema}
        defaultProps={{
          layout: "horizontal",
          items: [
            { type: "image", src: "https://picsum.photos/seed/left/800/600", title: "View A" },
            { type: "image", src: "https://picsum.photos/seed/right/800/600", title: "View B" }
          ],
          dividerColor: "#ffffff",
          dividerWidth: 20
        }}
      />
      <Composition
        id="MasterSequence"
        component={MasterSequence}
        durationInFrames={1800} // Default max duration, but it's dynamic
        fps={30}
        width={1920}
        height={1080}
        schema={masterSequenceSchema}
        calculateMetadata={async ({ props }) => {
          const totalDuration = props.scenes 
            ? props.scenes.reduce((acc, scene) => acc + scene.durationInFrames, 0)
            : 1800;
          
          return {
            durationInFrames: totalDuration || 1800,
          };
        }}
        defaultProps={{
          scenes: [
            {
              type: "IntroTitle",
              durationInFrames: 90,
              props: { title: "Master Sequence", subtitle: "Dynamic Composition", titleColor: "#000", backgroundColor: "#fff" }
            }
          ]
        }}
      />
      <Composition
        id="TechCode"
        component={TechCode}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={techCodeSchema}
        defaultProps={{
          code: "console.log('Hello World');",
          language: "typescript",
          theme: "dark",
          backgroundColor: "#1e1e1e"
        }}
      />
      <Composition
        id="LottieSticker"
        component={LottieSticker}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={lottieStickerSchema}
        defaultProps={{
          lottieUrl: "https://assets9.lottiefiles.com/packages/lf20_g48j9z.json",
          loop: true,
          backgroundColor: "#ffffff"
        }}
      />
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={helloWorldCompSchema}
        defaultProps={{
          titleText: "Render Server Template",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />
      <Composition
        id="IntroTitle"
        component={IntroTitle}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={introTitleSchema}
        defaultProps={{
          title: "Welcome to Remotion",
          subtitle: "Video generation made easy",
          titleColor: "#000000",
          backgroundColor: "#ffffff",
        }}
      />
      <Composition
        id="KnowledgeCard"
        component={KnowledgeCard}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={knowledgeCardSchema}
        defaultProps={{
          title: "Key Takeaways",
          points: ["Automated rendering", "React-based templates", "Scalable infrastructure"],
          backgroundColor: "#f0f0f0",
          textColor: "#333333",
        }}
      />
      <Composition
        id="Comparison"
        component={Comparison}
        durationInFrames={200}
        fps={30}
        width={1920}
        height={1080}
        schema={comparisonSchema}
        defaultProps={{
          leftTitle: "Before",
          leftColor: "#e74c3c",
          leftPoints: ["Manual editing", "Slow production", "Inconsistent style"],
          rightTitle: "After",
          rightColor: "#27ae60",
          rightPoints: ["Automated API", "Instant results", "Brand consistency"],
          backgroundColor: "#ffffff",
        }}
      />
      <Composition
        id="DataChart"
        component={DataChart}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={dataChartSchema}
        defaultProps={{
          title: "Monthly Growth",
          data: [
            { label: "Jan", value: 100, color: "#3498db" },
            { label: "Feb", value: 150, color: "#9b59b6" },
            { label: "Mar", value: 250, color: "#e67e22" },
            { label: "Apr", value: 300, color: "#2ecc71" },
          ],
          backgroundColor: "#ffffff",
          textColor: "#333333",
        }}
      />
      <Composition
        id="Gallery"
        component={Gallery}
        durationInFrames={200}
        fps={30}
        width={1920}
        height={1080}
        schema={gallerySchema}
        defaultProps={{
          title: "Project Showcase",
          images: [
            "https://source.unsplash.com/random/800x600?tech",
            "https://source.unsplash.com/random/800x600?nature",
            "https://source.unsplash.com/random/800x600?city",
          ],
          backgroundColor: "#ffffff",
          textColor: "#333333",
        }}
      />
      <Composition
        id="PodcastAudio"
        component={PodcastAudio}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={podcastAudioSchema}
        defaultProps={{
          audioUrl: "https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3",
          coverImg: "https://picsum.photos/seed/cover/400/400",
          title: "Tech Talk Daily",
          artist: "Hosted by AI",
          backgroundColor: "#1a1a1a",
          barColor: "#e74c3c",
        }}
      />
      <Composition
        id="KineticText"
        component={KineticText}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        schema={kineticTextSchema}
        defaultProps={{
          texts: ["FAST", "DYNAMIC", "ENGAGING", "REMOTION"],
          colors: ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71"],
          backgroundColor: "#ffffff",
        }}
      />
      <Composition
        id="SocialStory"
        component={SocialStory}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={socialStorySchema}
        defaultProps={{
          imageUrl: "https://picsum.photos/seed/story/1080/1920",
          title: "New feature alert! Check it out.",
          profileName: "@remotion_user",
          profileImg: "https://picsum.photos/seed/user/100/100",
          accentColor: "#3498db",
        }}
      />
    </>
  );
};
