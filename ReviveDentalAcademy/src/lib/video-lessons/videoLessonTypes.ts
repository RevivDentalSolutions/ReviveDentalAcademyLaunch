import { getFallbackLayoutId, isVideoLessonLayoutId, type VideoLessonLayoutId } from "./videoLessonLayouts";

export type VideoLessonScene = {
  id: string;
  layoutId?: VideoLessonLayoutId;
  title: string;
  body: string;
  subtitle?: string;
  eyebrow?: string;
  highlightedWords?: string[];
  icon?: string;
  animationStyle?: "fade" | "rise" | "pan" | "wipe" | "stagger";
  voiceoverMode?: "voiceover" | "avatar";
  avatarEnabled?: boolean;
  avatarScript?: string;
  avatarPlacement?: "left" | "right" | "center";
  comparisonLeftTitle?: string;
  comparisonLeftPoints?: string[];
  comparisonRightTitle?: string;
  comparisonRightPoints?: string[];
  comparisonFooter?: string;
  processSteps?: Array<{ title: string; description?: string; icon?: string }>;
  timelineMilestones?: Array<{ label: string; duration?: string; description?: string }>;
  exampleRows?: Array<{ label: string; value: string }>;
  exampleResult?: string;
  patientQuote?: string;
  backgroundDetails?: string;
  discussionPrompt?: string;
  recommendedResponse?: string;
  quizQuestion?: string;
  quizChoices?: string[];
  correctAnswerIndex?: number;
  quizExplanation?: string;
  answerRevealInSeconds?: number;
  recapItems?: Array<{ icon?: string; title: string; description?: string }>;
  bullets?: string[];
  imageUrl?: string;
  mediaType?: "none" | "image" | "video";
  mediaUrl?: string;
  mediaStoragePath?: string;
  mediaFileName?: string;
  mediaPosition?: "background" | "left" | "right" | "center";
  mediaFit?: "cover" | "contain";
  mediaOpacity?: number;
  textOverlayStrength?: number;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  loopMedia?: boolean;
  heygenJobId?: string;
  heygenStatus?: "idle" | "queued" | "generating" | "completed" | "failed";
  heygenAvatarId?: string;
  heygenVoiceId?: string;
  heygenSourceUrl?: string;
  heygenCompletedMediaUrl?: string;
  heygenCompletedStoragePath?: string;
  heygenError?: string;
  narrationScript: string;
  durationInSeconds?: number;
  lockedAssetKind?: "intro" | "outro";
};

export type VideoLessonTemplateId = "revive-clean" | "revive-split" | "revive-academy";

export type AcademyVideoSettings = {
  introVideoUrl: string;
  introStoragePath?: string;
  introFileName?: string;
  introDetectedDurationInSeconds?: number;
  introDurationInSeconds: number;
  outroVideoUrl: string;
  outroStoragePath?: string;
  outroFileName?: string;
  outroDetectedDurationInSeconds?: number;
  outroDurationInSeconds: number;
  updatedAt?: string;
};

export type VideoLessonMetadata = {
  id: string;
  title: string;
  description?: string;
  templateId: VideoLessonTemplateId;
  scenes: VideoLessonScene[];
  courseId?: string;
  lessonId?: string;
  renderUrl?: string;
  renderStorageBucket?: string;
  renderStoragePath?: string;
  renderStorageRef?: string;
  renderStatus: "draft" | "rendering" | "completed" | "failed";
  academySettings?: AcademyVideoSettings;
  createdAt: string;
  updatedAt: string;
};

export type CourseLessonOption = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
};

export const defaultAcademyVideoSettings: AcademyVideoSettings = {
  introVideoUrl: "",
  introDurationInSeconds: 5,
  outroVideoUrl: "",
  outroDurationInSeconds: 5,
};

