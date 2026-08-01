export const videoLessonLayoutIds = [
  "title",
  "section-divider",
  "definition",
  "comparison",
  "process",
  "timeline",
  "example",
  "patient-scenario",
  "quiz",
  "recap",
  "avatar-intro",
  "avatar-outro",
] as const;

export type VideoLessonLayoutId = (typeof videoLessonLayoutIds)[number];

export type VideoLessonLayoutOption = {
  id: VideoLessonLayoutId;
  name: string;
  description: string;
  thumbnail: string;
};

export const videoLessonLayouts: VideoLessonLayoutOption[] = [
  { id: "title", name: "Title", description: "Course or lesson opening slide.", thumbnail: "hero" },
  { id: "section-divider", name: "Section Divider", description: "Module break or new topic marker.", thumbnail: "divider" },
  { id: "definition", name: "Definition", description: "Term, short definition, and key takeaways.", thumbnail: "definition" },
  { id: "comparison", name: "Comparison", description: "Two-column comparison for plans or concepts.", thumbnail: "columns" },
  { id: "process", name: "Process", description: "Step-by-step workflow.", thumbnail: "steps" },
  { id: "timeline", name: "Timeline", description: "Date, waiting period, or milestone sequence.", thumbnail: "timeline" },
  { id: "example", name: "Example", description: "Calculation or practical example.", thumbnail: "calculation" },
  { id: "patient-scenario", name: "Patient Scenario", description: "Scenario prompt or patient conversation.", thumbnail: "quote" },
  { id: "quiz", name: "Knowledge Check", description: "Question, options, and discussion prompt.", thumbnail: "quiz" },
  { id: "recap", name: "Recap", description: "Summary and key takeaways.", thumbnail: "cards" },
  { id: "avatar-intro", name: "Avatar Intro", description: "Short presenter or HeyGen opening scene.", thumbnail: "avatar" },
  { id: "avatar-outro", name: "Avatar Outro", description: "Short presenter or HeyGen closing scene.", thumbnail: "avatar" },
];

export function isVideoLessonLayoutId(value: unknown): value is VideoLessonLayoutId {
  return typeof value === "string" && videoLessonLayoutIds.includes(value as VideoLessonLayoutId);
}

export function getFallbackLayoutId(index: number): VideoLessonLayoutId {
  if (index === 0) return "title";
  return "definition";
}
