import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Img, Video, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoLessonMetadata, VideoLessonScene } from "../lib/video-lessons/videoLessonTypes";
import type { VideoLessonLayoutId } from "../lib/video-lessons/videoLessonLayouts";
import { getReviveIconName, getReviveIconUrl, type ReviveIconName } from "../lib/video-lessons/reviveIconRegistry";

const RemotionImg = Img as unknown as ComponentType<{ src: string; style?: CSSProperties }>;
const RemotionVideo = Video as unknown as ComponentType<{ src: string; style?: CSSProperties; loop?: boolean; muted?: boolean }>;

const colors = {
  background: "#262D31",
  panel: "#30383D",
  aqua: "#87D7D2",
  text: "#FFFFFF",
  body: "#D4D7DA",
  muted: "#889197",
  progress: "#50575C",
};

const fontFamily = "Poppins, Inter, Arial, sans-serif";

function getLabel(layoutId?: VideoLessonLayoutId) {
  const labels: Record<VideoLessonLayoutId, string> = {
    title: "Lesson",
    "section-divider": "Section",
    definition: "Definition",
    comparison: "Comparison",
    process: "Process",
    timeline: "Timeline",
    example: "Example",
    "patient-scenario": "Patient Scenario",
    quiz: "Knowledge Check",
    recap: "Recap",
    "avatar-intro": "Avatar Intro",
    "avatar-outro": "Avatar Outro",
  };
  return labels[layoutId || "definition"];
}

function Animated({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18, stiffness: 80 } });
  const opacity = interpolate(frame - delay, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(enter, [0, 1], [36, 0]);
  return <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>{children}</div>;
}

export function GlassCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.105), rgba(255,255,255,0.035))",
        border: `2px solid rgba(135, 215, 210, 0.34)`,
        borderRadius: 28,
        boxShadow: "0 24px 70px rgba(0,0,0,0.25), 0 0 38px rgba(135,215,210,0.12)",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          background: "linear-gradient(120deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 34%)",
          height: "100%",
          left: -80,
          position: "absolute",
          top: -120,
          transform: "rotate(18deg)",
          width: 260,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(135,215,210,0.16)",
        border: `1px solid rgba(135,215,210,0.54)`,
        borderRadius: 999,
        color: colors.aqua,
        display: "inline-flex",
        fontFamily,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 4,
        padding: "12px 22px",
        textTransform: "uppercase",
        width: "fit-content",
      }}
    >
      {children}
    </div>
  );
}

export function ReviveIcon({ name, layoutId, size = 72, treatment = "aqua" }: { name?: string; layoutId?: VideoLessonLayoutId; size?: number; treatment?: "aqua" | "white" }) {
  const iconName = getReviveIconName(name, layoutId);
  // The newer approved SVG exports retain a generous 1500px artboard. Scale
  // those vectors inside their viewport so their artwork reads consistently
  // beside the tightly cropped legacy icons without altering the source files.
  const paddedAssetScale: Partial<Record<ReviveIconName, number>> = {
    calculator: 5,
    checklist: 5,
    dollar: 5,
    lightbulb: 5,
    patient: 5,
    question: 5,
    shield: 5,
    team: 5,
    warning: 5,
  };
  const scale = paddedAssetScale[iconName] ?? 1;

  return (
    <div style={{ alignItems: "center", display: "flex", height: size, justifyContent: "center", overflow: "hidden", width: size }}>
      <RemotionImg
        src={getReviveIconUrl(iconName)}
        style={{
          display: "block",
          filter: treatment === "white" ? "grayscale(1) brightness(4)" : undefined,
          height: size,
          objectFit: "contain",
          transform: `scale(${scale})`,
          width: size,
        }}
      />
    </div>
  );
}

export function IconCircle({ label, icon, layoutId }: { label?: string; icon?: string; layoutId?: VideoLessonLayoutId }) {
  return (
    <div
      style={{
        alignItems: "center",
        border: `3px solid ${colors.aqua}`,
        borderRadius: "50%",
        color: colors.aqua,
        display: "flex",
        fontFamily,
        fontSize: 64,
        fontWeight: 800,
        height: 190,
        justifyContent: "center",
        width: 190,
      }}
    >
      {label || <ReviveIcon name={icon} layoutId={layoutId} size={156} />}
    </div>
  );
}

