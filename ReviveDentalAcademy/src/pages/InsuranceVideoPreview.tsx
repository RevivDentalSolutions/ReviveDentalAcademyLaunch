import { Player } from "@remotion/player";
import { VideoLessonComposition, reviveVideoConfig, getLessonDurationInFrames } from "../remotion/VideoLessonComposition";
import { insuranceVerificationPrototype } from "../remotion/insuranceVerificationPrototype";

// Preview-only, no generation, no upload, no publish and no patient data.
export default function InsuranceVideoPreview() {
  return (
    <main style={{ minHeight: "100vh", background: "#1b2226", color: "#fff", padding: "clamp(20px,4vw,64px)", fontFamily: "Poppins, Arial, sans-serif" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ color: "#87D7D2", letterSpacing: 3, fontSize: 13 }}>REVIVE DENTAL ACADEMY · PRIVATE DEVELOPMENT PREVIEW</p>
        <h1 style={{ fontSize: "clamp(26px,4vw,42px)", marginBottom: 8 }}>Dental Insurance Verification</h1>
        <p style={{ color: "#c9d3d6", marginBottom: 24 }}>60-second silent motion storyboard. Fictional patient data, placeholder instructor. No AI or published course.</p>
        <div style={{ overflow: "hidden", borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
          <Player
            component={VideoLessonComposition}
            inputProps={{ lesson: insuranceVerificationPrototype }}
            durationInFrames={getLessonDurationInFrames(insuranceVerificationPrototype)}
            fps={reviveVideoConfig.fps}
            compositionWidth={reviveVideoConfig.width}
            compositionHeight={reviveVideoConfig.height}
            controls
            autoPlay={false}
            style={{ width: "100%", aspectRatio: "16 / 9" }}
          />
        </div>
        <p style={{ marginTop: 20, color: "#a9b8bd" }}>Press Play to inspect animations. Narration text is scripted but no voice recording has been added.</p>
      </div>
    </main>
  );
}
