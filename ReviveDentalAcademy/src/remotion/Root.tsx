import { Composition } from "remotion";
import { sampleVideoLesson } from "../lib/video-lessons/videoLessonTypes";
import {
  getLessonDurationInFrames,
  reviveVideoConfig,
  VideoLessonComposition,
} from "./VideoLessonComposition";
import { assetPreviewLayoutIds, createAssetPreviewLesson } from "./assetPreviewLessons";
import { WarningCalloutPreview } from "./WarningCalloutPreview";

export function RemotionRoot() {
  return (
    <>
    <Composition
      id="ReviveVideoLesson"
      component={VideoLessonComposition}
      durationInFrames={getLessonDurationInFrames(sampleVideoLesson)}
      fps={reviveVideoConfig.fps}
      width={reviveVideoConfig.width}
      height={reviveVideoConfig.height}
      defaultProps={{
        lesson: sampleVideoLesson,
      }}
    />
    {assetPreviewLayoutIds.map((layoutId) => {
      const previewLesson = createAssetPreviewLesson(layoutId);
      const compositionId = `AssetPreview-${layoutId.replace(/(^|-)(\w)/g, (_match, _dash, letter: string) => letter.toUpperCase())}`;
      return <Composition key={layoutId} id={compositionId} component={VideoLessonComposition} durationInFrames={getLessonDurationInFrames(previewLesson)} fps={reviveVideoConfig.fps} width={reviveVideoConfig.width} height={reviveVideoConfig.height} defaultProps={{ lesson: previewLesson }} />;
    })}
    <Composition id="AssetPreview-WarningCallout" component={WarningCalloutPreview} durationInFrames={180} fps={reviveVideoConfig.fps} width={reviveVideoConfig.width} height={reviveVideoConfig.height} />
    </>
  );
}