export function HexagonFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        alignItems: "center",
        aspectRatio: "1",
        background: "rgba(135,215,210,0.05)",
        clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)",
        display: "flex",
        justifyContent: "center",
        padding: 18,
        width: 430,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: colors.panel,
          clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.max(0.08, current / total) : 0.08;
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 18, width: "100%" }}>
      <div style={{ background: colors.progress, borderRadius: 999, flex: 1, height: 6, overflow: "hidden" }}>
        <div style={{ background: colors.aqua, borderRadius: 999, height: "100%", width: `${pct * 100}%` }} />
      </div>
      <span style={{ color: colors.aqua, fontFamily, fontSize: 15, fontWeight: 700 }}>
        {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

export function LessonHeader({ lessonTitle, index }: { lessonTitle: string; index: number }) {
  return (
    <div
      style={{
        alignItems: "flex-start",
        display: "flex",
        justifyContent: "space-between",
        left: 70,
        position: "absolute",
        right: 70,
        top: 70,
        zIndex: 4,
      }}
    >
      <div style={{ color: colors.text, fontFamily, fontSize: 15, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase" }}>
        Revive Dental Academy
      </div>
      <div style={{ color: colors.muted, fontFamily, fontSize: 15, fontWeight: 500, letterSpacing: 3, textAlign: "right", textTransform: "uppercase" }}>
        <div>Lesson {String(index + 1).padStart(2, "0")}</div>
        <div style={{ color: colors.aqua, fontSize: 15, marginTop: 6 }}>{lessonTitle}</div>
      </div>
    </div>
  );
}

export function LessonFooter({ index, total }: { index: number; total: number }) {
  return (
    <div style={{ bottom: 50, left: 70, position: "absolute", right: 70, zIndex: 4 }}>
      <ProgressBar current={index + 1} total={total} />
    </div>
  );
}

function BackgroundMedia({ scene }: { scene: VideoLessonScene }) {
  return (
    <>
      {scene.backgroundImageUrl && <RemotionImg src={scene.backgroundImageUrl} style={{ height: "100%", inset: 0, objectFit: "cover", position: "absolute", width: "100%" }} />}
      {scene.backgroundVideoUrl && <RemotionVideo src={scene.backgroundVideoUrl} loop muted style={{ height: "100%", inset: 0, objectFit: "cover", position: "absolute", width: "100%" }} />}
      {(scene.backgroundImageUrl || scene.backgroundVideoUrl) && <div style={{ background: `rgba(38,45,49,${scene.textOverlayStrength ?? 0.58})`, inset: 0, position: "absolute" }} />}
    </>
  );
}

export function Divider({ dashed = false }: { dashed?: boolean }) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 18, width: "100%" }}>
      <div style={{ borderTop: `${dashed ? "2px dashed" : "2px solid"} rgba(135,215,210,0.5)`, flex: 1 }} />
      <div style={{ border: `2px solid ${colors.aqua}`, height: 18, transform: "rotate(30deg)", width: 18 }} />
      <div style={{ borderTop: `${dashed ? "2px dashed" : "2px solid"} rgba(135,215,210,0.5)`, flex: 1 }} />
    </div>
  );
}

export function CalloutCard({ children, style, icon = "warning" }: { children: ReactNode; style?: CSSProperties; icon?: ReviveIconName }) {
  return (
    <GlassCard style={{ borderLeft: `6px solid ${colors.aqua}`, padding: "26px 30px", ...style }}>
      <div style={{ alignItems: "center", color: colors.body, display: "flex", fontFamily, fontSize: 22, gap: 20, lineHeight: 1.4 }}><ReviveIcon name={icon} size={60} />{children}</div>
    </GlassCard>
  );
}

