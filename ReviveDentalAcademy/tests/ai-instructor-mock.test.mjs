import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { instructorMockDefaults, getInstructorReadiness } from '../src/lib/ai-twin/instructorMock.ts';

const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

test('mock defaults never enable generation or consent', () => {
  assert.equal(instructorMockDefaults.ownsLikeness, false);
  assert.equal(instructorMockDefaults.understandsPrivacy, false);
  assert.equal(getInstructorReadiness(instructorMockDefaults).canGenerate, false);
  assert.equal(getInstructorReadiness(instructorMockDefaults).aiEnabled, false);
});
test('checking demo consent cannot activate models or uploads', () => {
  const status = getInstructorReadiness({ ...instructorMockDefaults, ownsLikeness: true, understandsPrivacy: true });
  assert.equal(status.consentChecklistComplete, true);
  assert.equal(status.portraitAvailable, false);
  assert.equal(status.voiceAvailable, false);
  assert.equal(status.canGenerate, false);
});
test('UI has no storage, network, camera or file upload paths', () => {
  const source = read('../src/pages/AiInstructorSetup.tsx');
  for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'supabase', 'getUserMedia', 'type="file"', 'FormData(', 'navigator.mediaDevices']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.match(source, /disabled/);
  assert.match(source, /My AI Instructor/);
});
test('instructor route is admin-gated and original storyboard remains registered', () => {
  const app = read('../src/App.tsx');
  assert.match(app, /path="\/admin\/ai-instructor"/);
  assert.match(app, /<AdminInstructorRoute\s*\/>/);
  assert.match(app, /path="\/ai-twin-prototype-preview"/);
});
