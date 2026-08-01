import type { VideoLessonTemplateId } from "./videoLessonTypes";

export type VideoLessonTemplate = {
  id: VideoLessonTemplateId;
  name: string;
  description: string;
  transition: "slide" | "fade";
};

export const videoLessonTemplates: VideoLessonTemplate[] = [
  {
    id: "revive-clean",
    name: "Revive Clean",
    description: "White instructional slides with black type, teal accents, and smooth Canva-style fades.",
    transition: "fade",
  },
  {
    id: "revive-split",
    name: "Revive Split",
    description: "Split content and image layout for lessons that use clinical or process visuals.",
    transition: "slide",
  },
  {
    id: "revive-academy",
    name: "Revive Academy",
    description: "Premium charcoal, aqua, glass-card lesson layouts based on the Revive design system.",
    transition: "fade",
  },
];

export function getVideoLessonTemplate(templateId: VideoLessonTemplateId): VideoLessonTemplate {
  return videoLessonTemplates.find((template) => template.id === templateId) || videoLessonTemplates[0];
}