export function ImageFrame({ scene }: { scene: VideoLessonScene }) {
  const mediaUrl = scene.mediaUrl || scene.imageUrl || "";
  const mediaType = scene.mediaType || (mediaUrl ? "image" : "none");
  return (
    <GlassCard style={{ alignItems: "center", display: "flex", height: 600, justifyContent: "center", padding: 28, width: 620 }}>
      {mediaUrl && mediaType !== "none" ? (
        mediaType === "video" ? (
          <RemotionVideo src={mediaUrl} loop={scene.loopMedia ?? true} muted style={{ borderRadius: 20, height: "100%", objectFit: scene.mediaFit || "cover", opacity: scene.mediaOpacity ?? 1, width: "100%" }} />
        ) : (
          <RemotionImg src={mediaUrl} style={{ borderRadius: 20, height: "100%", objectFit: scene.mediaFit || "cover", opacity: scene.mediaOpacity ?? 1, width: "100%" }} />
        )
      ) : (
        <HexagonFrame>
          <IconCircle icon={scene.icon} layoutId={scene.layoutId} />
        </HexagonFrame>
      )}
    </GlassCard>
  );
}

function BulletCards({ bullets }: { bullets?: string[] }) {
  if (!bullets?.length) return null;
  return (
    <div style={{ display: "grid", gap: 18, marginTop: 34 }}>
      {bullets.slice(0, 4).map((bullet, bulletIndex) => (
        <Animated key={bullet} delay={12 + bulletIndex * 4}>
          <GlassCard style={{ padding: "18px 22px" }}>
            <div style={{ alignItems: "center", color: colors.body, display: "flex", fontFamily, fontSize: 20, fontWeight: 500, gap: 16 }}>
              <span style={{ border: `2px solid ${colors.aqua}`, borderRadius: "50%", color: colors.aqua, display: "inline-flex", fontSize: 18, height: 30, justifyContent: "center", lineHeight: "26px", width: 30 }}>+</span>
              <span>{bullet}</span>
            </div>
          </GlassCard>
        </Animated>
      ))}
    </div>
  );
}

function TitleLayout({ scene }: { scene: VideoLessonScene }) {
  return (
    <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 70, height: "100%" }}>
      <Animated>
        <SectionBadge>Bootcamp</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, lineHeight: 1.05, margin: "34px 0 28px", maxWidth: 860 }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.45, margin: 0, maxWidth: 760 }}>{scene.body}</p>
      </Animated>
      <Animated delay={8}>
        <ImageFrame scene={scene} />
      </Animated>
    </div>
  );
}

function DefinitionLayout({ scene }: { scene: VideoLessonScene }) {
  return (
    <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 70, height: "100%" }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, lineHeight: 1.05, margin: "30px 0 28px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.45, margin: 0, maxWidth: 830 }}>{scene.body}</p>
        <BulletCards bullets={scene.bullets} />
      </Animated>
      <Animated delay={8}>
        <ImageFrame scene={scene} />
      </Animated>
    </div>
  );
}

function ComparisonLayout({ scene }: { scene: VideoLessonScene }) {
  const items = scene.comparisonLeftTitle || scene.comparisonRightTitle ? [scene.comparisonLeftTitle || "Option A", scene.comparisonRightTitle || "Option B"] : scene.bullets?.length ? scene.bullets : ["Option A", "Option B"];
  const pointSets = [scene.comparisonLeftPoints, scene.comparisonRightPoints];
  return (
    <div style={{ display: "grid", gap: 42 }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, margin: "28px 0 0" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, margin: "18px 0 0", maxWidth: 980 }}>{scene.body}</p>
      </Animated>
      <div style={{ display: "grid", gap: 28, gridTemplateColumns: "1fr 1fr" }}>
        {items.slice(0, 2).map((item, itemIndex) => (
          <Animated key={item} delay={8 + itemIndex * 5}>
            <GlassCard style={{ minHeight: 330, padding: 44 }}>
              <IconCircle label={String(itemIndex + 1)} />
              <h2 style={{ color: colors.text, fontFamily, fontSize: 26, fontWeight: 600, margin: "30px 0 16px" }}>{item}</h2>
              <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0 }}>{pointSets[itemIndex]?.join(" • ") || (itemIndex === 0 ? "Compare the first option, responsibility, or path." : "Compare the second option, responsibility, or path.")}</p>
            </GlassCard>
          </Animated>
        ))}
      </div>
    </div>
  );
}

