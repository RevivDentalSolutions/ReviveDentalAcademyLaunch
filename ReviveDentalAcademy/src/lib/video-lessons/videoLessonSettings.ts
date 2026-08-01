import {
  defaultAcademyVideoSettings,
  type AcademyVideoSettings,
} from "./videoLessonTypes";
import { authenticatedJsonFetch } from "../apiClient";
import { supabase } from "../supabase";

const VIDEO_BUCKET = import.meta.env.VITE_SUPABASE_VIDEO_BUCKET || "academy-media";
const LOCAL_STORAGE_KEY = "revive-video-lesson-builder-settings";

function normalizeSettings(settings: Partial<AcademyVideoSettings> | null | undefined): AcademyVideoSettings {
  return {
    introVideoUrl: settings?.introVideoUrl || "",
    introStoragePath: settings?.introStoragePath || "",
    introFileName: settings?.introFileName || "",
    introDetectedDurationInSeconds: settings?.introDetectedDurationInSeconds ? Math.max(1, Number(settings.introDetectedDurationInSeconds)) : undefined,
    introDurationInSeconds: Math.max(1, Number(settings?.introDurationInSeconds ?? defaultAcademyVideoSettings.introDurationInSeconds)),
    outroVideoUrl: settings?.outroVideoUrl || "",
    outroStoragePath: settings?.outroStoragePath || "",
    outroFileName: settings?.outroFileName || "",
    outroDetectedDurationInSeconds: settings?.outroDetectedDurationInSeconds ? Math.max(1, Number(settings.outroDetectedDurationInSeconds)) : undefined,
    outroDurationInSeconds: Math.max(1, Number(settings?.outroDurationInSeconds ?? defaultAcademyVideoSettings.outroDurationInSeconds)),
    updatedAt: settings?.updatedAt,
  };
}

function saveSettingsLocally(settings: AcademyVideoSettings) {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsLocally(): AcademyVideoSettings {
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return normalizeSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return defaultAcademyVideoSettings;
  }
}

export async function loadAcademyVideoSettings(): Promise<AcademyVideoSettings> {
  try {
    const response = await authenticatedJsonFetch("/api/admin/video-lessons/academy-settings");
    if (!response.ok) throw new Error(await readApiError(response));
    const result = await response.json() as { settings?: AcademyVideoSettings };
    const settings = normalizeSettings(result.settings);
    saveSettingsLocally(settings);
    return settings;
  } catch (error) {
    const localSettings = loadSettingsLocally();
    if (localSettings.introVideoUrl || localSettings.outroVideoUrl) return localSettings;
    throw error;
  }
}

export async function saveAcademyVideoSettings(settings: AcademyVideoSettings): Promise<AcademyVideoSettings> {
  const nextSettings = normalizeSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  const response = await authenticatedJsonFetch("/api/admin/video-lessons/academy-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: nextSettings }),
  });

  if (!response.ok) throw new Error(await readApiError(response));
  const result = await response.json() as { settings?: AcademyVideoSettings };
  const savedSettings = normalizeSettings(result.settings || nextSettings);
  saveSettingsLocally(savedSettings);
  return savedSettings;
}

export type AcademyMediaUploadResult = {
  publicUrl: string;
  storagePath: string;
  fileName: string;
  bucket: string;
};

function getFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop();
  if (nameExtension) return nameExtension.toLowerCase();
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  return "bin";
}

function assertSupportedMediaFile(file: File, acceptedKinds: Array<"image" | "video">) {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
  const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);

  if (acceptedKinds.includes("video") && isVideo) return;
  if (acceptedKinds.includes("image") && isImage) return;

  throw new Error(`Unsupported file type "${file.type || file.name}". Upload an MP4 video or PNG/JPG image.`);
}

async function readApiError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return [parsed.error, parsed.details].filter(Boolean).join(" ");
  } catch {
    return text || `Request failed with status ${response.status}.`;
  }
}

function createStoragePath(pathPrefix: string, fileName: string) {
  const safePrefix = pathPrefix.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const uniqueSuffix = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${safePrefix}/${Date.now()}-${uniqueSuffix}-${safeName}`;
}

export async function uploadAcademyMediaAsset(
  pathPrefix: string,
  file: File,
  acceptedKinds: Array<"image" | "video"> = ["image", "video"],
): Promise<AcademyMediaUploadResult> {
  assertSupportedMediaFile(file, acceptedKinds);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const safePrefix = pathPrefix.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
  const extension = getFileExtension(file);
  const contentType = file.type || (extension === "mp4" ? "video/mp4" : "application/octet-stream");
  const storagePath = createStoragePath(safePrefix, safeName || `media.${extension}`);
  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(storagePath, file, {
    cacheControl: "31536000",
    contentType,
    upsert: false,
  });

  if (error) throw error;

  const publicUrl = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  return { publicUrl, storagePath, fileName: file.name, bucket: VIDEO_BUCKET };
}

export async function uploadRemoteAcademyMediaAsset(
  pathPrefix: string,
  sourceUrl: string,
  fileName: string,
  acceptedKinds: Array<"image" | "video"> = ["video"],
): Promise<AcademyMediaUploadResult> {
  const safePrefix = pathPrefix.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
  const safeName = (fileName || "heygen-avatar-clip.mp4").replace(/[^a-zA-Z0-9._-]/g, "-");
  const response = await authenticatedJsonFetch("/api/admin/video-lessons/academy-media/upload-remote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathPrefix: safePrefix,
      fileName: safeName,
      sourceUrl,
      acceptedKinds,
    }),
  });

  if (!response.ok) throw new Error(await readApiError(response));

  const result = await response.json() as AcademyMediaUploadResult;
  return { ...result, fileName: result.fileName || safeName, bucket: result.bucket || VIDEO_BUCKET };
}

export async function uploadAcademyVideoAsset(kind: "intro" | "outro", file: File): Promise<AcademyMediaUploadResult> {
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
    throw new Error("Only MP4 files are supported for intro and outro videos.");
  }

  return uploadAcademyMediaAsset(`video-lesson-builder/${kind}`, file, ["video"]);
}
