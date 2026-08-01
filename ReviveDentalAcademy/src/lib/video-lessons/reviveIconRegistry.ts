import tooth from "../../../design-system/assets/Icons/3DTooth.svg";
import calendar from "../../../design-system/assets/Icons/calendar.svg";
import clipboard from "../../../design-system/assets/Icons/clipboard.svg";
import clock from "../../../design-system/assets/Icons/clock.svg";
import phone from "../../../design-system/assets/Icons/phone.svg";
import progress from "../../../design-system/assets/Icons/progress-bar.svg";
import calculator from "../../../design-system/assets/Icons/calculator.svg";
import checklist from "../../../design-system/assets/Icons/checklist.svg";
import dollar from "../../../design-system/assets/Icons/dollar.svg";
import lightbulb from "../../../design-system/assets/Icons/lightbulb.svg";
import patient from "../../../design-system/assets/Icons/Patient.svg";
import question from "../../../design-system/assets/Icons/question.svg";
import shield from "../../../design-system/assets/Icons/shield.svg";
import team from "../../../design-system/assets/Icons/team.svg";
import warning from "../../../design-system/assets/Icons/warning.svg";
import benefitsWorksheet from "../../../design-system/assets/BenefitsBreakdownWorksheet.png";
import insuranceChecklist from "../../../design-system/assets/inschklist (1).png";
import academyLogo from "../../../design-system/assets/ReviveAcademyLogo.png";
import academyTransparentLogo from "../../../design-system/assets/ReviveAcademyTransparentLogo.png";
import reviveLogo from "../../../design-system/assets/ReviveLogo.png";
import type { VideoLessonLayoutId } from "./videoLessonLayouts";

/** Approved source files. `video` remains an explicit alias until video.svg is supplied. */
export const reviveIconRegistry = {
  tooth,
  clipboard,
  calendar,
  clock,
  phone,
  progress,
  checklist,
  calculator,
  dollar,
  shield,
  team,
  patient,
  question,
  lightbulb,
  warning,
  video: phone,
} as const;

export type ReviveIconName = keyof typeof reviveIconRegistry;

export const approvedReviveIconNames = Object.keys(reviveIconRegistry) as ReviveIconName[];
export const nativeApprovedReviveIconNames: ReviveIconName[] = ["tooth", "clipboard", "calendar", "clock", "phone", "calculator", "dollar", "shield", "checklist", "team", "patient", "question", "lightbulb", "warning", "progress"];

export const reviveComponentAssetRegistry = {
  "benefits-breakdown-worksheet": benefitsWorksheet,
  "insurance-checklist": insuranceChecklist,
  "academy-logo": academyLogo,
  "academy-transparent-logo": academyTransparentLogo,
  "revive-logo": reviveLogo,
} as const;

const layoutDefaults: Record<VideoLessonLayoutId, ReviveIconName> = {
  title: "tooth",
  "section-divider": "tooth",
  definition: "clipboard",
  comparison: "clipboard",
  process: "clipboard",
  timeline: "calendar",
  example: "calculator",
  "patient-scenario": "patient",
  quiz: "question",
  recap: "checklist",
  "avatar-intro": "video",
  "avatar-outro": "video",
};

export function isReviveIconName(value: unknown): value is ReviveIconName {
  return typeof value === "string" && value in reviveIconRegistry;
}

export function getReviveIconName(icon: unknown, layoutId?: VideoLessonLayoutId): ReviveIconName {
  if (isReviveIconName(icon)) return icon;
  if (layoutId && layoutDefaults[layoutId]) return layoutDefaults[layoutId];
  return "tooth";
}

export function getReviveIconUrl(icon: unknown, layoutId?: VideoLessonLayoutId) {
  return reviveIconRegistry[getReviveIconName(icon, layoutId)];
}
