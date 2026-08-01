import type { ComponentType, CSSProperties } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { defaultAcademyVideoSettings, type AcademyVideoSettings, type VideoLessonMetadata, type VideoLessonScene } from "../lib/video-lessons/videoLessonTypes";
import { getVideoLessonTemplate } from "../lib/video-lessons/videoLessonTemplates";
import { ReviveAcademyScene } from "./ReviveAcademyScene";

const FPS = 30;
const RemotionImg = Img as unknown as ComponentType<{ src: string; style?: CSSProperties }>;
const RemotionVideo = Video as unknown as ComponentType<{ src: string; style?: CSSProperties; loop?: boolean; muted?: boolean }>;

export const reviveVideoConfig = {
  width: 1920,
  height: 1080,
  fps: FPS,
};

export function getLessonDurationInFrames(lesson: VideoLessonMetadata) {
  const settings = normalizeAcademySettings(lesson.academySettings);
  const introFrames = settings.introVideoUrl ? settings.introDurationInSeconds * FPS : 0;
  const outroFrames = settings.outroVideoUrl ? settings.outroDurationInSeconds * FPS : 0;
  const sceneFrames = lesson.scenes.reduce((total, scene) => {
    return total + Math.max(4, scene.durationInSeconds || 8) * FPS;
  }, 0);

  return introFrames + sceneFrames + outroFrames;
}

function normalizeAcademySettings(settings?: AcademyVideoSettings): AcademyVideoSettings {
  return {
    ...defaultAcademyVideoSettings,
    ...settings,
    introDurationInSeconds: Math.max(1, Number(settings?.introDurationInSeconds ?? defaultAcademyVideoSettings.introDurationInSeconds)),
    outroDurationInSeconds: Math.max(1, Number(settings?.outroDurationInSeconds ?? defaultAcademyVideoSettings.outroDurationInSeconds)),
  };
}

