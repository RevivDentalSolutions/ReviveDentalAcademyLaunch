/** Ephemeral UI-only prototype. No persistence, upload or model invocation. */
export type InstructorMockProfile = {
  displayName: string;
  role: 'Dental Insurance Instructor' | 'Dental Practice Operations Instructor' | 'Revive Academy Instructor';
  style: 'Warm and professional' | 'Clear and concise' | 'Friendly and conversational';
  ownsLikeness: boolean;
  understandsPrivacy: boolean;
};

export const instructorMockDefaults: Readonly<InstructorMockProfile> = Object.freeze({
  displayName: 'Revive Demo Instructor',
  role: 'Dental Insurance Instructor',
  style: 'Warm and professional',
  ownsLikeness: false,
  understandsPrivacy: false,
});

export function getInstructorReadiness(profile: InstructorMockProfile) {
  return {
    consentChecklistComplete: profile.ownsLikeness && profile.understandsPrivacy,
    portraitAvailable: false,
    voiceAvailable: false,
    aiEnabled: false,
    canGenerate: false,
  } as const;
}
