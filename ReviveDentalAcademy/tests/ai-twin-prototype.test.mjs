import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { insuranceVerificationPrototype as lesson } from "../src/remotion/insuranceVerificationPrototype.ts";

test("prototype is exactly 60 seconds / 1800 frames at 30 fps", () => {
  assert.equal(lesson.scenes.reduce((total, scene) => total + (scene.durationInSeconds ?? 0), 0), 60);
  assert.equal(lesson.scenes.reduce((total, scene) => total + (scene.durationInSeconds ?? 0) * 30, 0), 1800);
  assert.equal(lesson.academySettings?.introVideoUrl, "");
  assert.equal(lesson.academySettings?.outroVideoUrl, "");
});
test("prototype is isolated, deterministic and has no publishing or avatar generation", () => {
  assert.equal(lesson.renderStatus, "draft");
  assert.equal(lesson.courseId, undefined);
  assert.equal(lesson.lessonId, undefined);
  assert.equal(lesson.scenes.length, 5);
  assert.equal(new Set(lesson.scenes.map(scene => scene.id)).size, 5);
  for (const scene of lesson.scenes) {
    assert.ok(scene.narrationScript.trim());
    assert.ok(scene.title.trim());
    assert.equal(scene.avatarEnabled ?? false, false);
    assert.equal(scene.mediaUrl ?? "", "");
    assert.equal(scene.backgroundVideoUrl ?? "", "");
    assert.equal(scene.heygenJobId ?? "", "");
  }
});
test("fictional-only examples and payment caution are explicit", () => {
  const body = JSON.stringify(lesson).toLowerCase();
  assert.match(body, /alex example/);
  assert.match(body, /demo-0000/);
  assert.match(body, /not a payment guarantee/);
  assert.doesNotMatch(body, /sk-[a-z0-9]{12,}/i);
});
test("composition is registered separately from the existing lesson player", () => {
  const root = readFileSync(fileURLToPath(new URL("../src/remotion/Root.tsx", import.meta.url)), "utf8");
  assert.match(root, /id="ReviveInsuranceVerificationPrototype"/);
  assert.match(root, /insuranceVerificationPrototype/);
  assert.match(root, /id="ReviveVideoLesson"/);
});
