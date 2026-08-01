# Revive Academy Asset Inventory

Audited July 18, 2026. The filesystem folder is named `design-system/assets/Icons/` (capital `I`). Reference PNGs are never renderer backgrounds.

## Component assets

| Filename | Type | Intended use | Imported? | Current consumer |
|---|---|---|---|---|
| `.gitkeep` | Placeholder | Preserve empty folder in Git | No | None |
| `BenefitsBreakdownWorksheet.png` | PNG | Replaceable lesson/example worksheet media | Yes | Development-only `AssetPreviewPanel`; available through `reviveComponentAssetRegistry`, not automatically placed in lessons |
| `inschklist (1).png` | PNG | Replaceable insurance checklist lesson media | Yes | Development-only `AssetPreviewPanel`; available through `reviveComponentAssetRegistry`, not automatically placed in lessons |
| `ReviveAcademyLogo.png` | PNG | Academy logo on light/compatible surfaces | Yes | Development-only `AssetPreviewPanel` |
| `ReviveAcademyTransparentLogo.png` | PNG | Transparent academy logo for composition/header use | Yes | Development-only `AssetPreviewPanel` |
| `ReviveLogo.png` | PNG | Revive parent brand logo | Yes | Development-only `AssetPreviewPanel` |

## Approved SVG icons

All SVGs remain vector assets and are rendered with Remotion `Img`/browser `img` elements using `object-fit: contain`, preserving transparency and aspect ratio.

| Filename | Type | Intended use | Imported? | Current consumer/layout |
|---|---|---|---|---|
| `Icons/3DTooth.svg` | SVG | Dental/brand feature visual and final fallback | Yes | `reviveIconRegistry.tooth`; Title, Section Divider, definition fallback, `ImageFrame`, icon selector, asset preview |
| `Icons/calendar.svg` | SVG | Dates, benefit periods, timeline milestones | Yes | `reviveIconRegistry.calendar`; Timeline layout, icon selector, asset preview |
| `Icons/calculator.svg` | SVG | Worked examples and calculations | Yes | `reviveIconRegistry.calculator`; Example layout and icon selector |
| `Icons/checklist.svg` | SVG | Knowledge checks, recap, verification completion | Yes | `reviveIconRegistry.checklist`; Recap and icon selector |
| `Icons/clipboard.svg` | SVG | Definitions, checklists, workflow, quiz, calculations | Yes | `reviveIconRegistry.clipboard`; Definition, Comparison, Process, Example, Quiz, Recap, warning/checklist/lightbulb aliases, icon selector, asset preview |
| `Icons/clock.svg` | SVG | Time, waiting periods, timeline milestones | Yes | `reviveIconRegistry.clock`; Timeline layout, icon selector, asset preview |
| `Icons/dollar.svg` | SVG | Financial examples, deductibles, and payment concepts | Yes | `reviveIconRegistry.dollar`; Definition/Example when selected |
| `Icons/lightbulb.svg` | SVG | Tips, explanations, and knowledge prompts | Yes | `reviveIconRegistry.lightbulb`; Quiz/callout when selected |
| `Icons/Patient.svg` | SVG | Patient scenarios and patient communication | Yes | `reviveIconRegistry.patient`; Patient Scenario default |
| `Icons/phone.svg` | SVG | Patient calls, patient/team workflow, avatar-video fallback | Yes | `reviveIconRegistry.phone`; Process, Patient Scenario, Avatar Intro/Outro aliases, icon selector, asset preview |
| `Icons/progress-bar.svg` | SVG | Static progress-bar example | Yes | Registry and development asset preview only. The renderer keeps the responsive CSS `ProgressBar` because this SVG contains a fixed ~76% fill and cannot reflect arbitrary scene progress cleanly. |
| `Icons/question.svg` | SVG | Quiz and knowledge-check prompts | Yes | `reviveIconRegistry.question`; Quiz default |
| `Icons/shield.svg` | SVG | Protection, compliance, and important definitions | Yes | `reviveIconRegistry.shield`; Definition/Example when selected |
| `Icons/team.svg` | SVG | Team workflow and staff discussion | Yes | `reviveIconRegistry.team`; Process/Patient Scenario when selected |
| `Icons/warning.svg` | SVG | Warning and important callouts | Yes | `reviveIconRegistry.warning`; `CalloutCard` default |

## References

| Filename | Type | Intended use | Imported? | Current consumer |
|---|---|---|---|---|
| `.gitkeep` | Placeholder | Preserve reference folder | No | None |
| `academy-component-library.png` | PNG | Approved component-library visual direction | No | Documentation/human review only |
| `TitleSlideDesignReference.png` | PNG | Title-layout visual reference | No | Documentation/human review only |
| `UI Kit.png` | PNG | Broader UI-kit visual reference | No | Documentation/human review only |
| `ui-kit-icons-reference.png.png` | PNG | Icon-style visual reference | No | Documentation/human review only |

## Missing standalone approved SVGs

Exact approved files now exist for `calculator`, `dollar`, `shield`, `checklist`, `team`, `patient`, `question`, `lightbulb`, and `warning`. No standalone `video.svg` was found, so `video` remains explicitly mapped to `phone.svg` until the approved video asset is supplied.
