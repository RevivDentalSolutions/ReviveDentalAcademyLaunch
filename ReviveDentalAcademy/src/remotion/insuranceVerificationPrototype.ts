import type { VideoLessonMetadata } from "../lib/video-lessons/videoLessonTypes";

// Static, fictional, silent storyboard. No API calls, likeness data, or real patients.
// Narration is a script for a future human recording, not generated audio.
export const insuranceVerificationPrototype: VideoLessonMetadata = {
  id: "prototype_insurance_verification_60s",
  title: "Dental Insurance Verification | 60-Second Prototype",
  description: "Fictional training example. Silent storyboard with a placeholder instructor.",
  templateId: "revive-academy",
  renderStatus: "draft",
  createdAt: "2026-11-22T00:00:00.000Z",
  updatedAt: "2026-11-22T00:00:00.000Z",
  academySettings: { introVideoUrl: "", introDurationInSeconds: 5, outroVideoUrl: "", outroDurationInSeconds: 5 },
  scenes: [
    { id: "prototype_01", layoutId: "avatar-intro", title: "Verify before you estimate", eyebrow: "REVIVE DENTAL ACADEMY", body: "Your instructor will appear here once approved.", avatarEnabled: false, voiceoverMode: "voiceover", avatarScript: "", narrationScript: "Welcome to Revive Dental Academy. Before giving a patient an estimate, confirm eligibility and benefits for the actual date of service.", durationInSeconds: 10 },
    { id: "prototype_02", layoutId: "process", title: "The verification workflow", body: "Follow the same sequence for every fictional example.", processSteps: [{title:"Confirm identity",description:"Match the member and patient identifiers"},{title:"Check eligibility",description:"Confirm coverage for the service date"},{title:"Review benefits",description:"Record deductible, maximum and limitations"},{title:"Document",description:"Record source, date and reference number"}], narrationScript: "First confirm member information. Check active eligibility for the date of service, then review applicable benefits and document where the information came from.", durationInSeconds: 16 },
    { id: "prototype_03", layoutId: "example", title: "Fictional patient example", body: "Alex Example | Member ID: DEMO-0000 | Date of service: December 10, 2026", exampleRows: [{label:"Eligibility",value:"Active for example date"},{label:"Annual maximum",value:"$1,500 hypothetical"},{label:"Remaining maximum",value:"$900 hypothetical"},{label:"Deductible",value:"$50 hypothetical"}], exampleResult: "Illustrative only: benefits are not a payment guarantee.", narrationScript: "For our fictional patient, Alex Example, the plan shows active eligibility, a hypothetical nine hundred dollars remaining, and a fifty-dollar deductible. These numbers do not guarantee payment.", durationInSeconds: 14 },
    { id: "prototype_04", layoutId: "comparison", title: "Eligibility is not a guarantee", body: "Explain the difference before discussing estimated coverage.", comparisonLeftTitle: "Verified", comparisonLeftPoints: ["Active coverage for the date", "Reported plan benefits"], comparisonRightTitle: "Not guaranteed", comparisonRightPoints: ["Claim payment or approval", "Final patient responsibility"], comparisonFooter: "Always document limitations and payer reference.", narrationScript: "Eligibility confirms coverage information, not payment. Treatment limitations, claim review, and plan terms can change the final amount.", durationInSeconds: 10 },
    { id: "prototype_05", layoutId: "recap", title: "Four checks. One clear record.", body: "Confirm, check, review and document.", recapItems: [{title:"Confirm",description:"Patient and member"},{title:"Check",description:"Eligibility date"},{title:"Review",description:"Benefits and limitations"},{title:"Document",description:"Reference and source"}], narrationScript: "Remember: confirm identity, check eligibility, review benefits, and document the result. You are ready for the next lesson.", durationInSeconds: 10 }
  ]
};