export const sampleVideoLesson: VideoLessonMetadata = {
  id: "video_lesson_sample",
  title: "Introduction to Key Terms",
  description: "A short branded training lesson for dental insurance verification teams.",
  templateId: "revive-academy",
  renderStatus: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  scenes: [
    {
      id: "scene_1",
      layoutId: "title",
      title: "Introduction to Key Terms",
      body: "Dental Insurance Verification Bootcamp",
      bullets: ["Deductibles", "Annual maximums", "Waiting periods"],
      narrationScript:
        "Welcome to the Dental Insurance Verification Bootcamp. Today, we will explore key terms and concepts vital for effective insurance verification.",
      durationInSeconds: 8,
    },
    {
      id: "scene_2",
      layoutId: "definition",
      title: "Deductible",
      body: "The amount patients pay before their insurance begins contributing.",
      bullets: ["Patient pays first", "Usually resets annually", "Must be tracked before estimates"],
      narrationScript:
        "First up is the deductible, the amount patients pay before their insurance kicks in.",
      durationInSeconds: 10,
    },
    {
      id: "scene_3",
      layoutId: "definition",
      title: "Annual Maximum",
      body: "The cap on what insurance will pay during a benefit year.",
      bullets: ["Plan payment limit", "Benefit year based", "Affects treatment timing"],
      narrationScript:
        "Next, we have the annual maximum, which is the cap on what insurance will pay in a benefit year.",
      durationInSeconds: 10,
    },
    {
      id: "scene_4",
      layoutId: "timeline",
      title: "Waiting Periods",
      body: "The time patients must wait before certain benefits are available.",
      bullets: ["Enrollment", "Waiting window", "Coverage begins"],
      narrationScript:
        "Finally, let's discuss waiting periods, the time patients must wait before certain benefits are available.",
      durationInSeconds: 10,
    },
    {
      id: "scene_5",
      layoutId: "quiz",
      title: "Interactive Discussion",
      body: "How would you explain these terms during a patient conversation?",
      bullets: ["Deductible", "Annual maximum", "Waiting period"],
      narrationScript:
        "Now it's your turn! Share your understanding of these terms and how they apply to patient interactions.",
      durationInSeconds: 8,
    },
    {
      id: "scene_6",
      layoutId: "recap",
      title: "Summary",
      body: "Understanding key insurance terms helps you verify benefits accurately and communicate clearly.",
      bullets: ["Deductible: patient responsibility first", "Annual maximum: yearly plan limit", "Waiting period: time before coverage"],
      narrationScript:
        "To recap, understanding these key terms is essential for effective insurance verification and patient communication.",
      durationInSeconds: 8,
    },
  ],
};

export type LegacyVideoLessonScene = Partial<VideoLessonScene> & {
  narration?: string;
  duration?: number;
};