function ProcessLayout({ scene }: { scene: VideoLessonScene }) {
  const steps = scene.processSteps?.length ? scene.processSteps.map((step) => step.title) : scene.bullets?.length ? scene.bullets : ["Start", "Verify", "Document"];
  return (
    <div style={{ display: "grid", gap: 48 }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, margin: "28px 0 16px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0, maxWidth: 1100 }}>{scene.body}</p>
      </Animated>
      <div style={{ alignItems: "stretch", display: "grid", gap: 24, gridTemplateColumns: `repeat(${Math.min(4, steps.length)}, 1fr)` }}>
        {steps.slice(0, 4).map((step, stepIndex) => (
          <Animated key={step} delay={8 + stepIndex * 5}>
            <GlassCard style={{ height: 330, padding: 34 }}>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}><span style={{ color: colors.aqua, fontFamily, fontSize: 42, fontWeight: 800 }}>0{stepIndex + 1}</span><ReviveIcon name={scene.processSteps?.[stepIndex]?.icon || (stepIndex === 2 ? "phone" : "clipboard")} layoutId="process" size={112} /></div>
              <h2 style={{ color: colors.text, fontFamily, fontSize: 30, fontWeight: 600, lineHeight: 1.16, margin: "62px 0 0" }}>{step}</h2>
            </GlassCard>
          </Animated>
        ))}
      </div>
    </div>
  );
}

function PaymentExampleLayout({ scene }: { scene: VideoLessonScene }) {
  const rows = scene.exampleRows?.length
    ? scene.exampleRows.slice(0, 4)
    : [{ label: "Billed fee", value: "$0" }, { label: "Allowed amount", value: "$0" }, { label: "Plan payment", value: "$0" }];
  return (
    <div style={{ display: "grid", gap: 42, height: "100%" }}>
      <Animated>
        <SectionBadge>Payment Breakdown</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, lineHeight: 1.06, margin: "28px 0 16px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0, maxWidth: 1120 }}>{scene.body}</p>
      </Animated>
      <div style={{ display: "grid", gap: 22, gridTemplateColumns: `repeat(${Math.min(4, rows.length)}, 1fr)` }}>
        {rows.map((row, index) => (
          <Animated key={`${row.label}-${index}`} delay={8 + index * 6}>
            <GlassCard style={{ height: 260, padding: 32 }}>
              <div style={{ color: colors.aqua, fontFamily, fontSize: 17, fontWeight: 700, letterSpacing: 2.2, textTransform: "uppercase" }}>{row.label}</div>
              <div style={{ color: colors.text, fontFamily, fontSize: 52, fontWeight: 800, lineHeight: 1, marginTop: 72 }}>{row.value}</div>
            </GlassCard>
          </Animated>
        ))}
      </div>
      {scene.exampleResult && <Animated delay={12 + rows.length * 6}><GlassCard style={{ background: "linear-gradient(110deg, rgba(135,215,210,0.22), rgba(48,56,61,0.78))", borderColor: colors.aqua, padding: "24px 32px" }}><div style={{ color: colors.text, fontFamily, fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}><span style={{ color: colors.aqua }}>POST THIS:</span> {scene.exampleResult}</div></GlassCard></Animated>}
    </div>
  );
}

function TimelineLayout({ scene }: { scene: VideoLessonScene }) {
  const points = scene.timelineMilestones?.length ? scene.timelineMilestones.map((milestone) => milestone.label) : scene.bullets?.length ? scene.bullets : ["Enrollment", "Waiting Period", "Coverage Begins"];
  return (
    <div style={{ display: "grid", gap: 70 }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, margin: "28px 0 16px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0, maxWidth: 1100 }}>{scene.body}</p>
      </Animated>
      <GlassCard style={{ padding: "56px 64px" }}>
        <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: `repeat(${points.length}, 1fr)`, position: "relative" }}>
          <div style={{ background: colors.progress, height: 6, left: 80, position: "absolute", right: 80, top: 66 }} />
          {points.slice(0, 4).map((point, pointIndex) => (
            <Animated key={point} delay={10 + pointIndex * 5} style={{ textAlign: "center" }}>
              <div style={{ alignItems: "center", background: colors.panel, border: `2px solid ${colors.aqua}`, borderRadius: "50%", display: "flex", height: 72, justifyContent: "center", margin: "30px auto 22px", position: "relative", width: 72 }}><ReviveIcon name={pointIndex % 2 === 0 ? "calendar" : "clock"} size={62} /></div>
              <h2 style={{ color: colors.text, fontFamily, fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: 0 }}>{point}</h2>
            </Animated>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ScenarioLayout({ scene }: { scene: VideoLessonScene }) {
  return (
    <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 60, height: "100%" }}>
      <Animated>
        <HexagonFrame>
          <IconCircle icon={scene.icon} layoutId={scene.layoutId} />
        </HexagonFrame>
      </Animated>
      <Animated delay={8}>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <GlassCard style={{ marginTop: 34, padding: 54 }}>
          <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, lineHeight: 1.05, margin: "0 0 28px" }}>{scene.title}</h1>
          <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0 }}>{scene.patientQuote || scene.quizQuestion || scene.body}</p>
          <BulletCards bullets={scene.bullets} />
        </GlassCard>
      </Animated>
    </div>
  );
}

