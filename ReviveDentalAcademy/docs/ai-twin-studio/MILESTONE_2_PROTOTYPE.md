# Milestone 2 — 60-second no-AI insurance verification storyboard

Status: code prototype only. No audio generated, no rendered MP4, no deployment, no database changes, no lesson publication.

## Composition
Remotion Studio ID: `ReviveInsuranceVerificationPrototype`; 1920 × 1080; 30 fps; 1,800 frames (60 seconds). Reuses existing `VideoLessonComposition`, `ReviveAcademyScene`, the charcoal/aqua Revive palette and icon assets. Placeholder instructor is text-only with avatar generation OFF.

| Scene | Seconds | Layout | Content |
|---|---:|---|---|
| 1 | 10 | avatar-intro | Placeholder instructor and welcome |
| 2 | 16 | process | Confirm identity → eligibility → benefits → document |
| 3 | 14 | example | Alex Example, DEMO-0000, entirely hypothetical figures |
| 4 | 10 | comparison | Eligibility versus payment guarantee |
| 5 | 10 | recap | Four-point checklist |

## Preview locally (no deployment)
From `ReviveDentalAcademy`, run `npm install`, then `npm run remotion:studio`, and select `ReviveInsuranceVerificationPrototype`. This is a silent motion-graphic storyboard with scripted narration text; no voice synthesis, video rendering or GPU calls are required to inspect the composition. Running a build or Studio locally is separate from publishing.

## Tests
`node --experimental-strip-types --test tests/ai-twin-prototype.test.mjs` with Node 22+ supporting TypeScript stripping (Node 24 preferred). Existing tests and `npm run build` should also be run in a checked-out development workspace before considering the prototype validated. This branch has not been deployed.

## Safety
No student identity, patient data, real policy information, likeness, AI provider API, generated audio, checkout, or course publication. Script is illustrative, not insurance advice. No production data is read or modified.
