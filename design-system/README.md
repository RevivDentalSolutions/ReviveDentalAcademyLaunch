Revive Academy Design System

This folder is the source of truth for Revive Dental Academy lesson visuals. It documents the brand rules used by Canva templates, the Video Lesson Builder, and Remotion exports.

Reference images belong in `design-system/references/`. Canva exports should be saved there as PNG files, for example:

- `academy-component-library.png`
- `definition-slide.png`
- `comparison-slide.png`
- `timeline-slide.png`
- `quiz-slide.png`
- `recap-slide.png`

Reference images are visual direction only. The application should not flatten lessons into screenshots or use the reference PNGs as full-slide backgrounds. Recreate the style with editable React, CSS, and Remotion components so text, icons, and media remain replaceable.

The approved academy direction is `references/academy-component-library.png`. Reusable Remotion primitives and layouts live in `src/remotion/ReviveAcademyScene.tsx`; scene layout IDs and editor labels live in `src/lib/video-lessons/videoLessonLayouts.ts`.

Approved asset usage is tracked in `asset-inventory.md`. SVG scene icons are resolved through `src/lib/video-lessons/reviveIconRegistry.ts`; add newly approved standalone icons there rather than embedding reference PNGs in a composition.

When a new Canva reference is added:

1. Save the PNG in `design-system/references/`.
2. Note the intended layout or component in this README or the matching brand file.
3. Update the matching React/Remotion component to recreate the spacing, typography, glow, border, and proportion.
4. Verify older lesson JSON still renders through the fallback scene fields.

Layout mapping:

- `title`: course openings and lesson title scenes.
- `section-divider`: module or section breaks.
- `definition`: terms, definitions, and key vocabulary.
- `comparison`: side-by-side plan, process, or responsibility comparisons.
- `process`: sequential workflows.
- `timeline`: waiting periods, eligibility windows, and date-based steps.
- `example`: calculations and worked examples.
- `patient-scenario`: patient conversation or office scenario prompts.
- `quiz`: knowledge checks and discussion questions.
- `recap`: summary and takeaways.
- `avatar-intro`: short HeyGen or presenter intro marker.
- `avatar-outro`: short HeyGen or presenter closing marker.

Existing export features that must remain untouched:

- Global intro video prepends before lesson scenes.
- Global outro video appends after lesson scenes.
- MP4 export route continues to render with Remotion.
- Supabase upload continues to store rendered MP4 files.
- Lesson attachment continues to write the rendered video reference to the selected lesson.
- Local saved drafts and old scene JSON continue to load through normalization.

Backward compatibility includes the original `title`, `body`, `bullets`, `imageUrl`, `narration`, and `duration` fields. The normalizers translate `narration` to `narrationScript` and `duration` to `durationInSeconds` without requiring a data migration.