function QuizLayout({ scene }: { scene: VideoLessonScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const choices = scene.quizChoices?.length ? scene.quizChoices.slice(0, 4) : (scene.bullets || []).slice(0, 4);
  const answerIndex = Math.max(0, Math.min(choices.length - 1, scene.correctAnswerIndex ?? 0));
  const revealAt = Math.max(4, scene.answerRevealInSeconds ?? 7) * fps;
  const revealed = frame >= revealAt;

  return (
    <div style={{ alignItems: "center", display: "grid", gap: 34, gridTemplateColumns: "0.72fr 1.28fr", height: "100%" }}>
      <Animated>
        <SectionBadge>{revealed ? "Answer Reveal" : "Pause & Practice"}</SectionBadge>
        <div style={{ alignItems: "center", background: "rgba(135,215,210,0.08)", border: `3px solid ${colors.aqua}`, borderRadius: "50%", display: "flex", height: 250, justifyContent: "center", marginTop: 38, width: 250 }}>
          <ReviveIcon name={revealed ? "checklist" : "question"} layoutId="quiz" size={190} />
        </div>
        <p style={{ color: colors.aqua, fontFamily, fontSize: 22, fontWeight: 700, lineHeight: 1.35, margin: "34px 0 0", maxWidth: 360 }}>{revealed ? "Here is the reasoning to remember." : "Pause the video. Choose your answer before the reveal."}</p>
      </Animated>
      <Animated delay={6}>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 54, fontWeight: 800, lineHeight: 1.08, margin: 0 }}>{scene.quizQuestion || scene.body || scene.title}</h1>
        <div style={{ display: "grid", gap: 16, marginTop: 34 }}>
          {choices.map((choice, index) => {
            const isCorrect = index === answerIndex;
            return (
              <Animated key={`${choice}-${index}`} delay={12 + index * 4}>
                <GlassCard style={{ background: revealed && isCorrect ? "rgba(135,215,210,0.2)" : undefined, borderColor: revealed && isCorrect ? colors.aqua : "rgba(135,215,210,0.34)", padding: "19px 24px" }}>
                  <div style={{ alignItems: "center", color: colors.body, display: "flex", fontFamily, fontSize: 23, fontWeight: 600, gap: 18, lineHeight: 1.25 }}>
                    <span style={{ alignItems: "center", border: `2px solid ${revealed && isCorrect ? colors.aqua : "rgba(135,215,210,0.55)"}`, borderRadius: "50%", color: colors.aqua, display: "flex", flex: "0 0 auto", fontSize: 18, fontWeight: 800, height: 36, justifyContent: "center", width: 36 }}>{revealed && isCorrect ? "✓" : String.fromCharCode(65 + index)}</span>
                    {choice}
                  </div>
                </GlassCard>
              </Animated>
            );
          })}
        </div>
        {revealed && scene.quizExplanation && <Animated delay={4}><GlassCard style={{ borderLeft: `6px solid ${colors.aqua}`, marginTop: 26, padding: "20px 24px" }}><p style={{ color: colors.text, fontFamily, fontSize: 21, lineHeight: 1.4, margin: 0 }}><span style={{ color: colors.aqua, fontWeight: 800 }}>WHY:</span> {scene.quizExplanation}</p></GlassCard></Animated>}
      </Animated>
    </div>
  );
}