function BrandedVideoSegment({ src }: { src: string }) {
  return (
    <AbsoluteFill style={{ background: "#050505" }}>
      <RemotionVideo
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
}

function getMediaBoxStyle(position: VideoLessonScene["mediaPosition"]): CSSProperties {
  if (position === "background") return { position: "absolute", inset: 0 };
  if (position === "left") return { position: "absolute", top: 150, bottom: 96, left: 82, width: 760 };
  if (position === "center") return { position: "absolute", top: 190, left: 450, width: 1020, height: 600 };
  return { position: "absolute", top: 150, bottom: 96, right: 82, width: 760 };
}

function SceneMedia({ scene }: { scene: VideoLessonScene }) {
  const mediaUrl = scene.mediaUrl || scene.imageUrl || "";
  const mediaType = scene.mediaType || (mediaUrl ? "image" : "none");
  const fit = scene.mediaFit || "cover";
  const opacity = scene.mediaOpacity ?? 1;

  return (
    <>
      {scene.backgroundImageUrl && (
        <RemotionImg
          src={scene.backgroundImageUrl}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {scene.backgroundVideoUrl && (
        <RemotionVideo
          src={scene.backgroundVideoUrl}
          loop
          muted
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {mediaUrl && mediaType !== "none" && (
        <div
          style={{
            ...getMediaBoxStyle(scene.mediaPosition || "right"),
            overflow: "hidden",
            opacity,
            background: "#050505",
          }}
        >
          {mediaType === "video" ? (
            <RemotionVideo
              src={mediaUrl}
              loop={scene.loopMedia ?? true}
              muted
              style={{ width: "100%", height: "100%", objectFit: fit }}
            />
          ) : (
            <RemotionImg src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: fit }} />
          )}
        </div>
      )}
    </>
  );
}

function SceneCard({ scene, index, templateId }: { scene: VideoLessonScene; index: number; templateId: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const template = getVideoLessonTemplate(templateId as VideoLessonMetadata["templateId"]);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const slideX = template.transition === "slide" ? interpolate(enter, [0, 1], [90, 0]) : 0;
  const hasSideMedia = Boolean((scene.mediaUrl || scene.imageUrl) && scene.mediaPosition !== "background" && scene.mediaPosition !== "center");
  const textColumn = scene.mediaPosition === "left" ? "2 / 3" : "1 / 2";
  const hasBackgroundMedia = Boolean(scene.backgroundImageUrl || scene.backgroundVideoUrl || scene.mediaPosition === "background" || scene.mediaPosition === "center");
  const foregroundColor = hasBackgroundMedia ? "#ffffff" : "#050505";
  const bodyColor = hasBackgroundMedia ? "#eef7f6" : "#050505";

  return (
    <AbsoluteFill
      style={{
        background: "#ffffff",
        color: foregroundColor,
        fontFamily: "Inter, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(0,183,181,0.16), rgba(255,255,255,0) 42%), radial-gradient(circle at 88% 18%, rgba(0,183,181,0.18), transparent 22%)",
        }}
      />
      <SceneMedia scene={scene} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(5, 5, 5, ${scene.textOverlayStrength ?? 0})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 82,
          right: 82,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        <span>REVIVE DENTAL ACADEMY</span>
        <span style={{ color: "#00b7b5" }}>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div
        style={{
          position: "absolute",
          inset: "150px 82px 96px",
          display: "grid",
          gridTemplateColumns: hasSideMedia || scene.imageUrl || templateId === "revive-split" ? "1.05fr 0.95fr" : "1fr",
          gap: 64,
          alignItems: "center",
          opacity,
          transform: `translateX(${slideX}px)`,
        }}
      >
        <div style={{ gridColumn: hasSideMedia ? textColumn : undefined }}>
          <div
            style={{
              width: 118,
              height: 8,
              background: "#00b7b5",
              marginBottom: 34,
            }}
          />
          <h1
            style={{
              fontSize: 78,
              lineHeight: 1.02,
              margin: "0 0 32px",
              fontWeight: 800,
              maxWidth: 1040,
            }}
          >
            {scene.title}
          </h1>
          <p style={{ color: bodyColor, fontSize: 36, lineHeight: 1.35, margin: 0, maxWidth: 980 }}>{scene.body}</p>
          {!!scene.bullets?.length && (
            <div style={{ display: "grid", gap: 16, marginTop: 38 }}>
              {scene.bullets.map((bullet) => (
                <div key={bullet} style={{ color: bodyColor, display: "flex", alignItems: "center", gap: 18, fontSize: 30 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 999, background: "#00b7b5" }} />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {(!scene.mediaUrl && (scene.imageUrl || templateId === "revive-split")) && (
          <div
            style={{
              height: 680,
              border: "2px solid #050505",
              background: "#f5fbfb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {scene.imageUrl ? (
              <RemotionImg src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#00b7b5", fontSize: 40, fontWeight: 800 }}>REVIVE</div>
            )}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 82,
          right: 82,
          bottom: 48,
          height: 2,
          background: "#050505",
        }}
      />
    </AbsoluteFill>
  );
}

export function VideoLessonComposition({ lesson }: { lesson: VideoLessonMetadata }) {
  const settings = normalizeAcademySettings(lesson.academySettings);
  const introFrames = settings.introVideoUrl ? settings.introDurationInSeconds * FPS : 0;
  const outroFrames = settings.outroVideoUrl ? settings.outroDurationInSeconds * FPS : 0;
  let cursor = introFrames;

  return (
    <AbsoluteFill>
      {settings.introVideoUrl && (
        <Sequence from={0} durationInFrames={introFrames}>
          <BrandedVideoSegment src={settings.introVideoUrl} />
        </Sequence>
      )}
      {lesson.scenes.map((scene, index) => {
        const duration = Math.max(4, scene.durationInSeconds || 8) * FPS;
        const from = cursor;
        cursor += duration;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={duration}>
            {lesson.templateId === "revive-academy" ? (
              <ReviveAcademyScene scene={scene} index={index} lesson={lesson} />
            ) : (
              <SceneCard scene={scene} index={index} templateId={lesson.templateId} />
            )}
          </Sequence>
        );
      })}
      {settings.outroVideoUrl && (
        <Sequence from={cursor} durationInFrames={outroFrames}>
          <BrandedVideoSegment src={settings.outroVideoUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
