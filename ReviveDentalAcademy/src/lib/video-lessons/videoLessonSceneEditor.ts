import { normalizeScene, type VideoLessonScene } from "./videoLessonTypes";
import { videoLessonLayouts, type VideoLessonLayoutId } from "./videoLessonLayouts";

export type SceneValidationIssue = { field: string; message: string; severity: "warning" | "error" };

const defaults: Record<VideoLessonLayoutId, Partial<VideoLessonScene>> = {
  title: { eyebrow: "Lesson", title: "New Lesson", subtitle: "Add a concise lesson subtitle", body: "Add a concise lesson subtitle", narrationScript: "Introduce the lesson and learning goal.", durationInSeconds: 8 },
  "section-divider": { eyebrow: "New Section", title: "Section Title", subtitle: "What learners will explore next", body: "What learners will explore next", narrationScript: "Introduce the next section.", durationInSeconds: 6 },
  definition: { eyebrow: "Definition", title: "Key Term", body: "Write a clear, learner-friendly definition.", bullets: ["Supporting point one"], narrationScript: "Explain the term and why it matters.", durationInSeconds: 10 },
  comparison: { title: "Compare the Options", comparisonLeftTitle: "Option A", comparisonLeftPoints: ["First point"], comparisonRightTitle: "Option B", comparisonRightPoints: ["First point"], body: "Review the key differences.", narrationScript: "Compare both options and explain the practical difference.", durationInSeconds: 12 },
  process: { title: "How It Works", processSteps: [{ title: "Start", description: "Begin the workflow" }, { title: "Verify", description: "Confirm the details" }, { title: "Document", description: "Record the result" }], bullets: ["Start", "Verify", "Document"], narrationScript: "Walk through each step in order.", durationInSeconds: 12 },
  timeline: { title: "Timeline", timelineMilestones: [{ label: "Start", duration: "Day 1", description: "First milestone" }, { label: "Review", duration: "Next", description: "Second milestone" }, { label: "Complete", duration: "Final", description: "Coverage or process begins" }], bullets: ["Start", "Review", "Complete"], narrationScript: "Explain the timeline and each milestone.", durationInSeconds: 12 },
  example: { title: "Worked Example", exampleRows: [{ label: "Plan amount", value: "$1,000" }, { label: "Patient amount", value: "$100" }], exampleResult: "Explain the final takeaway.", body: "Apply the concept to a practical example.", narrationScript: "Walk through this example and the result.", durationInSeconds: 12 },
  "patient-scenario": { title: "Patient Scenario", patientQuote: "What would you say to this patient?", backgroundDetails: "Add the relevant patient and plan details.", discussionPrompt: "How would you respond?", recommendedResponse: "Reveal the recommended response after discussion.", body: "Add the relevant patient and plan details.", narrationScript: "Present the scenario and invite discussion.", durationInSeconds: 12 },
  quiz: { title: "Knowledge Check", quizQuestion: "Which answer is correct?", quizChoices: ["Choice A", "Choice B", "Choice C"], correctAnswerIndex: 0, quizExplanation: "Explain why the answer is correct.", body: "Which answer is correct?", bullets: ["Choice A", "Choice B", "Choice C"], narrationScript: "Read the question and answer choices.", durationInSeconds: 12 },
  recap: { title: "Key Takeaways", recapItems: [{ title: "Takeaway one", description: "Short supporting detail" }, { title: "Takeaway two", description: "Short supporting detail" }], bullets: ["Takeaway one", "Takeaway two"], narrationScript: "Summarize the most important takeaways.", durationInSeconds: 10 },
  "avatar-intro": { title: "Welcome", avatarEnabled: true, avatarScript: "Welcome learners and introduce the lesson.", narrationScript: "Welcome learners and introduce the lesson.", avatarPlacement: "right", durationInSeconds: 8 },
  "avatar-outro": { title: "You’re Ready", avatarEnabled: true, avatarScript: "Close the lesson and encourage the learner.", narrationScript: "Close the lesson and encourage the learner.", avatarPlacement: "right", durationInSeconds: 8 },
};

export function createSceneForLayout(layoutId: VideoLessonLayoutId, index: number): VideoLessonScene {
  return normalizeScene({ id: `scene_${Date.now()}_${index + 1}`, layoutId, animationStyle: "rise", voiceoverMode: layoutId.startsWith("avatar-") ? "avatar" : "voiceover", ...defaults[layoutId] }, index);
}

export function getLayoutRecommendedUse(layoutId: VideoLessonLayoutId) {
  const uses: Record<VideoLessonLayoutId, string> = {
    title: "Open a lesson with a clear promise.", "section-divider": "Signal a major topic change.", definition: "Teach vocabulary or a core concept.", comparison: "Contrast two plans, choices, or responsibilities.", process: "Explain a repeatable workflow.", timeline: "Show dates, waiting periods, or milestones.", example: "Walk through numbers or a practical application.", "patient-scenario": "Practice patient communication.", quiz: "Check understanding or prompt discussion.", recap: "Close with memorable takeaways.", "avatar-intro": "Use a presenter for a warm opening.", "avatar-outro": "Use a presenter for the final close.",
  };
  return uses[layoutId];
}

export function validateScene(scene: VideoLessonScene): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  if (!scene.title.trim()) issues.push({ field: "title", message: "Add a scene title.", severity: "error" });
  if (!scene.narrationScript.trim() && !scene.lockedAssetKind) issues.push({ field: "narrationScript", message: "Add narration for this scene.", severity: "warning" });
  if (!videoLessonLayouts.some((layout) => layout.id === scene.layoutId)) issues.push({ field: "layoutId", message: "Choose a supported layout.", severity: "error" });
  if (!Number.isFinite(scene.durationInSeconds) || (scene.durationInSeconds || 0) < 4) issues.push({ field: "durationInSeconds", message: "Duration must be at least 4 seconds.", severity: "error" });
  if ((scene.processSteps?.length || 0) > 6) issues.push({ field: "processSteps", message: "Process layouts support up to 6 steps.", severity: "error" });
  if ((scene.quizChoices?.length || 0) > 4) issues.push({ field: "quizChoices", message: "Quiz layouts support up to 4 choices.", severity: "error" });
  if (scene.layoutId === "comparison" && (!scene.comparisonLeftTitle?.trim() || !scene.comparisonRightTitle?.trim())) issues.push({ field: "comparison", message: "Add both comparison sides.", severity: "error" });
  if (scene.avatarEnabled && !(scene.avatarScript || scene.narrationScript).trim()) issues.push({ field: "avatarScript", message: "Avatar-enabled scenes need an avatar script.", severity: "error" });
  if (scene.title.length > 70 || scene.body.length > 260 || (scene.bullets || []).some((item) => item.length > 100)) issues.push({ field: "content", message: "Some on-screen text may overflow. Shorten it or split the scene.", severity: "warning" });
  return issues;
}
