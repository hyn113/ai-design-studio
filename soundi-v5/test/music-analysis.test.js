const assert = require('node:assert/strict');
const SoundiMoodAI = require('../music-analysis');

const NOTE_ORDER = [
  ['si', 'B', 11],
  ['la', 'A', 9],
  ['sol', 'G', 7],
  ['fa', 'F', 5],
  ['mi', 'E', 4],
  ['re', 'D', 2],
  ['do', 'C', 0]
];

function buildNotes() {
  const notes = [];
  for (let octave = 8; octave >= 1; octave -= 1) {
    NOTE_ORDER.forEach(([key, label, semitone]) => {
      const midi = 12 * (octave + 1) + semitone;
      notes.push({
        id: `${key}${octave}`,
        key,
        label,
        octave,
        midi,
        color: '#ffffff'
      });
    });
  }
  return notes;
}

function expand(items) {
  return items.flatMap(([noteId, step, duration = 1], index) => Array.from({ length: duration }, (_, offset) => ({
    id: `${index}-${offset}`,
    noteId,
    step: step + offset,
    accidental: 0
  })));
}

const notes = buildNotes();

const brightPattern = expand([
  ['do5', 0, 1], ['mi5', 1, 1], ['sol5', 2, 1], ['do6', 3, 1],
  ['do5', 4, 1], ['mi5', 5, 1], ['sol5', 6, 1], ['do6', 7, 1]
]);

const calmPattern = expand([
  ['do3', 0, 6], ['sol3', 8, 6], ['mi3', 16, 6], ['sol3', 24, 6],
  ['do4', 32, 8]
]);

const tensePattern = expand([
  ['do4', 0, 2], ['re4', 0, 2], ['fa4', 4, 2], ['si4', 4, 2],
  ['do5', 8, 1], ['do4', 9, 1], ['fa4', 10, 1], ['si4', 11, 1]
]);

function assertFeatureRange(features) {
  Object.entries(features).forEach(([key, value]) => {
    if (key === 'raw' || key === 'noteCount' || key === 'blockCount' || key === 'stepCount' || key === 'activeStepCount') return;
    assert.ok(value >= 0 && value <= 1, `${key} should be normalized, got ${value}`);
  });
}

{
  const result = SoundiMoodAI.analyzeMusicMood([], notes, { stepCount: 64 });
  assert.equal(result.status, 'insufficient');
  assert.equal(result.reasons[0], 'not-enough-notes');
}

{
  const result = SoundiMoodAI.analyzeMusicMood(brightPattern, notes, { stepCount: 64 });
  assert.equal(result.status, 'ready');
  assertFeatureRange(result.features);
  assert.ok(SoundiMoodAI.MOODS.includes(result.primaryMood));
  assert.ok(result.energy > 0.35);
}

{
  const result = SoundiMoodAI.analyzeMusicMood(calmPattern, notes, { stepCount: 64 });
  assert.equal(result.status, 'ready');
  assert.ok(result.features.longNoteRatio > result.features.shortNoteRatio);
  assert.ok(result.energy < 0.45);
}

{
  const result = SoundiMoodAI.analyzeMusicMood(tensePattern, notes, { stepCount: 64 });
  assert.equal(result.status, 'ready');
  assert.ok(result.tension > 0.2);
}

{
  const result = SoundiMoodAI.analyzeMusicMood(brightPattern, notes, { stepCount: 64 });
  const a = SoundiMoodAI.createFeedbackSentence(result, 'ko');
  const b = SoundiMoodAI.createFeedbackSentence(result, 'ko');
  assert.equal(a, b);
  assert.ok(a.length > 20);
}

console.log('music-analysis tests passed');