function RecapLayout({ scene }: { scene: VideoLessonScene }) {
  const takeaways = scene.recapItems?.length ? scene.recapItems.map((item) => item.title) : (scene.bullets || []);
  return (
    <div style={{ display: "grid", gap: 42 }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, margin: "28px 0 16px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0, maxWidth: 1180 }}>{scene.body}</p>
      </Animated>
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(3, 1fr)" }}>
        {takeaways.slice(0, 4).map((bullet, bulletIndex) => (
          <Animated key={bullet} delay={8 + bulletIndex * 5}>
            <GlassCard style={{ minHeight: 260, padding: 34 }}>
              <IconCircle icon={scene.recapItems?.[bulletIndex]?.icon || "checklist"} layoutId="recap" />
              <p style={{ color: colors.text, fontFamily, fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: "30px 0 0" }}>{bullet}</p>
            </GlassCard>
          </Animated>
        ))}
      </div>
    </div>
  );
}

function AvatarLayout({ scene }: { scene: VideoLessonScene }) {
  return (
    <div style={{ alignItems: "center", display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 70, height: "100%" }}>
      <Animated>
        <SectionBadge>{getLabel(scene.layoutId)}</SectionBadge>
        <h1 style={{ color: colors.text, fontFamily, fontSize: 60, fontWeight: 800, lineHeight: 1.05, margin: "32px 0 24px" }}>{scene.title}</h1>
        <p style={{ color: colors.body, fontFamily, fontSize: 22, lineHeight: 1.4, margin: 0 }}>{scene.body || scene.narrationScript}</p>
      </Animated>
      <Animated delay={8}>
        <GlassCard style={{ alignItems: "center", display: "flex", height: 610, justifyContent: "center", padding: 40 }}>
          <div style={{ border: `2px dashed rgba(135,215,210,0.48)`, borderRadius: 26, color: colors.aqua, fontFamily, fontSize: 26, fontWeight: 600, padding: 58, textAlign: "center", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><ReviveIcon name={scene.icon || "video"} layoutId={scene.layoutId} size={150} /></div>
            Avatar Video Clip
            <div style={{ color: colors.body, fontSize: 22, fontWeight: 400, lineHeight: 1.4, marginTop: 24 }}>{scene.narrationScript}</div>
          </div>
        </GlassCard>
      </Animated>
    </div>
  );
}

function renderLayout(scene: VideoLessonScene) {
  switch (scene.layoutId) {
    case "title":
    case "section-divider":
      return <TitleLayout scene={scene} />;
    case "comparison":
      return <ComparisonLayout scene={scene} />;
    case "process":
      return <ProcessLayout scene={scene} />;
    case "example":
      return <PaymentExampleLayout scene={scene} />;
    case "timeline":
      return <TimelineLayout scene={scene} />;
    case "patient-scenario":
      return <ScenarioLayout scene={scene} />;
    case "quiz":
      return <QuizLayout scene={scene} />;
    case "recap":
      return <RecapLayout scene={scene} />;
    case "avatar-intro":
    case "avatar-outro":
      return <AvatarLayout scene={scene} />;
    case "definition":
    default:
      return <DefinitionLayout scene={scene} />;
  }
}

export function ReviveAcademyScene({ scene, index, lesson }: { scene: VideoLessonScene; index: number; lesson: VideoLessonMetadata }) {
  return (
    <div
      style={{
        background:
          `radial-gradient(circle at 82% 18%, rgba(135,215,210,0.16), transparent 22%), radial-gradient(circle at 10% 84%, rgba(135,215,210,0.1), transparent 20%), linear-gradient(135deg, ${colors.background}, #1F262A)`,
        color: colors.text,
        fontFamily,
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <BackgroundMedia scene={scene} />
      <div style={{ border: "2px solid rgba(135,215,210,0.08)", clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)", height: 170, position: "absolute", right: 120, top: 165, width: 170 }} />
      <div style={{ border: "2px solid rgba(135,215,210,0.06)", clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)", height: 230, left: 90, position: "absolute", top: 740, width: 230 }} />
      <LessonHeader lessonTitle={lesson.title} index={index} />
      <div style={{ bottom: 110, left: 70, position: "absolute", right: 70, top: 150, zIndex: 3 }}>{renderLayout(scene)}</div>
      <LessonFooter index={index} total={lesson.scenes.length} />
    </div>
  );
}