export function normalizeScene(scene: LegacyVideoLessonScene, index: number): VideoLessonScene {
  const body = scene.body || scene.subtitle || scene.backgroundDetails || scene.quizQuestion || "";
  const bullets = Array.isArray(scene.bullets) ? scene.bullets.filter(Boolean)
    : scene.processSteps?.map((step) => step.title).filter(Boolean)
      || scene.timelineMilestones?.map((milestone) => milestone.label).filter(Boolean)
      || scene.quizChoices?.filter(Boolean)
      || scene.recapItems?.map((item) => item.title).filter(Boolean)
      || [];
  return {
    id: scene.id || `scene_${index + 1}`,
    layoutId: isVideoLessonLayoutId(scene.layoutId) ? scene.layoutId : getFallbackLayoutId(index),
    title: scene.title || `Scene ${index + 1}`,
    body,
    subtitle: scene.subtitle || body,
    eyebrow: scene.eyebrow || "",
    highlightedWords: Array.isArray(scene.highlightedWords) ? scene.highlightedWords.filter(Boolean) : [],
    icon: scene.icon || "",
    animationStyle: scene.animationStyle || "rise",
    voiceoverMode: scene.voiceoverMode || (scene.avatarEnabled ? "avatar" : "voiceover"),
    avatarEnabled: scene.avatarEnabled ?? scene.layoutId?.startsWith("avatar-") ?? false,
    avatarScript: scene.avatarScript || scene.narrationScript || scene.narration || "",
    avatarPlacement: scene.avatarPlacement || "right",
    comparisonLeftTitle: scene.comparisonLeftTitle || "",
    comparisonLeftPoints: Array.isArray(scene.comparisonLeftPoints) ? scene.comparisonLeftPoints.filter(Boolean) : [],
    comparisonRightTitle: scene.comparisonRightTitle || "",
    comparisonRightPoints: Array.isArray(scene.comparisonRightPoints) ? scene.comparisonRightPoints.filter(Boolean) : [],
    comparisonFooter: scene.comparisonFooter || "",
    processSteps: Array.isArray(scene.processSteps) ? scene.processSteps.slice(0, 6) : [],
    timelineMilestones: Array.isArray(scene.timelineMilestones) ? scene.timelineMilestones.slice(0, 6) : [],
    exampleRows: Array.isArray(scene.exampleRows) ? scene.exampleRows : [],
    exampleResult: scene.exampleResult || "",
    patientQuote: scene.patientQuote || "",
    backgroundDetails: scene.backgroundDetails || "",
    discussionPrompt: scene.discussionPrompt || "",
    recommendedResponse: scene.recommendedResponse || "",
    quizQuestion: scene.quizQuestion || "",
    quizChoices: Array.isArray(scene.quizChoices) ? scene.quizChoices.slice(0, 4) : [],
    correctAnswerIndex: Math.max(0, Number(scene.correctAnswerIndex ?? 0)),
    quizExplanation: scene.quizExplanation || "",
    answerRevealInSeconds: scene.answerRevealInSeconds == null ? undefined : Math.max(0, Number(scene.answerRevealInSeconds)),
    recapItems: Array.isArray(scene.recapItems) ? scene.recapItems.slice(0, 4) : [],
    bullets,
    imageUrl: scene.imageUrl || "",
    mediaType: scene.mediaType || (scene.mediaUrl || scene.imageUrl ? "image" : "none"),
    mediaUrl: scene.mediaUrl || scene.imageUrl || "",
    mediaStoragePath: scene.mediaStoragePath || "",
    mediaFileName: scene.mediaFileName || "",
    mediaPosition: scene.mediaPosition || "right",
    mediaFit: scene.mediaFit || "cover",
    mediaOpacity: Math.min(1, Math.max(0, Number(scene.mediaOpacity ?? 1))),
    textOverlayStrength: Math.min(1, Math.max(0, Number(scene.textOverlayStrength ?? 0.58))),
    backgroundImageUrl: scene.backgroundImageUrl || "",
    backgroundVideoUrl: scene.backgroundVideoUrl || "",
    loopMedia: scene.loopMedia ?? true,
    heygenJobId: scene.heygenJobId || "",
    heygenStatus: scene.heygenStatus || "idle",
    heygenAvatarId: scene.heygenAvatarId || "",
    heygenVoiceId: scene.heygenVoiceId || "",
    heygenSourceUrl: scene.heygenSourceUrl || "",
    heygenCompletedMediaUrl: scene.heygenCompletedMediaUrl || "",
    heygenCompletedStoragePath: scene.heygenCompletedStoragePath || "",
    heygenError: scene.heygenError || "",
    narrationScript: scene.narrationScript || scene.narration || "",
    durationInSeconds: Math.max(4, Number(scene.durationInSeconds ?? scene.duration ?? 8)),
    lockedAssetKind: scene.lockedAssetKind,
  };
}

export function normalizeVideoLesson(input: Partial<VideoLessonMetadata>): VideoLessonMetadata {
  const now = new Date().toISOString();
  const renderStatus = input.renderStatus as string | undefined;
  return {
    id: input.id || `video_lesson_${Date.now()}`,
    title: input.title || "Untitled Video Lesson",
    description: input.description || "",
    templateId: input.templateId || "revive-clean",
    scenes: Array.isArray(input.scenes) ? input.scenes.map(normalizeScene) : [],
    courseId: input.courseId,
    lessonId: input.lessonId,
    renderUrl: input.renderUrl,
    renderStorageBucket: input.renderStorageBucket,
    renderStoragePath: input.renderStoragePath,
    renderStorageRef: input.renderStorageRef,
    renderStatus: renderStatus === "rendered" ? "completed" : input.renderStatus || "draft",
    academySettings: input.academySettings,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}
