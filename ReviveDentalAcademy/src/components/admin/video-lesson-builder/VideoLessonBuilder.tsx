import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import type { AcademyVideoSettings, CourseLessonOption, VideoLessonMetadata, VideoLessonScene } from "../../../lib/video-lessons/videoLessonTypes";
import { defaultAcademyVideoSettings, normalizeScene, normalizeVideoLesson, sampleVideoLesson } from "../../../lib/video-lessons/videoLessonTypes";
import { videoLessonLayouts, type VideoLessonLayoutId } from "../../../lib/video-lessons/videoLessonLayouts";
import { videoLessonTemplates } from "../../../lib/video-lessons/videoLessonTemplates";
import { createSceneForLayout, validateScene } from "../../../lib/video-lessons/videoLessonSceneEditor";
import { generateVideoScenePlan } from "../../../lib/aiCourseBuilder";
import { loadAcademyVideoSettings, saveAcademyVideoSettings, uploadAcademyMediaAsset, uploadAcademyVideoAsset, uploadRemoteAcademyMediaAsset } from "../../../lib/video-lessons/videoLessonSettings";
import { AssetPreviewPanel, SceneLibrary, SceneVisualEditor } from "./SceneVisualEditor";
import { getLessonDurationInFrames, reviveVideoConfig, VideoLessonComposition } from "../../../remotion/VideoLessonComposition";
import "./videoLessonBuilder.css";
import { authenticatedJsonFetch } from "../../../lib/apiClient";

type VideoLessonBuilderProps = {
  initialLesson?: VideoLessonMetadata;
  courseLessons?: CourseLessonOption[];
  onSaveMetadata?: (lesson: VideoLessonMetadata) => Promise<void> | void;
};

type RenderState = "idle" | "rendering" | "completed" | "failed";
const VIDEO_LESSON_DRAFT_KEY = "revive-video-lesson-builder-draft";

type RenderLogEntry = {
  at: string;
  step: string;
  details?: unknown;
};

type UploadState = {
  fileName: string;
  status: "idle" | "selected" | "uploading" | "saved" | "failed";
  message: string;
};

type VideoLessonDraft = {
  lesson: VideoLessonMetadata;
  academySettings: AcademyVideoSettings;
  selectedSceneId: string;
  jsonValue: string;
  restoredFromDraft?: boolean;
};

function getInitialDraft(initialLesson?: VideoLessonMetadata): VideoLessonDraft {
  const fallbackLesson = normalizeVideoLesson(initialLesson || sampleVideoLesson);
  const fallbackDraft = {
    lesson: fallbackLesson,
    academySettings: defaultAcademyVideoSettings,
    selectedSceneId: fallbackLesson.scenes[0]?.id || "",
    jsonValue: JSON.stringify(fallbackLesson, null, 2),
    restoredFromDraft: false,
  };

  if (typeof window === "undefined") return fallbackDraft;

  try {
    const savedDraft = window.localStorage.getItem(VIDEO_LESSON_DRAFT_KEY);
    if (!savedDraft) return fallbackDraft;

    const parsed = JSON.parse(savedDraft) as Partial<VideoLessonDraft>;
    const restoredLesson = normalizeVideoLesson(parsed.lesson || fallbackLesson);
    const restoredSettings = {
      ...defaultAcademyVideoSettings,
      ...(parsed.academySettings || restoredLesson.academySettings || {}),
    };

    return {
      lesson: { ...restoredLesson, academySettings: restoredSettings },
      academySettings: restoredSettings,
      selectedSceneId: parsed.selectedSceneId || restoredLesson.scenes[0]?.id || "",
      jsonValue: typeof parsed.jsonValue === "string" ? parsed.jsonValue : JSON.stringify(restoredLesson, null, 2),
      restoredFromDraft: true,
    };
  } catch {
    return fallbackDraft;
  }
}

export function VideoLessonBuilder({ initialLesson, courseLessons = [], onSaveMetadata }: VideoLessonBuilderProps) {
  const [initialDraft] = useState(() => getInitialDraft(initialLesson));
  const [lesson, setLesson] = useState<VideoLessonMetadata>(initialDraft.lesson);
  const [selectedSceneId, setSelectedSceneId] = useState(initialDraft.selectedSceneId);
  const [jsonValue, setJsonValue] = useState(initialDraft.jsonValue);
  const [jsonError, setJsonError] = useState("");
  const [renderState, setRenderState] = useState<RenderState>(initialDraft.lesson.renderStatus === "completed" ? "completed" : "idle");
  const [message, setMessage] = useState(initialDraft.lesson.id !== sampleVideoLesson.id ? "Restored your last Video Lesson Builder draft." : "");
  const [academySettings, setAcademySettings] = useState<AcademyVideoSettings>(initialDraft.academySettings);
  const [settingsState, setSettingsState] = useState<"idle" | "loading" | "saving" | "uploading" | "failed">("loading");
  const [renderLog, setRenderLog] = useState<RenderLogEntry[]>([]);
  const [introUpload, setIntroUpload] = useState<UploadState>({ fileName: initialDraft.academySettings.introFileName || "", status: "idle", message: "" });
  const [outroUpload, setOutroUpload] = useState<UploadState>({ fileName: initialDraft.academySettings.outroFileName || "", status: "idle", message: "" });
  const [sceneUpload, setSceneUpload] = useState<UploadState>({ fileName: "", status: "idle", message: "" });
  const [testingVideo, setTestingVideo] = useState<"intro" | "outro" | "">("");
  const [sceneLibraryOpen, setSceneLibraryOpen] = useState(false);
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"scene" | "lesson">("scene");
  const [draftStatus, setDraftStatus] = useState<"saved" | "saving">("saved");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorNarration, setGeneratorNarration] = useState("");
  const [generatorTitle, setGeneratorTitle] = useState("");
  const [generatorTarget, setGeneratorTarget] = useState(6);
  const [generatorQuiz, setGeneratorQuiz] = useState(true);
  const [generatorAvatarIntro, setGeneratorAvatarIntro] = useState(false);
  const [generatorAvatarOutro, setGeneratorAvatarOutro] = useState(false);
  const [generatorState, setGeneratorState] = useState<"idle" | "loading" | "review" | "error">("idle");
  const [generatedScenes, setGeneratedScenes] = useState<VideoLessonScene[]>([]);

  const selectedSceneIndex = Math.max(
    0,
    lesson.scenes.findIndex((scene) => scene.id === selectedSceneId),
  );
  const selectedScene = lesson.scenes[selectedSceneIndex] || lesson.scenes[0];
  const selectedSceneIsLocked = Boolean(selectedScene?.lockedAssetKind);

  const totalDuration = useMemo(() => {
    const sceneSeconds = lesson.scenes
      .filter((scene) => !scene.lockedAssetKind)
      .reduce((sum, scene) => sum + Math.max(4, scene.durationInSeconds || 8), 0);
    const introSeconds = academySettings.introVideoUrl ? academySettings.introDurationInSeconds : 0;
    const outroSeconds = academySettings.outroVideoUrl ? academySettings.outroDurationInSeconds : 0;
    return sceneSeconds + introSeconds + outroSeconds;
  }, [academySettings, lesson.scenes]);

  useEffect(() => {
    let isMounted = true;
    loadAcademyVideoSettings()
      .then((settings) => {
        if (isMounted) {
          setAcademySettings(settings);
          setLesson((current) => normalizeVideoLesson({ ...current, academySettings: settings }));
          setIntroUpload((current) => ({
            ...current,
            fileName: settings.introFileName || settings.introStoragePath || current.fileName,
            status: settings.introVideoUrl ? "saved" : "idle",
            message: settings.introVideoUrl ? "Intro loaded" : "",
          }));
          setOutroUpload((current) => ({
            ...current,
            fileName: settings.outroFileName || settings.outroStoragePath || current.fileName,
            status: settings.outroVideoUrl ? "saved" : "idle",
            message: settings.outroVideoUrl ? "Outro loaded" : "",
          }));
          if (settings.introVideoUrl || settings.outroVideoUrl) {
            setMessage([
              settings.introVideoUrl ? "Intro loaded" : "",
              settings.outroVideoUrl ? "Outro loaded" : "",
            ].filter(Boolean).join(" and "));
          }
          setSettingsState("idle");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSettingsState("failed");
          setMessage(error instanceof Error ? error.message : "Unable to load Academy video settings.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      VIDEO_LESSON_DRAFT_KEY,
      JSON.stringify({
        lesson: {
          ...lesson,
          academySettings,
        },
        academySettings,
        selectedSceneId,
        jsonValue,
      })
    );
    const timer = window.setTimeout(() => setDraftStatus("saved"), 350);
    return () => window.clearTimeout(timer);
  }, [academySettings, jsonValue, lesson, selectedSceneId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (draftStatus === "saving") { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftStatus]);

  useEffect(() => {
    if (academySettings.introVideoUrl && !academySettings.introDetectedDurationInSeconds) {
      void detectAndApplyVideoDuration("intro", academySettings.introVideoUrl);
    }
    if (academySettings.outroVideoUrl && !academySettings.outroDetectedDurationInSeconds) {
      void detectAndApplyVideoDuration("outro", academySettings.outroVideoUrl);
    }
  }, [academySettings.introVideoUrl, academySettings.introDetectedDurationInSeconds, academySettings.outroVideoUrl, academySettings.outroDetectedDurationInSeconds]);

  function commitLesson(nextLesson: VideoLessonMetadata) {
    setDraftStatus("saving");
    const normalized = normalizeVideoLesson(nextLesson);
    setLesson(normalized);
    setJsonValue(JSON.stringify(normalized, null, 2));
    setJsonError("");
  }

  function addRenderLog(step: string, details?: unknown) {
    const entry = {
      at: new Date().toISOString(),
      step,
      details,
    };
    setRenderLog((current) => [...current, entry]);
    console.log(`[VideoLessonBuilder] ${step}`, details || "");
  }

  function appendServerRenderLog(entries: RenderLogEntry[] | undefined) {
    if (!Array.isArray(entries) || entries.length === 0) return;
    setRenderLog((current) => [...current, ...entries]);
  }

  function describeRenderDetails(details: unknown) {
    if (!details) return "";
    if (typeof details === "string") return details;
    try {
      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  }

  function updateLesson(patch: Partial<VideoLessonMetadata>) {
    commitLesson({ ...lesson, ...patch, updatedAt: new Date().toISOString() });
  }

  function updateAcademySettings(patch: Partial<AcademyVideoSettings>) {
    setAcademySettings((current) => {
      const next = { ...current, ...patch };
      setLesson((currentLesson) => normalizeVideoLesson({ ...currentLesson, academySettings: next }));
      return next;
    });
  }

  function formatSeconds(seconds?: number) {
    if (!seconds || !Number.isFinite(seconds)) return "Not detected";
    return `${Math.round(seconds)}s`;
  }

  function detectVideoDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        video.removeAttribute("src");
        video.load();
        if (Number.isFinite(duration) && duration > 0) resolve(duration);
        else reject(new Error("Unable to detect MP4 duration."));
      };
      video.onerror = () => reject(new Error("Unable to load MP4 metadata for duration detection."));
      video.src = url;
    });
  }

  async function detectAndApplyVideoDuration(kind: "intro" | "outro", url: string, forceExportDuration = false) {
    if (!url) return;
    try {
      const detectedDuration = await detectVideoDuration(url);
      setAcademySettings((current) => {
        const urlKey = kind === "intro" ? "introVideoUrl" : "outroVideoUrl";
        const durationKey = kind === "intro" ? "introDurationInSeconds" : "outroDurationInSeconds";
        const detectedKey = kind === "intro" ? "introDetectedDurationInSeconds" : "outroDetectedDurationInSeconds";
        if (current[urlKey] !== url) return current;
        if (!forceExportDuration && current[detectedKey]) return current;
        const currentExportDuration = Number(current[durationKey]);
        const shouldUseDetected = forceExportDuration || !currentExportDuration || currentExportDuration === defaultAcademyVideoSettings[durationKey];
        const next = {
          ...current,
          [detectedKey]: detectedDuration,
          ...(shouldUseDetected ? { [durationKey]: detectedDuration } : {}),
        };
        setLesson((currentLesson) => normalizeVideoLesson({ ...currentLesson, academySettings: next }));
        return next;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to detect MP4 duration.");
    }
  }

  function updateScene(sceneId: string, patch: Partial<VideoLessonScene>) {
    commitLesson({
      ...lesson,
      scenes: lesson.scenes.map((scene, index) =>
        scene.id === sceneId && !scene.lockedAssetKind ? normalizeScene({ ...scene, ...patch }, index) : scene,
      ),
    });
  }

  async function readErrorMessage(response: Response) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      appendServerRenderLog(parsed.renderLog);
      return [parsed.error, parsed.details, parsed.rawError?.message].filter(Boolean).map(describeRenderDetails).join(" ");
    } catch {
      return text || `Request failed with status ${response.status}.`;
    }
  }

  function addScene(layoutId: VideoLessonLayoutId = "definition") {
    const nextScene = createSceneForLayout(layoutId, lesson.scenes.length);
    commitLesson({ ...lesson, scenes: [...lesson.scenes, nextScene] });
    setSelectedSceneId(nextScene.id);
    setSceneLibraryOpen(false);
  }

  function moveScene(sceneId: string, direction: -1 | 1) {
    const index = lesson.scenes.findIndex((scene) => scene.id === sceneId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= lesson.scenes.length) return;
    const scenes = [...lesson.scenes];
    [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
    commitLesson({ ...lesson, scenes });
  }

  function duplicateScene(sceneId: string) {
    const index = lesson.scenes.findIndex((scene) => scene.id === sceneId);
    if (index < 0 || lesson.scenes[index].lockedAssetKind) return;
    const copy = normalizeScene({ ...lesson.scenes[index], id: `scene_${Date.now()}_copy`, title: `${lesson.scenes[index].title} Copy` }, index + 1);
    const scenes = [...lesson.scenes]; scenes.splice(index + 1, 0, copy);
    commitLesson({ ...lesson, scenes }); setSelectedSceneId(copy.id);
  }

  function getLayoutName(layoutId?: VideoLessonLayoutId) {
    return videoLessonLayouts.find((layout) => layout.id === layoutId)?.name || "Definition";
  }

  function loadSampleKeyTermsLesson() {
    const freshLesson = normalizeVideoLesson({
      ...sampleVideoLesson,
      academySettings,
      id: `video_lesson_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      renderStatus: "draft",
    });
    commitLesson(freshLesson);
    setSelectedSceneId(freshLesson.scenes[0]?.id || "");
    setRenderState("idle");
    setMessage("Loaded the Introduction to Key Terms sample lesson.");
  }

  function startFromCourseLesson() {
    const option = courseLessons.find((item) => item.lessonId === lesson.lessonId);
    if (!option) {
      setMessage("Choose a course lesson first, then start its video.");
      return;
    }
    const source = (option.lessonContent || "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/^#{1,6}\s+(?:Training Script|Video Script|Storyboard|Suggested Visuals).*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    updateLesson({ courseId: option.courseId, lessonId: option.lessonId, title: option.lessonTitle, description: source.slice(0, 220) });
    setGeneratorTitle(option.lessonTitle);
    setGeneratorNarration(source);
    setGeneratorTarget(7);
    setGeneratorQuiz(true);
    setGeneratorOpen(true);
    setGeneratorState("idle");
    setMessage(source ? `Loaded ${option.lessonTitle}. Generate a scene plan when you are ready.` : `Attached ${option.lessonTitle}. Add its narration before generating scenes.`);
  }

  function getIntroPlaceholder(): VideoLessonScene {
    return normalizeScene({
      id: "global_intro_placeholder",
      title: "Global Intro Video",
      body: academySettings.introVideoUrl
        ? "This locked placeholder shows the saved Academy intro. The MP4 is prepended during export."
        : "No saved intro URL is loaded yet.",
      bullets: academySettings.introVideoUrl ? ["Intro loaded from Academy Settings"] : ["Load or save an intro URL first"],
      narrationScript: "",
      durationInSeconds: academySettings.introDurationInSeconds,
      lockedAssetKind: "intro",
    }, 0);
  }

  function getOutroPlaceholder(): VideoLessonScene {
    return normalizeScene({
      id: "global_outro_placeholder",
      title: "Global Outro Video",
      body: academySettings.outroVideoUrl
        ? "This locked placeholder shows the saved Academy outro. The MP4 is appended during export."
        : "No saved outro URL is loaded yet.",
      bullets: academySettings.outroVideoUrl ? ["Outro loaded from Academy Settings"] : ["Load or save an outro URL first"],
      narrationScript: "",
      durationInSeconds: academySettings.outroDurationInSeconds,
      lockedAssetKind: "outro",
    }, lesson.scenes.length);
  }

  function addIntroPlaceholder() {
    if (lesson.scenes.some((scene) => scene.lockedAssetKind === "intro")) {
      setMessage("Intro placeholder is already in the scene list.");
      return;
    }

    const placeholder = getIntroPlaceholder();
    commitLesson({ ...lesson, scenes: [placeholder, ...lesson.scenes] });
    setSelectedSceneId(placeholder.id);
  }

  function addOutroPlaceholder() {
    if (lesson.scenes.some((scene) => scene.lockedAssetKind === "outro")) {
      setMessage("Outro placeholder is already in the scene list.");
      return;
    }

    const placeholder = getOutroPlaceholder();
    commitLesson({ ...lesson, scenes: [...lesson.scenes, placeholder] });
    setSelectedSceneId(placeholder.id);
  }

  function removeScene(sceneId: string) {
    if (!window.confirm("Delete this scene? This can be undone only by reloading the last saved draft.")) return;
    const nextScenes = lesson.scenes.filter((scene) => scene.id !== sceneId);
    commitLesson({ ...lesson, scenes: nextScenes });
    setSelectedSceneId(nextScenes[0]?.id || "");
  }

  async function generateScenePlan() {
    if (!generatorNarration.trim()) { setMessage("Paste narration before generating a scene plan."); return; }
    setGeneratorState("loading");
    const result = await generateVideoScenePlan({ lessonTitle: generatorTitle || lesson.title, narration: generatorNarration, targetSceneCount: generatorTarget, includeQuiz: generatorQuiz, includeAvatarIntro: generatorAvatarIntro, includeAvatarOutro: generatorAvatarOutro, style: "revive-academy" });
    if (!result.success || !result.lesson) { setGeneratorState("error"); setMessage(result.error || "Unable to generate scene plan."); return; }
    setGeneratedScenes(normalizeVideoLesson(result.lesson).scenes); setGeneratorState("review");
  }

  async function generateNarrationAudio() {
    if (!lesson.scenes.length) {
      setMessage("Add at least one scene before generating narration.");
      return;
    }

    setRenderState("rendering");
    setMessage("Generating narrated MP3 tracks for each scene...");
    try {
      const response = await authenticatedJsonFetch("/api/admin/video-lessons/generate-narration", {
        method: "POST",
        body: JSON.stringify({ lesson: { ...lesson, academySettings } }),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response));
      const result = await response.json() as { lesson?: VideoLessonMetadata; voice?: string };
      if (!result.lesson?.scenes?.length) throw new Error("Narration completed but no audio tracks were returned.");
      const narratedLesson = normalizeVideoLesson({ ...lesson, ...result.lesson, academySettings, renderStatus: "draft" });
      commitLesson(narratedLesson);
      setRenderState("idle");
      setMessage(`Narration is ready in ${result.voice || "the selected"} voice. Review the preview, then export the MP4.`);
    } catch (error) {
      setRenderState("failed");
      setMessage(error instanceof Error ? error.message : "Narration generation failed.");
    }
  }

  function applyGeneratedScenes() {
    const next = normalizeVideoLesson({ ...lesson, title: generatorTitle || lesson.title, templateId: "revive-academy", scenes: generatedScenes, renderStatus: "draft" });
    commitLesson(next); setSelectedSceneId(next.scenes[0]?.id || ""); setGeneratorOpen(false); setGeneratorState("idle"); setMessage("Generated scene plan applied. Review each scene before export.");
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonValue) as Partial<VideoLessonMetadata>;
      const normalized = normalizeVideoLesson(parsed);
      commitLesson(normalized);
      setSelectedSceneId(normalized.scenes[0]?.id || "");
      setMessage("Structured lesson JSON applied.");
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  function clearDraft() {
    const freshLesson = normalizeVideoLesson(sampleVideoLesson);
    window.localStorage.removeItem(VIDEO_LESSON_DRAFT_KEY);
    setLesson(freshLesson);
    setSelectedSceneId(freshLesson.scenes[0]?.id || "");
    setJsonValue(JSON.stringify(freshLesson, null, 2));
    setJsonError("");
    setRenderState("idle");
    setMessage("Draft cleared. Starting a fresh video lesson.");
  }

  async function saveMetadata() {
    await onSaveMetadata?.({ ...lesson, academySettings });
    setMessage("Video lesson metadata saved to the course lesson system.");
  }

  async function saveSettings() {
    setSettingsState("saving");
    try {
      const nextSettings = {
        ...academySettings,
        introDurationInSeconds: Number(academySettings.introDurationInSeconds),
        outroDurationInSeconds: Number(academySettings.outroDurationInSeconds),
      };
      if (nextSettings.introDurationInSeconds < 1 || !Number.isFinite(nextSettings.introDurationInSeconds)) {
        throw new Error("Intro duration must be at least 1 second.");
      }
      if (nextSettings.outroDurationInSeconds < 1 || !Number.isFinite(nextSettings.outroDurationInSeconds)) {
        throw new Error("Outro duration must be at least 1 second.");
      }
      const savedSettings = await saveAcademyVideoSettings(nextSettings);
      setAcademySettings(savedSettings);
      commitLesson({ ...lesson, academySettings: savedSettings });
      setSettingsState("idle");
      setMessage("Academy intro and outro settings saved.");
    } catch (error) {
      setSettingsState("failed");
      setMessage(error instanceof Error ? error.message : "Unable to save Academy video settings.");
    }
  }

  async function loadSavedIntroOutro() {
    setSettingsState("loading");
    try {
      const savedSettings = await loadAcademyVideoSettings();
      setAcademySettings(savedSettings);
      commitLesson({ ...lesson, academySettings: savedSettings });
      setSettingsState("idle");
      setMessage([
        savedSettings.introVideoUrl ? "Intro loaded" : "No saved intro found",
        savedSettings.outroVideoUrl ? "Outro loaded" : "No saved outro found",
      ].join(". "));
    } catch (error) {
      setSettingsState("failed");
      setMessage(error instanceof Error ? error.message : "Unable to load saved intro/outro settings.");
    }
  }

  async function uploadVideo(kind: "intro" | "outro", file: File | null) {
    if (!file) return;
    const setUploadState = kind === "intro" ? setIntroUpload : setOutroUpload;
    setUploadState({ fileName: file.name, status: "selected", message: `${file.name} selected.` });
    setSettingsState("uploading");
    setMessage(`${kind === "intro" ? "Intro" : "Outro"} upload started...`);
    console.log("[VideoLessonBuilder] Upload started:", { kind, fileName: file.name, size: file.size });
    try {
      setUploadState({ fileName: file.name, status: "uploading", message: "Uploading to academy-media..." });
      const upload = await uploadAcademyVideoAsset(kind, file);
      const detectedDuration = await detectVideoDuration(upload.publicUrl);
      const nextSettings = {
        ...academySettings,
        [kind === "intro" ? "introVideoUrl" : "outroVideoUrl"]: upload.publicUrl,
        [kind === "intro" ? "introStoragePath" : "outroStoragePath"]: upload.storagePath,
        [kind === "intro" ? "introFileName" : "outroFileName"]: upload.fileName,
        [kind === "intro" ? "introDetectedDurationInSeconds" : "outroDetectedDurationInSeconds"]: detectedDuration,
        [kind === "intro" ? "introDurationInSeconds" : "outroDurationInSeconds"]: detectedDuration,
      };
      const savedSettings = await saveAcademyVideoSettings(nextSettings);
      setAcademySettings(savedSettings);
      commitLesson({ ...lesson, academySettings: savedSettings });
      setSettingsState("idle");
      setUploadState({ fileName: upload.fileName, status: "saved", message: `${kind === "intro" ? "Intro" : "Outro"} uploaded and saved.` });
      console.log("[VideoLessonBuilder] Upload completed:", { kind, videoUrl: upload.publicUrl, storagePath: upload.storagePath });
      setMessage(`${kind === "intro" ? "Intro" : "Outro"} uploaded and saved.`);
    } catch (error) {
      setSettingsState("failed");
      const errorMessage = error instanceof Error ? error.message : "Unable to upload MP4.";
      setUploadState({ fileName: file.name, status: "failed", message: errorMessage });
      setMessage(errorMessage);
    }
  }

  async function uploadSceneMedia(file: File | null) {
    if (!file || !selectedScene || selectedSceneIsLocked) return;
    const mediaType = file.type.startsWith("video/") || /\.mp4$/i.test(file.name) ? "video" : "image";
    const courseId = lesson.courseId || "unassigned-course";
    const lessonId = lesson.lessonId || lesson.id;
    setSceneUpload({ fileName: file.name, status: "uploading", message: "Uploading scene media..." });
    try {
      const upload = await uploadAcademyMediaAsset(`course-media/${courseId}/${lessonId}/${selectedScene.id}`, file, ["image", "video"]);
      updateScene(selectedScene.id, {
        mediaType,
        mediaUrl: upload.publicUrl,
        mediaStoragePath: upload.storagePath,
        mediaFileName: upload.fileName,
        imageUrl: mediaType === "image" ? upload.publicUrl : selectedScene.imageUrl,
      });
      setSceneUpload({ fileName: upload.fileName, status: "saved", message: "Scene media uploaded and saved." });
      setMessage("Scene media uploaded and saved.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to upload scene media.";
      setSceneUpload({ fileName: file.name, status: "failed", message: errorMessage });
      setMessage(errorMessage);
    }
  }

  function prepareHeyGenAvatarClip() {
    if (!selectedScene || selectedSceneIsLocked) return;
    if (!selectedScene.narrationScript.trim()) {
      setMessage("Add narrationScript before generating a HeyGen avatar clip.");
      updateScene(selectedScene.id, {
        heygenStatus: "failed",
        heygenError: "Missing narrationScript.",
      });
      return;
    }
    if (!selectedScene.heygenAvatarId?.trim() || !selectedScene.heygenVoiceId?.trim()) {
      setMessage("Select or enter Jessica avatar and voice IDs before generating a HeyGen avatar clip.");
      updateScene(selectedScene.id, {
        heygenStatus: "failed",
        heygenError: "Missing Jessica avatar or voice ID.",
      });
      return;
    }

    const jobId = `heygen_${selectedScene.id}_${Date.now()}`;
    updateScene(selectedScene.id, {
      heygenJobId: jobId,
      heygenStatus: "queued",
      heygenError: "",
    });
    addRenderLog("HeyGen avatar clip queued", {
      jobId,
      sceneId: selectedScene.id,
      avatarId: selectedScene.heygenAvatarId,
      voiceId: selectedScene.heygenVoiceId,
      scriptLength: selectedScene.narrationScript.length,
    });
    setMessage("HeyGen request prepared. Use the authenticated HeyGen OAuth connector to generate this scene, then import the completed MP4 URL below.");
  }

  async function importHeyGenCompletedClip() {
    if (!selectedScene || selectedSceneIsLocked) return;
    if (!selectedScene.heygenSourceUrl?.trim()) {
      setMessage("Paste the completed HeyGen MP4 URL before importing.");
      updateScene(selectedScene.id, {
        heygenStatus: "failed",
        heygenError: "Missing completed HeyGen MP4 URL.",
      });
      return;
    }

    const courseId = lesson.courseId || "unassigned-course";
    const lessonId = lesson.lessonId || lesson.id;
    const fileName = `heygen-${selectedScene.id}.mp4`;
    updateScene(selectedScene.id, {
      heygenStatus: "generating",
      heygenError: "",
    });
    addRenderLog("HeyGen completed URL import started", {
      sceneId: selectedScene.id,
      sourceUrl: selectedScene.heygenSourceUrl,
    });

    try {
      const upload = await uploadRemoteAcademyMediaAsset(
        `course-media/${courseId}/${lessonId}/${selectedScene.id}`,
        selectedScene.heygenSourceUrl,
        fileName,
        ["video"],
      );
      updateScene(selectedScene.id, {
        mediaType: "video",
        mediaUrl: upload.publicUrl,
        mediaStoragePath: upload.storagePath,
        mediaFileName: upload.fileName,
        mediaPosition: selectedScene.mediaPosition || "right",
        mediaFit: selectedScene.mediaFit || "cover",
        loopMedia: selectedScene.loopMedia ?? false,
        heygenStatus: "completed",
        heygenCompletedMediaUrl: upload.publicUrl,
        heygenCompletedStoragePath: upload.storagePath,
        heygenError: "",
      });
      addRenderLog("HeyGen MP4 uploaded to academy-media", {
        sceneId: selectedScene.id,
        storagePath: upload.storagePath,
        mediaUrl: upload.publicUrl,
      });
      setMessage("HeyGen avatar clip imported, uploaded, and assigned as this scene video media.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to import completed HeyGen MP4.";
      updateScene(selectedScene.id, {
        heygenStatus: "failed",
        heygenError: errorMessage,
      });
      addRenderLog("HeyGen MP4 import failed", errorMessage);
      setMessage(errorMessage);
    }
  }

  async function renderMp4() {
    const validationErrors = lesson.scenes.flatMap(validateScene).filter((issue) => issue.severity === "error");
    if (validationErrors.length) {
      setMessage(`Fix ${validationErrors.length} scene validation error${validationErrors.length === 1 ? "" : "s"} before export.`);
      return;
    }
    setRenderLog([]);
    addRenderLog("Export button clicked", {
      endpoint: "/api/admin/video-lessons/render",
      sceneCount: lesson.scenes.filter((scene) => !scene.lockedAssetKind).length,
      introLoaded: Boolean(academySettings.introVideoUrl),
      outroLoaded: Boolean(academySettings.outroVideoUrl),
    });
    setRenderState("rendering");
    const renderingLesson = {
      ...lesson,
      academySettings,
      renderStatus: "rendering" as const,
    };
    const exportLesson = {
      ...renderingLesson,
      scenes: renderingLesson.scenes.filter((scene) => !scene.lockedAssetKind),
    };
    commitLesson(renderingLesson);
    setMessage("Render started. Exporting MP4...");

    try {
      addRenderLog("Render request sent", {
        endpoint: "/api/admin/video-lessons/render",
        method: "POST",
      });
      const response = await authenticatedJsonFetch("/api/admin/video-lessons/render", {
        method: "POST",
        body: JSON.stringify({
          lesson: {
            ...exportLesson,
            academySettings,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const result = (await response.json()) as {
        renderUrl: string;
        renderStorageBucket?: string;
        renderStoragePath?: string;
        renderStorageRef?: string;
        lesson?: VideoLessonMetadata;
        renderLog?: RenderLogEntry[];
      };
      appendServerRenderLog(result.renderLog);
      if (!result.renderUrl) {
        throw new Error("Render completed but no final MP4 URL was returned.");
      }

      const completedLesson = normalizeVideoLesson({
        ...renderingLesson,
        ...(result.lesson ? { ...result.lesson, scenes: renderingLesson.scenes } : {}),
        academySettings,
        renderUrl: result.renderUrl,
        renderStorageBucket: result.renderStorageBucket || result.lesson?.renderStorageBucket,
        renderStoragePath: result.renderStoragePath || result.lesson?.renderStoragePath,
        renderStorageRef: result.renderStorageRef || result.lesson?.renderStorageRef,
        renderStatus: "completed",
      });
      commitLesson(completedLesson);
      setRenderState("completed");
      addRenderLog("Builder state updated with renderUrl", {
        renderUrl: result.renderUrl,
        renderStoragePath: completedLesson.renderStoragePath,
      });
      setMessage("Render completed. Final MP4 URL is ready.");

      if (completedLesson.lessonId && completedLesson.courseId) {
        setMessage("Render completed. Saving final MP4 URL to the selected lesson...");
        addRenderLog("Lesson metadata save started", {
          lessonId: completedLesson.lessonId,
          renderUrl: completedLesson.renderUrl,
        });
        await onSaveMetadata?.(completedLesson);
        await attachToCourseLesson(completedLesson);
      }
    } catch (error) {
      setRenderState("failed");
      console.error("[VideoLessonBuilder] Render failed:", error);
      setMessage(error instanceof Error ? error.message : "MP4 render failed.");
    }
  }

  async function attachToCourseLesson(lessonToAttach = lesson) {
    if (!lessonToAttach.courseId || !lessonToAttach.lessonId) {
      setMessage("Choose a course lesson before attaching the video.");
      return;
    }

    if (!lessonToAttach.renderUrl) {
      setMessage("No final MP4 URL exists. Export MP4 before attaching it to a lesson.");
      addRenderLog("Lesson update skipped", "No final MP4 URL exists.");
      return;
    }

    setMessage("Attaching final MP4 URL to the selected lesson...");
    addRenderLog("Lesson update request sent", {
      endpoint: "/api/admin/video-lessons/attach",
      lessonId: lessonToAttach.lessonId,
      renderUrl: lessonToAttach.renderUrl,
      renderStoragePath: lessonToAttach.renderStoragePath,
    });

    const response = await authenticatedJsonFetch("/api/admin/video-lessons/attach", {
      method: "POST",
      body: JSON.stringify({ lesson: lessonToAttach }),
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      addRenderLog("Lesson update failed", errorMessage);
      setMessage(errorMessage);
      return;
    }

    const result = await response.json() as { renderLog?: RenderLogEntry[] };
    appendServerRenderLog(result.renderLog);
    addRenderLog("Lesson updated", {
      lessonId: lessonToAttach.lessonId,
      renderUrl: lessonToAttach.renderUrl,
    });
    setMessage("Lesson attached. The course player will now use the exported MP4.");
  }

  return (
    <section className="vlb-shell" aria-label="Video Lesson Builder">
      <header className="vlb-topbar">
        <div>
          <p className="vlb-eyebrow">Admin</p>
          <h1>Video Lesson Builder</h1>
        </div>
        <div className="vlb-actions">
          <span className="vlb-autosave-badge">{draftStatus === "saving" ? "Saving draft…" : "Draft saved"}</span>
          <button type="button" onClick={() => setGeneratorOpen((open) => !open)}>Generate Scenes</button>
          {import.meta.env.DEV && <button type="button" onClick={() => setAssetPreviewOpen(true)}>Asset Preview</button>}
          <button type="button" onClick={loadSampleKeyTermsLesson}>
            Load Key Terms Sample
          </button>
          <button type="button" onClick={clearDraft}>
            Clear Draft
          </button>
          <button type="button" onClick={saveMetadata}>
            Save Metadata
          </button>
          <button type="button" onClick={generateNarrationAudio} disabled={renderState === "rendering"}>
            Generate Narration Audio
          </button>
          <button type="button" className="vlb-primary" onClick={renderMp4} disabled={renderState === "rendering"}>
            {renderState === "rendering" ? "Rendering..." : "Export MP4"}
          </button>
          {lesson.renderUrl && (
            <a className="vlb-download" href={lesson.renderUrl} download>
              Download
            </a>
          )}
        </div>
      </header>

      {generatorOpen && <section className="vlb-panel vlb-generator">
        <div className="vlb-panel-title"><div><p className="vlb-eyebrow">AI-assisted workflow</p><h2>Generate Scenes from Narration</h2></div><button type="button" onClick={() => { setGeneratorOpen(false); setGeneratorState("idle"); }}>Cancel</button></div>
        {generatorState !== "review" ? <><div className="vlb-form-grid"><label>Optional lesson title<input value={generatorTitle} onChange={(event) => setGeneratorTitle(event.target.value)} placeholder={lesson.title} /></label><label>Target scenes<input type="number" min={2} max={16} value={generatorTarget} onChange={(event) => setGeneratorTarget(Number(event.target.value))} /></label><label>Style<select value="revive-academy" disabled><option value="revive-academy">Revive Academy</option></select></label></div><label>Narration<textarea className="vlb-generator-narration" value={generatorNarration} onChange={(event) => setGeneratorNarration(event.target.value)} placeholder="Paste the complete lesson narration…" /></label><div className="vlb-generator-options"><label><input type="checkbox" checked={generatorQuiz} onChange={(event) => setGeneratorQuiz(event.target.checked)} /> Include quiz</label><label><input type="checkbox" checked={generatorAvatarIntro} onChange={(event) => setGeneratorAvatarIntro(event.target.checked)} /> Include avatar intro</label><label><input type="checkbox" checked={generatorAvatarOutro} onChange={(event) => setGeneratorAvatarOutro(event.target.checked)} /> Include avatar outro</label></div><button type="button" className="vlb-primary" disabled={generatorState === "loading"} onClick={generateScenePlan}>{generatorState === "loading" ? "Generating…" : "Generate Scene Plan"}</button></> : <><div className="vlb-plan-list">{generatedScenes.map((scene, index) => <article key={scene.id}><span>{index + 1}</span><div><strong>{scene.title}</strong><small>{getLayoutName(scene.layoutId)} · {scene.durationInSeconds}s · {scene.avatarEnabled ? "Avatar" : "Voiceover"}</small><p>{scene.narrationScript.slice(0, 140)}{scene.narrationScript.length > 140 ? "…" : ""}</p></div><div><button type="button" disabled={index === 0} onClick={() => setGeneratedScenes((current) => { const next=[...current]; [next[index-1],next[index]]=[next[index],next[index-1]]; return next; })}>↑</button><button type="button" disabled={index === generatedScenes.length - 1} onClick={() => setGeneratedScenes((current) => { const next=[...current]; [next[index+1],next[index]]=[next[index],next[index+1]]; return next; })}>↓</button><button type="button" onClick={() => setGeneratedScenes((current) => current.filter((item) => item.id !== scene.id))}>Delete</button></div></article>)}</div><div className="vlb-inline-actions"><button type="button" className="vlb-primary" onClick={applyGeneratedScenes}>Apply All Scenes</button><button type="button" onClick={generateScenePlan}>Regenerate</button><button type="button" onClick={() => { setGeneratorOpen(false); setGeneratorState("idle"); }}>Cancel</button></div></>}
      </section>}

      <div className="vlb-grid">
        <aside className="vlb-panel vlb-scenes">
          <div className="vlb-panel-title">
            <h2>Scenes</h2>
            <button type="button" onClick={() => setSceneLibraryOpen(true)}>
              Add Scene
            </button>
          </div>
          <div className="vlb-scene-tools">
            <button type="button" onClick={addIntroPlaceholder}>Add Intro as First Scene</button>
            <button type="button" onClick={addOutroPlaceholder}>Add Outro as Last Scene</button>
          </div>
          <div className="vlb-scene-list">
            {lesson.scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`${scene.id === selectedScene?.id ? "is-active" : ""} ${scene.lockedAssetKind ? "is-locked" : ""}`}
              >
                <button type="button" className="vlb-scene-select" onClick={() => setSelectedSceneId(scene.id)}><span>{String(index + 1).padStart(2, "0")}</span>{scene.title}<small>{getLayoutName(scene.layoutId)}</small>{scene.lockedAssetKind && <em>Locked {scene.lockedAssetKind}</em>}</button>
                {!scene.lockedAssetKind && <div className="vlb-scene-row-actions"><button type="button" disabled={index === 0} onClick={() => moveScene(scene.id, -1)}>↑</button><button type="button" disabled={index === lesson.scenes.length - 1} onClick={() => moveScene(scene.id, 1)}>↓</button><button type="button" onClick={() => duplicateScene(scene.id)}>Duplicate</button></div>}
              </div>
            ))}
          </div>
        </aside>

        <main className="vlb-panel vlb-editor">
          <div className="vlb-fields">
            <div className="vlb-settings-card">
              <div className="vlb-panel-title">
                <div>
                  <p className="vlb-eyebrow">Academy Settings</p>
                  <h2>Global Intro & Outro</h2>
                </div>
                <button type="button" onClick={loadSavedIntroOutro} disabled={settingsState === "loading" || settingsState === "uploading"}>
                  {settingsState === "loading" ? "Loading..." : "Load Saved Intro/Outro"}
                </button>
              </div>
              <div className="vlb-settings-grid">
                <label>
                  Intro Video URL
                  <input
                    value={academySettings.introVideoUrl}
                    onChange={(event) => updateAcademySettings({ introVideoUrl: event.target.value })}
                    placeholder="https://.../intro.mp4"
                  />
                </label>
                <label>
                  Intro Export Duration
                  <input
                    type="number"
                    min={1}
                    value={academySettings.introDurationInSeconds}
                    onChange={(event) => updateAcademySettings({ introDurationInSeconds: Number(event.target.value) })}
                  />
                  <span className="vlb-field-hint">Detected media duration: {formatSeconds(academySettings.introDetectedDurationInSeconds)}</span>
                  <span className="vlb-field-hint">Export duration: {formatSeconds(academySettings.introDurationInSeconds)}</span>
                  {!!academySettings.introDetectedDurationInSeconds && academySettings.introDurationInSeconds < academySettings.introDetectedDurationInSeconds && (
                    <span className="vlb-upload-status is-failed">Export is shorter than source video; intro will be trimmed.</span>
                  )}
                </label>
                <label>
                  Upload Intro MP4
                  <input type="file" accept="video/mp4,.mp4" onChange={(event) => uploadVideo("intro", event.target.files?.[0] || null)} />
                  {(introUpload.fileName || introUpload.message) && (
                    <span className={`vlb-upload-status is-${introUpload.status}`}>
                      {introUpload.fileName ? `${introUpload.fileName} - ` : ""}{introUpload.message || introUpload.status}
                    </span>
                  )}
                </label>
                <label>
                  Outro Video URL
                  <input
                    value={academySettings.outroVideoUrl}
                    onChange={(event) => updateAcademySettings({ outroVideoUrl: event.target.value })}
                    placeholder="https://.../outro.mp4"
                  />
                </label>
                <label>
                  Outro Export Duration
                  <input
                    type="number"
                    min={1}
                    value={academySettings.outroDurationInSeconds}
                    onChange={(event) => updateAcademySettings({ outroDurationInSeconds: Number(event.target.value) })}
                  />
                  <span className="vlb-field-hint">Detected media duration: {formatSeconds(academySettings.outroDetectedDurationInSeconds)}</span>
                  <span className="vlb-field-hint">Export duration: {formatSeconds(academySettings.outroDurationInSeconds)}</span>
                  {!!academySettings.outroDetectedDurationInSeconds && academySettings.outroDurationInSeconds < academySettings.outroDetectedDurationInSeconds && (
                    <span className="vlb-upload-status is-failed">Export is shorter than source video; outro will be trimmed.</span>
                  )}
                </label>
                <label>
                  Upload Outro MP4
                  <input type="file" accept="video/mp4,.mp4" onChange={(event) => uploadVideo("outro", event.target.files?.[0] || null)} />
                  {(outroUpload.fileName || outroUpload.message) && (
                    <span className={`vlb-upload-status is-${outroUpload.status}`}>
                      {outroUpload.fileName ? `${outroUpload.fileName} - ` : ""}{outroUpload.message || outroUpload.status}
                    </span>
                  )}
                </label>
              </div>
              <div className="vlb-inline-actions">
                <button type="button" onClick={() => { updateAcademySettings({ introDurationInSeconds: 4, outroDurationInSeconds: 3 }); setMessage("Short lesson bumpers selected: 4s intro and 3s outro. Save Settings to use them for exports."); }} disabled={!academySettings.introVideoUrl && !academySettings.outroVideoUrl}>
                  Use Short Lesson Bumpers (4s / 3s)
                </button>
                <button type="button" className="vlb-primary" onClick={saveSettings} disabled={settingsState === "saving" || settingsState === "uploading"}>
                  {settingsState === "saving" ? "Saving..." : settingsState === "uploading" ? "Uploading..." : "Save Settings"}
                </button>
                <button type="button" onClick={() => setTestingVideo(testingVideo === "intro" ? "" : "intro")} disabled={!academySettings.introVideoUrl}>
                  Test Intro
                </button>
                <button type="button" onClick={() => setTestingVideo(testingVideo === "outro" ? "" : "outro")} disabled={!academySettings.outroVideoUrl}>
                  Test Outro
                </button>
              </div>
              {testingVideo && (
                <video
                  className="vlb-test-video"
                  src={testingVideo === "intro" ? academySettings.introVideoUrl : academySettings.outroVideoUrl}
                  controls
                />
              )}
            </div>
            <label>
              Lesson Title
              <input value={lesson.title} onChange={(event) => updateLesson({ title: event.target.value })} />
            </label>
            <label>
              Template
              <select
                value={lesson.templateId}
                onChange={(event) => updateLesson({ templateId: event.target.value as VideoLessonMetadata["templateId"] })}
              >
                {videoLessonTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedScene && (
              <>
                {selectedSceneIsLocked ? (
                  <div className="vlb-locked-notice">
                    <strong>{selectedScene.lockedAssetKind === "intro" ? "Intro loaded" : "Outro loaded"}</strong>
                    <span>This is a read-only visual placeholder. The actual MP4 is added globally during export.</span>
                  </div>
                ) : (
                  <>
                    <SceneVisualEditor scene={selectedScene} sceneIndex={selectedSceneIndex} sceneCount={lesson.scenes.length} onChange={(patch) => updateScene(selectedScene.id, patch)} />
                    <details className="vlb-advanced-options">
                    <summary>Legacy media, upload, and HeyGen controls</summary>
                    <label>
                      Scene Layout
                      <select
                        value={selectedScene.layoutId || "definition"}
                        onChange={(event) => updateScene(selectedScene.id, { layoutId: event.target.value as VideoLessonLayoutId })}
                      >
                        {videoLessonLayouts.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {layout.name}
                          </option>
                        ))}
                      </select>
                      <span className="vlb-field-hint">
                        {videoLessonLayouts.find((layout) => layout.id === selectedScene.layoutId)?.description || "Fallback layout for older scene JSON."}
                      </span>
                    </label>
                    <label>
                      Scene Title
                      <input value={selectedScene.title} onChange={(event) => updateScene(selectedScene.id, { title: event.target.value })} />
                    </label>
                    <label>
                      Body Text
                      <textarea value={selectedScene.body} onChange={(event) => updateScene(selectedScene.id, { body: event.target.value })} />
                    </label>
                    <label>
                      Bullet Points
                      <textarea
                        value={(selectedScene.bullets || []).join("\n")}
                        onChange={(event) =>
                          updateScene(selectedScene.id, {
                            bullets: event.target.value
                              .split("\n")
                              .map((bullet) => bullet.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label>
                      Media Type
                      <select
                        value={selectedScene.mediaType || "none"}
                        onChange={(event) => updateScene(selectedScene.id, { mediaType: event.target.value as VideoLessonScene["mediaType"] })}
                      >
                        <option value="none">None</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </label>
                    <label>
                      Upload Media
                      <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,.png,.jpg,.jpeg,.webp,.mp4" onChange={(event) => uploadSceneMedia(event.target.files?.[0] || null)} />
                      {(sceneUpload.fileName || selectedScene.mediaFileName || sceneUpload.message) && (
                        <span className={`vlb-upload-status is-${sceneUpload.status}`}>
                          {sceneUpload.fileName || selectedScene.mediaFileName} {sceneUpload.message ? `- ${sceneUpload.message}` : ""}
                        </span>
                      )}
                    </label>
                    <label>
                      Media URL
                      <input
                        value={selectedScene.mediaUrl || selectedScene.imageUrl || ""}
                        onChange={(event) => updateScene(selectedScene.id, {
                          mediaUrl: event.target.value,
                          imageUrl: (selectedScene.mediaType || "image") === "image" ? event.target.value : selectedScene.imageUrl,
                        })}
                        placeholder="https://... Canva MP4, PNG, or JPG"
                      />
                    </label>
                    <label>
                      Background Image URL
                      <input
                        value={selectedScene.backgroundImageUrl || ""}
                        onChange={(event) => updateScene(selectedScene.id, { backgroundImageUrl: event.target.value })}
                        placeholder="https://.../background.png"
                      />
                    </label>
                    <label>
                      Background Video URL
                      <input
                        value={selectedScene.backgroundVideoUrl || ""}
                        onChange={(event) => updateScene(selectedScene.id, { backgroundVideoUrl: event.target.value })}
                        placeholder="https://.../background.mp4"
                      />
                    </label>
                    <label>
                      Media Position
                      <select
                        value={selectedScene.mediaPosition || "right"}
                        onChange={(event) => updateScene(selectedScene.id, { mediaPosition: event.target.value as VideoLessonScene["mediaPosition"] })}
                      >
                        <option value="background">Full background</option>
                        <option value="left">Left side</option>
                        <option value="right">Right side</option>
                        <option value="center">Centered</option>
                      </select>
                    </label>
                    <label>
                      Media Fit
                      <select
                        value={selectedScene.mediaFit || "cover"}
                        onChange={(event) => updateScene(selectedScene.id, { mediaFit: event.target.value as VideoLessonScene["mediaFit"] })}
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                      </select>
                    </label>
                    <label>
                      Media Opacity
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedScene.mediaOpacity ?? 1}
                        onChange={(event) => updateScene(selectedScene.id, { mediaOpacity: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      Text Overlay Strength
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedScene.textOverlayStrength ?? 0.58}
                        onChange={(event) => updateScene(selectedScene.id, { textOverlayStrength: Number(event.target.value) })}
                      />
                    </label>
                    <label className="vlb-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedScene.loopMedia ?? true}
                        onChange={(event) => updateScene(selectedScene.id, { loopMedia: event.target.checked })}
                      />
                      Loop Media
                    </label>
                    <div className="vlb-heygen-card">
                      <div className="vlb-panel-title">
                        <div>
                          <p className="vlb-eyebrow">HeyGen</p>
                          <h2>Jessica Avatar Clip</h2>
                        </div>
                        <span className={`vlb-heygen-status is-${selectedScene.heygenStatus || "idle"}`}>
                          {selectedScene.heygenStatus || "idle"}
                        </span>
                      </div>
                      <label>
                        Jessica Avatar ID
                        <input
                          value={selectedScene.heygenAvatarId || ""}
                          onChange={(event) => updateScene(selectedScene.id, { heygenAvatarId: event.target.value })}
                          placeholder="Paste saved Jessica avatar look ID"
                        />
                      </label>
                      <label>
                        Jessica Voice ID
                        <input
                          value={selectedScene.heygenVoiceId || ""}
                          onChange={(event) => updateScene(selectedScene.id, { heygenVoiceId: event.target.value })}
                          placeholder="Paste saved Jessica voice ID"
                        />
                      </label>
                      <label>
                        Completed HeyGen MP4 URL
                        <input
                          value={selectedScene.heygenSourceUrl || ""}
                          onChange={(event) => updateScene(selectedScene.id, { heygenSourceUrl: event.target.value })}
                          placeholder="https://.../completed-heygen-clip.mp4"
                        />
                      </label>
                      <div className="vlb-inline-actions">
                        <button type="button" className="vlb-primary" onClick={prepareHeyGenAvatarClip}>
                          Generate Avatar Clip with HeyGen
                        </button>
                        <button type="button" onClick={importHeyGenCompletedClip}>
                          Import Completed Clip
                        </button>
                      </div>
                      <div className="vlb-heygen-meta">
                        {selectedScene.heygenJobId && <span>Job ID: {selectedScene.heygenJobId}</span>}
                        {selectedScene.heygenCompletedStoragePath && <span>Saved: {selectedScene.heygenCompletedStoragePath}</span>}
                        {selectedScene.heygenError && <span className="is-failed">{selectedScene.heygenError}</span>}
                      </div>
                    </div>
                    <label>
                      Narration Script
                      <textarea
                        value={selectedScene.narrationScript}
                        onChange={(event) => updateScene(selectedScene.id, { narrationScript: event.target.value })}
                      />
                    </label>
                    <label>
                      Duration
                      <input
                        type="number"
                        min={4}
                        value={selectedScene.durationInSeconds || 8}
                        onChange={(event) => updateScene(selectedScene.id, { durationInSeconds: Number(event.target.value) })}
                      />
                    </label>
                    </details>
                    <button type="button" className="vlb-danger" onClick={() => removeScene(selectedScene.id)}>
                      Remove Scene
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </main>

        <aside className="vlb-preview-column">
          <section className="vlb-panel vlb-preview">
            <div className="vlb-preview-toolbar"><div><button type="button" className={previewMode === "scene" ? "is-active" : ""} onClick={() => setPreviewMode("scene")}>Scene only</button><button type="button" className={previewMode === "lesson" ? "is-active" : ""} onClick={() => setPreviewMode("lesson")}>Full lesson</button></div><div><button type="button" disabled={selectedSceneIndex === 0} onClick={() => setSelectedSceneId(lesson.scenes[selectedSceneIndex - 1]?.id || selectedSceneId)}>Previous</button><button type="button" disabled={selectedSceneIndex >= lesson.scenes.length - 1} onClick={() => setSelectedSceneId(lesson.scenes[selectedSceneIndex + 1]?.id || selectedSceneId)}>Next</button></div></div>
            <div className="vlb-preview-frame">
              {selectedScene && previewMode === "scene" && <Player component={VideoLessonComposition} inputProps={{ lesson: { ...lesson, scenes: [selectedScene], academySettings: { ...academySettings, introVideoUrl: "", outroVideoUrl: "" } } }} durationInFrames={Math.max(4, selectedScene.durationInSeconds || 8) * reviveVideoConfig.fps} compositionWidth={reviveVideoConfig.width} compositionHeight={reviveVideoConfig.height} fps={reviveVideoConfig.fps} controls loop style={{ width: "100%" }} />}
              {previewMode === "lesson" && <Player component={VideoLessonComposition} inputProps={{ lesson: { ...lesson, academySettings } }} durationInFrames={getLessonDurationInFrames({ ...lesson, academySettings })} compositionWidth={reviveVideoConfig.width} compositionHeight={reviveVideoConfig.height} fps={reviveVideoConfig.fps} controls style={{ width: "100%" }} />}
              <div className="vlb-legacy-preview" aria-hidden="true">
              <div className="vlb-slide">
                {selectedScene?.backgroundImageUrl && (
                  <img className="vlb-slide-bg-media" src={selectedScene.backgroundImageUrl} alt="" />
                )}
                {selectedScene?.backgroundVideoUrl && (
                  <video className="vlb-slide-bg-media" src={selectedScene.backgroundVideoUrl} autoPlay muted loop playsInline />
                )}
                {(selectedScene?.mediaUrl || selectedScene?.imageUrl) && (selectedScene.mediaType || "image") !== "none" && (
                  <div className={`vlb-slide-media is-${selectedScene.mediaPosition || "right"}`}>
                    {(selectedScene.mediaType || "image") === "video" ? (
                      <video
                        src={selectedScene.mediaUrl}
                        autoPlay
                        muted
                        loop={selectedScene.loopMedia ?? true}
                        playsInline
                        style={{
                          objectFit: selectedScene.mediaFit || "cover",
                          opacity: selectedScene.mediaOpacity ?? 1,
                        }}
                      />
                    ) : (
                      <img
                        src={selectedScene.mediaUrl || selectedScene.imageUrl}
                        alt=""
                        style={{
                          objectFit: selectedScene.mediaFit || "cover",
                          opacity: selectedScene.mediaOpacity ?? 1,
                        }}
                      />
                    )}
                  </div>
                )}
                <div
                  className="vlb-slide-overlay"
                  style={{ opacity: selectedScene?.textOverlayStrength ?? 0.58 }}
                />
                <div className="vlb-brand-row">
                  <span>REVIVE DENTAL ACADEMY</span>
                  <span>{String(selectedSceneIndex + 1).padStart(2, "0")}</span>
                </div>
                <div className="vlb-layout-badge">{getLayoutName(selectedScene?.layoutId).toUpperCase()}</div>
                <h2>{selectedScene?.title}</h2>
                <p>{selectedScene?.body}</p>
                {!!selectedScene?.bullets?.length && (
                  <ul className="vlb-preview-card-list">
                    {selectedScene.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
              </div>
            </div>
            <div className="vlb-stats">
              <span>{previewMode === "scene" ? "Scene preview" : "Full lesson preview"}</span>
              <span>{lesson.scenes.length} scenes</span>
              <span>{totalDuration}s</span>
              <span>{academySettings.introVideoUrl ? "Intro loaded" : "No intro"}</span>
              <span>{academySettings.outroVideoUrl ? "Outro loaded" : "No outro"}</span>
              <span>{lesson.renderStatus}</span>
            </div>
          </section>

          <section className="vlb-panel vlb-attach">
            <h2>Attach Export</h2>
            <select
              value={lesson.lessonId || ""}
              onChange={(event) => {
                const option = courseLessons.find((item) => item.lessonId === event.target.value);
                updateLesson({ courseId: option?.courseId, lessonId: option?.lessonId });
              }}
            >
              <option value="">Select course lesson</option>
              {courseLessons.map((item) => (
                <option key={`${item.courseId}-${item.lessonId}`} value={item.lessonId}>
                  {item.courseTitle} / {item.lessonTitle}
                </option>
              ))}
            </select>
            <button type="button" onClick={startFromCourseLesson} disabled={!lesson.lessonId}>
              Start Video From Lesson
            </button>
            <button type="button" onClick={() => attachToCourseLesson()}>
              Attach to Lesson
            </button>
          </section>

          <section className="vlb-panel vlb-render-log">
            <div className="vlb-panel-title">
              <h2>Render Log</h2>
              <span>{renderLog.length} steps</span>
            </div>
            <div className="vlb-render-log-list" aria-live="polite">
              {renderLog.length === 0 ? (
                <p>No render activity yet.</p>
              ) : (
                renderLog.map((entry, index) => (
                  <div key={`${entry.at}-${index}`} className="vlb-render-log-entry">
                    <time>{new Date(entry.at).toLocaleTimeString()}</time>
                    <strong>{entry.step}</strong>
                    {entry.details ? <code>{describeRenderDetails(entry.details)}</code> : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="vlb-panel vlb-json">
        <div className="vlb-panel-title">
          <div><p className="vlb-eyebrow">Advanced</p><h2>JSON Scene Editor</h2></div>
          <button type="button" onClick={() => setAdvancedJsonOpen((open) => !open)}>{advancedJsonOpen ? "Hide" : "Open Advanced"}</button>
        </div>
        {advancedJsonOpen && <><p className="vlb-field-hint">Use this only for troubleshooting or power-user edits.</p><textarea value={jsonValue} onChange={(event) => setJsonValue(event.target.value)} spellCheck={false} /><button type="button" onClick={applyJson}>Apply JSON</button>{jsonError && <p className="vlb-error">{jsonError}</p>}</>}
      </section>

      {sceneLibraryOpen && <SceneLibrary onAdd={addScene} onClose={() => setSceneLibraryOpen(false)} />}
      {import.meta.env.DEV && assetPreviewOpen && <AssetPreviewPanel onClose={() => setAssetPreviewOpen(false)} />}
      {message && <p className="vlb-toast">{message}</p>}
    </section>
  );
}
