let STEP_COUNT = 64;
const STORAGE_KEY = 'soundi-archive';
const SCALE_KEYS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
const MAX_OCTAVE = 8;
const MIN_OCTAVE = 0;
let highestOctave = 5;
let lowestOctave = 3;
const NOTE_ORDER = [
  ['si', '시', 11],
  ['la', '라', 9],
  ['sol', '솔', 7],
  ['fa', '파', 5],
  ['mi', '미', 4],
  ['re', '레', 2],
  ['do', '도', 0]
];
const BPM = 96;
const LOOP_GAP_MS = 0;
const HARMONY_TYPES = {
  major: { label: 'Major Triad', intervals: [0, 4, 7], maxSuggestions: 2 },
  minor: { label: 'Minor Triad', intervals: [0, 3, 7], maxSuggestions: 2 },
  suspended: { label: 'Suspended Chord', intervalSets: [[0, 2, 7], [0, 5, 7]], maxSuggestions: 2 },
  fifth: { label: 'Perfect Fifth', intervals: [0, 7], maxSuggestions: 1, maxNotes: 2 },
  octave: { label: 'Octave', octave: true, maxSuggestions: 1, maxNotes: 2 }
};

const noteColors = {
  do: '#ff3b30',
  re: '#ff7a00',
  mi: '#ffdc21',
  fa: '#00c900',
  sol: '#65d2ee',
  la: '#3f6df6',
  si: '#854cf5'
};

const palettes = {
  bright: {
    name: 'Bright rhythmic tone',
    vars: ['#fff7ad', '#f4f4f4', '#ffffff'],
    marks: ['#ffd92f', '#ff3f55', '#2a8bdc', '#32c6c2'],
    sphere: ['#fff4a5', '#bdf569', '#ffb36f', '#f6f6f6']
  },
  moon: {
    name: 'Slow blue tone',
    vars: ['#dcecff', '#f6f9ff', '#ffffff'],
    marks: ['#6f9fe7', '#a9c8ff', '#d7e7ff', '#5579b9'],
    sphere: ['#dbeaff', '#9dbdff', '#7b75c9', '#f7f8ff']
  },
  warm: {
    name: 'Warm balanced tone',
    vars: ['#fff0dc', '#f7f7f7', '#ffffff'],
    marks: ['#ff9d2e', '#f15b48', '#e7c62f', '#5aa576'],
    sphere: ['#ffe4b8', '#ffb0a7', '#f7d76f', '#f4f4f4']
  },
  sparse: {
    name: 'Quiet sparse tone',
    vars: ['#f6f6f6', '#ffffff', '#eef3f1'],
    marks: ['#c8ddd7', '#f1d7cf', '#90b7a9', '#efe681'],
    sphere: ['#eeeeee', '#d8e6e0', '#f1d7cf', '#ffffff']
  }
};

let notes = buildNotes();
const app = document.querySelector('.app');
const composeView = document.getElementById('composeView');
const scoreGrid = document.getElementById('scoreGrid');
const scoreScroll = document.querySelector('.score-scroll');
const playButton = document.getElementById('playButton');
const saveButton = document.getElementById('saveButton');
const clearButton = document.getElementById('clearButton');
const middleNotesButton = document.getElementById('middleNotesButton');
const guideButton = document.getElementById('guideButton');
const harmonyTypeControl = document.getElementById('harmonyTypeControl');
const harmonyTypeButton = document.getElementById('harmonyTypeButton');
const harmonyTypeMenu = document.getElementById('harmonyTypeMenu');
const exampleButton = document.getElementById('exampleButton');
const exampleName = document.getElementById('exampleName');
const compositionDuration = document.getElementById('compositionDuration');
const archiveGrid = document.getElementById('archiveGrid');
const playhead = document.getElementById('playhead');
const visualStage = document.getElementById('visualStage');
const visualMarks = document.getElementById('visualMarks');
const visualCaption = document.getElementById('visualCaption');
const feedbackCard = document.getElementById('feedbackCard');
const resizeHandle = document.getElementById('resizeHandle');
const sideTabButton = document.getElementById('sideTabButton');
const sidePanel = document.getElementById('sidePanel');
const closePanelButton = document.getElementById('closePanelButton');
const revealItems = document.querySelectorAll('.reveal');
const customCursor = document.getElementById('customCursor');

let composition = [];
let audioContext = null;
let playTimer = null;
let playStep = 0;
let isPlaying = false;
let isResizing = false;
let isSectionScrolling = false;
let cursorHintTimer = null;
let controlHintExitTimer = null;
let activeCursorHintGroup = null;
let lastPointerX = 0;
let lastPointerY = 0;
let archiveItems = loadArchive();
let editingArchiveId = null;
let playbackAnalysis = null;
let captionTimer = null;
let captionIndex = 0;
let guideEnabled = true;
let harmonyType = 'major';
let lastSelectedNoteId = null;
let lastSelectedStep = null;
let currentExampleIndex = 0;
let isExampleMode = false;
let draftComposition = [];
let draftStepCount = STEP_COUNT;
let draftTitle = 'Untitled';
let compositionTitle = 'Untitled';
let undoStack = [];
let gridDragState = null;

const controlIcons = {
  play: '<svg class="is-fill-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M17 12L32 22L17 32Z"></path></svg>',
  pause: '<svg class="is-fill-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M15 13H20V31H15Z"></path><path d="M24 13H29V31H24Z"></path></svg>',
  prev: '<svg class="is-fill-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M14 12H18V32H14Z"></path><path d="M32 12L18 22L32 32Z"></path></svg>',
  next: '<svg class="is-fill-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M26 12H30V32H26Z"></path><path d="M12 12L26 22L12 32Z"></path></svg>',
  save: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 10V28"></path><path d="M14 20L22 28L30 20"></path><path d="M13 34H31"></path></svg>',
  clear: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M32 22C32 27.5 27.5 32 22 32C16.5 32 12 27.5 12 22C12 16.5 16.5 12 22 12C25.1 12 27.9 13.4 29.7 15.7"></path><path d="M31 10V17H24"></path></svg>'
};

const exampleCompositions = [
  {
    title: 'Twinkle Twinkle',
    notes: [
      ['do4', 0, 2], ['do4', 2, 2], ['sol4', 4, 2], ['sol4', 6, 2], ['la4', 8, 2], ['la4', 10, 2], ['sol4', 12, 4],
      ['fa4', 16, 2], ['fa4', 18, 2], ['mi4', 20, 2], ['mi4', 22, 2], ['re4', 24, 2], ['re4', 26, 2], ['do4', 28, 4],
      ['do3', 0, 8], ['sol3', 8, 8], ['fa3', 16, 8], ['do3', 24, 8]
    ]
  },
  {
    title: 'Canon Shape',
    notes: [
      ['do4', 0], ['mi4', 1], ['sol4', 2], ['do5', 3], ['sol4', 4], ['mi4', 5], ['do4', 6], ['sol3', 7],
      ['sol3', 8], ['si3', 9], ['re4', 10], ['sol4', 11], ['re4', 12], ['si3', 13], ['sol3', 14], ['re3', 15],
      ['la3', 16], ['do4', 17], ['mi4', 18], ['la4', 19], ['mi4', 20], ['do4', 21], ['la3', 22], ['mi3', 23],
      ['fa3', 24], ['la3', 25], ['do4', 26], ['fa4', 27], ['do4', 28], ['la3', 29], ['fa3', 30], ['do3', 31]
    ]
  },
  {
    title: 'Minuet in G',
    notes: [
      ['sol4', 0], ['do5', 2], ['re5', 4], ['mi5', 6], ['fa5', 8], ['sol5', 10], ['do5', 12], ['do5', 14],
      ['la4', 16], ['fa5', 18], ['sol5', 20], ['la5', 22], ['si5', 24], ['do5', 26], ['do5', 28, 2],
      ['do4', 0, 4], ['mi4', 8, 4], ['fa4', 16, 4], ['sol4', 24, 4]
    ]
  },
  {
    title: 'Air Pattern',
    notes: [
      ['do4', 0, 4], ['mi4', 4, 4], ['sol4', 8, 4], ['mi4', 12, 4],
      ['fa4', 16, 4], ['la4', 20, 4], ['sol4', 24, 4], ['mi4', 28, 4],
      ['do3', 0, 8], ['sol3', 8, 8], ['fa3', 16, 8], ['sol3', 24, 8]
    ]
  },
  {
    title: 'Gymnopedie Echo',
    notes: [
      ['mi4', 0, 3], ['sol4', 4, 3], ['la4', 8, 4], ['sol4', 14, 2],
      ['mi4', 16, 3], ['re4', 20, 3], ['do4', 24, 4], ['re4', 30, 2],
      ['la3', 0, 6], ['do4', 0, 6], ['mi4', 0, 6],
      ['sol3', 16, 6], ['si3', 16, 6], ['re4', 16, 6]
    ]
  }
];

function buildNotes() {
  highestOctave = Math.min(MAX_OCTAVE, highestOctave);
  lowestOctave = Math.max(MIN_OCTAVE, lowestOctave);
  const result = [];
  for (let octave = highestOctave; octave >= lowestOctave; octave -= 1) {
    NOTE_ORDER.forEach(([key, label, semitone]) => {
      const midi = 12 * (octave + 1) + semitone;
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      result.push({
        id: `${key}${octave}`,
        key,
        label,
        octave,
        midi,
        frequency,
        color: noteColors[key]
      });
    });
  }
  return result;
}

function render() {
  const previousScrollLeft = scoreScroll?.scrollLeft || 0;
  scoreGrid.style.setProperty('--step-count', STEP_COUNT);
  scoreGrid.style.setProperty('--note-count', notes.length);
  scoreGrid.innerHTML = '';

  notes.forEach((note) => {
    for (let step = 0; step < STEP_COUNT; step += 1) {
      const cell = document.createElement('button');
      const active = hasNote(note.id, step);
      const suggested = isHarmonySuggestion(note.id, step, active);
      const cellClasses = [
        'grid-cell',
        active ? 'is-filled' : '',
        suggested ? 'is-suggested' : '',
        note.octave === 4 ? 'is-reference-octave' : '',
        step % 4 === 0 ? 'is-beat-line' : '',
        step % 8 === 0 ? 'is-measure-line' : '',
        note.key === 'si' ? 'is-octave-start' : ''
      ].filter(Boolean).join(' ');
      cell.type = 'button';
      cell.className = cellClasses;
      cell.dataset.noteId = note.id;
      cell.dataset.step = String(step);
      if (note.octave === 4) cell.dataset.hint = 'This soft gray<br />area is middle notes';
      cell.style.setProperty('--note-color', note.color);
      cell.setAttribute('aria-label', `${note.label}${note.octave} ${step + 1}번째 칸`);
      cell.addEventListener('pointerdown', (event) => beginGridDrag(event, note.id, step));
      cell.addEventListener('pointerenter', () => continueGridDrag(note.id, step));
      scoreGrid.appendChild(cell);
    }
  });

  renderAnalysis();
  updateDurationDisplay();
  if (scoreScroll) scoreScroll.scrollLeft = previousScrollLeft;
}

function isHarmonySuggestion(noteId, step, active) {
  if (!guideEnabled || active || lastSelectedStep !== step || !lastSelectedNoteId || !hasNote(lastSelectedNoteId, lastSelectedStep)) return false;
  const type = HARMONY_TYPES[harmonyType];
  if (getStepNoteCount(step) >= (type?.maxNotes || 3)) return false;
  return getHarmonySuggestionIds(lastSelectedNoteId).includes(noteId);
}

function getHarmonySuggestionIds(noteId) {
  const selected = notes.find((note) => note.id === noteId);
  const type = HARMONY_TYPES[harmonyType];
  if (!selected || !type) return [];
  if (type.octave) return getOctaveSuggestionIds(selected).slice(0, type.maxSuggestions || 1);
  const intervalSets = type.intervalSets || [type.intervals];
  const suggestions = intervalSets.flatMap((intervals) => getChordToneIdsForType(selected, intervals, type.maxSuggestions || 2));
  return [...new Set(suggestions)].slice(0, type.maxSuggestions || 2);
}

function getChordToneIdsForType(selected, intervals, maxSuggestions = 2) {
  const selectedPitch = ((selected.midi % 12) + 12) % 12;
  const matches = [];
  notes.forEach((root) => {
    const chordPitches = intervals.map((interval) => (root.midi + interval) % 12);
    if (!chordPitches.includes(selectedPitch)) return;
    const direction = getHarmonyDirection(selected);
    const toneIds = intervals
      .map((interval) => getNearestPitchClassId(selected, (root.midi + interval) % 12, direction))
      .filter(Boolean)
      .filter((id) => id !== selected.id);
    if (toneIds.length >= Math.min(2, maxSuggestions)) matches.push(...toneIds);
  });
  return [...new Set(matches)].slice(0, maxSuggestions);
}

function getOctaveSuggestionIds(selected) {
  const direction = getHarmonyDirection(selected);
  return notes
    .filter((note) => note.key === selected.key && note.id !== selected.id)
    .map((note) => ({ note, distance: Math.abs(note.octave - selected.octave), direction: Math.sign(note.midi - selected.midi) }))
    .sort((a, b) => scoreDirection(a, direction) - scoreDirection(b, direction) || a.distance - b.distance || a.note.midi - b.note.midi)
    .map((item) => item.note.id);
}

function getHarmonyDirection(selected) {
  if (selected.octave >= 5) return 'below';
  if (selected.octave <= 3) return 'above';
  return 'nearest';
}

function scoreDirection(item, direction) {
  if (direction === 'above') return item.direction > 0 ? 0 : 1;
  if (direction === 'below') return item.direction < 0 ? 0 : 1;
  return 0;
}

function getNearestPitchClassId(selected, pitchClass, direction = 'nearest') {
  const candidates = notes
    .filter((note) => ((note.midi % 12) + 12) % 12 === pitchClass)
    .map((note) => ({ note, distance: Math.abs(note.midi - selected.midi), direction: Math.sign(note.midi - selected.midi) }))
    .sort((a, b) => scoreDirection(a, direction) - scoreDirection(b, direction) || a.distance - b.distance || a.note.midi - b.note.midi);
  return candidates[0]?.note.id;
}

function getNearestChordToneIds(selected, key) {
  const candidates = notes
    .filter((note) => note.key === key)
    .map((note) => ({ note, distance: note.midi - selected.midi }))
    .filter((item) => item.distance !== 0);
  const above = candidates.filter((item) => item.distance > 0).sort((a, b) => a.distance - b.distance)[0]?.note.id;
  const below = candidates.filter((item) => item.distance < 0).sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance))[0]?.note.id;
  return [above, below].filter(Boolean);
}

function hasNote(noteId, step) {
  return composition.some((item) => item.noteId === noteId && item.step === step);
}

function getStepNoteCount(step) {
  return composition.filter((item) => item.step === step).length;
}

function shouldKeepHarmonyAnchor(noteId, step) {
  return guideEnabled
    && lastSelectedNoteId
    && lastSelectedStep === step
    && getHarmonySuggestionIds(lastSelectedNoteId).includes(noteId);
}

function updateHarmonyAnchorAfterEdit(noteId, step, shouldFill, keptAnchor) {
  if (!guideEnabled) return;
  if (!shouldFill && noteId === lastSelectedNoteId && step === lastSelectedStep) {
    lastSelectedNoteId = null;
    lastSelectedStep = null;
    return;
  }
  if (shouldFill && !keptAnchor) {
    lastSelectedNoteId = noteId;
    lastSelectedStep = step;
  }
  if (lastSelectedStep !== step || !lastSelectedNoteId) return;
  const suggestions = getHarmonySuggestionIds(lastSelectedNoteId);
  const type = HARMONY_TYPES[harmonyType];
  const isComplete = getStepNoteCount(step) >= (type?.maxNotes || 3) || (suggestions.length > 0 && suggestions.every((id) => hasNote(id, step)));
  if (isComplete) {
    lastSelectedNoteId = null;
    lastSelectedStep = null;
  }
}

function toggleCell(noteId, step) {
  if (isExampleMode) return;
  pushUndoState();
  applyCellState(noteId, step, !hasNote(noteId, step));
  render();
  flashStep(step, true);
}

function beginGridDrag(event, noteId, step) {
  if (isExampleMode || event.button !== 0) return;
  event.preventDefault();
  pushUndoState();
  gridDragState = {
    noteId,
    shouldFill: !hasNote(noteId, step),
    touched: new Set()
  };
  applyDragCell(noteId, step);
  window.addEventListener('pointerup', endGridDrag, { once: true });
}

function continueGridDrag(noteId, step) {
  if (!gridDragState || gridDragState.noteId !== noteId) return;
  applyDragCell(noteId, step);
}

function applyDragCell(noteId, step) {
  if (!gridDragState) return;
  const key = noteId + ':' + step;
  if (gridDragState.touched.has(key)) return;
  gridDragState.touched.add(key);
  applyCellState(noteId, step, gridDragState.shouldFill);
  const cell = scoreGrid.querySelector('[data-note-id="' + noteId + '"][data-step="' + step + '"]');
  cell?.classList.toggle('is-filled', gridDragState.shouldFill);
  flashStep(step, true);
}

function endGridDrag() {
  if (!gridDragState) return;
  gridDragState = null;
  sortComposition();
  render();
}

function applyCellState(noteId, step, shouldFill) {
  const index = composition.findIndex((item) => item.noteId === noteId && item.step === step);
  const keptAnchor = shouldKeepHarmonyAnchor(noteId, step);
  if (shouldFill && index < 0) {
    composition.push({
      id: 'n-' + Date.now() + '-' + Math.round(Math.random() * 9999),
      noteId,
      step
    });
  } else if (!shouldFill && index >= 0) {
    composition.splice(index, 1);
  }
  sortComposition();
  updateHarmonyAnchorAfterEdit(noteId, step, shouldFill, keptAnchor);
}

function sortComposition() {
  composition.sort((a, b) => a.step - b.step || notes.findIndex((note) => note.id === a.noteId) - notes.findIndex((note) => note.id === b.noteId));
}

function analyzeComposition() {
  const activeSteps = [...new Set(composition.map((item) => item.step))].sort((a, b) => a - b);
  const noteIndexes = composition.map((item) => notes.findIndex((note) => note.id === item.noteId));
  const density = composition.length / STEP_COUNT;
  const activity = activeSteps.length / STEP_COUNT;
  const highRatio = noteIndexes.filter((index) => index >= 0 && index < notes.length * 0.34).length / Math.max(1, composition.length);
  const lowRatio = noteIndexes.filter((index) => index >= notes.length * 0.66).length / Math.max(1, composition.length);
  const averageGap = activeSteps.length > 1
    ? activeSteps.slice(1).reduce((sum, step, index) => sum + step - activeSteps[index], 0) / (activeSteps.length - 1)
    : STEP_COUNT;
  const repetition = getMostRepeatedNote();
  const chordSteps = activeSteps.filter((step) => composition.filter((item) => item.step === step).length >= 2).length;
  const rhythmic = density > 0.34 || averageGap <= 2;
  const moonlike = density < 0.24 && lowRatio >= highRatio && averageGap >= 3;
  const sparse = density < 0.14;
  const paletteKey = rhythmic ? 'bright' : moonlike ? 'moon' : sparse ? 'sparse' : 'warm';

  return {
    activeSteps,
    density,
    activity,
    highRatio,
    lowRatio,
    averageGap,
    repetition,
    chordSteps,
    palette: palettes[paletteKey],
    paletteKey
  };
}

function renderAnalysis(activeStep = -1) {
  const analysis = isPlaying && playbackAnalysis ? playbackAnalysis : analyzeComposition();
  const [toneA, toneB, toneC] = analysis.palette.vars;
  [document.documentElement, visualStage].forEach((target) => {
    target.style.setProperty('--tone-a', toneA);
    target.style.setProperty('--tone-b', toneB);
    target.style.setProperty('--tone-c', toneC);
  });
  visualStage.style.setProperty('--focus-x', `${30 + analysis.highRatio * 48}%`);
  visualStage.style.setProperty('--focus-y', `${68 - analysis.lowRatio * 38}%`);

  renderMoodBlob(analysis, activeStep);
  renderFeedback(analysis);
}

function renderMoodBlob(analysis, activeStep = -1) {
  if (!visualMarks.querySelector('.mood-core')) {
    visualMarks.innerHTML = [
      '<span class="mark mood-core"></span>',
      '<span class="mark-ring ring-one"></span>',
      '<span class="mark-ring ring-two"></span>',
      '<span class="mark-particle particle-one"></span>',
      '<span class="mark-particle particle-two"></span>',
      '<span class="mark-particle particle-three"></span>'
    ].join('');
  }
  const blob = visualMarks.querySelector('.mood-core');
  const soundingItems = isPlaying
    ? composition.filter((item) => {
      const sequenceLength = getSustainLength(item.noteId, item.step);
      const isContinuation = item.step > 0 && hasNote(item.noteId, item.step - 1);
      return !isContinuation && activeStep >= item.step && activeStep < item.step + sequenceLength;
    })
    : [];
  const activeItems = soundingItems.length ? soundingItems : composition;
  const noteIndexes = activeItems.map((item) => notes.findIndex((note) => note.id === item.noteId)).filter((index) => index >= 0);
  const averageNoteIndex = noteIndexes.length
    ? noteIndexes.reduce((sum, index) => sum + index, 0) / noteIndexes.length
    : (notes.length - 1) / 2;
  const activeLengths = activeItems.map((item) => getSustainLength(item.noteId, item.step));
  const averageLength = activeLengths.length
    ? activeLengths.reduce((sum, length) => sum + length, 0) / activeLengths.length
    : 2;
  const chordCount = activeStep >= 0 ? composition.filter((item) => item.step === activeStep).length : analysis.chordSteps;
  const [color, color2, color3, color4] = getMoodSphereColors(analysis, averageLength, chordCount);
  visualStage.style.setProperty('--mark-color', color);
  visualStage.style.setProperty('--mark-color-2', color2);
  visualStage.style.setProperty('--mark-color-3', color3);
  visualStage.style.setProperty('--mark-color-4', color4);
  const pitchLift = noteIndexes.length ? 1 - (averageNoteIndex / Math.max(1, notes.length - 1)) : 0.5;
  const beatScale = Math.min(1.28, 0.94 + (chordCount * 0.08) + (averageLength * 0.025));
  visualStage.style.setProperty('--beat-scale', beatScale.toFixed(2));
  visualStage.style.setProperty('--particle-y', `${68 - pitchLift * 42}%`);
  visualStage.classList.toggle('has-active-sound', soundingItems.length > 0);

  blob.className = `mark mood-core mood-${analysis.paletteKey}`;
  blob.style.setProperty('--x', '50%');
  blob.style.setProperty('--y', '39%');
  blob.style.setProperty('--w', '248px');
  blob.style.setProperty('--h', '248px');
  blob.style.setProperty('--rotate', '0deg');
  blob.style.setProperty('--opacity', '1');
  blob.style.setProperty('--mark-color', color);
  blob.style.setProperty('--mark-color-2', color2);
  blob.style.setProperty('--mark-color-3', color3);
  blob.style.setProperty('--mark-color-4', color4);
  blob.style.setProperty('--gradient-duration', `${analysis.paletteKey === 'bright' ? 7600 : analysis.paletteKey === 'moon' ? 13200 : 10400}ms`);
  blob.style.setProperty('--shape-duration', `${analysis.paletteKey === 'bright' ? 8200 : analysis.paletteKey === 'moon' ? 14200 : 10800}ms`);
}

function getMoodSphereColors(analysis, sequenceLength, chordCount = 0) {
  const base = analysis.palette.sphere || analysis.palette.marks;
  if (chordCount >= 2) {
    return [
      mixHex(base[0], base[1], 0.18),
      mixHex(base[1], base[2], 0.24),
      mixHex(base[2], base[3] || '#ffffff', 0.2),
      mixHex(base[3] || '#ffffff', base[0], 0.18)
    ];
  }
  if (sequenceLength >= 4) {
    return [
      mixHex(base[0], '#ffffff', 0.08),
      base[1],
      mixHex(base[2], '#ffffff', 0.16),
      base[3] || '#ffffff'
    ];
  }
  return base;
}

function getMappedNoteColor(note, sequenceLength, analysis) {
  let color = note.color;
  if (note.octave <= 3) color = mixHex(color, '#111111', 0.34);
  if (note.octave >= 5) color = mixHex(color, '#ffffff', 0.28);
  if (sequenceLength >= 4) color = mixHex(color, analysis.palette.marks[1] || color, 0.2);
  return color;
}

function mixHex(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function renderFeedback(analysis) {
  feedbackCard.innerHTML = '';
}

function getMostRepeatedNote() {
  const counts = composition.reduce((result, item) => {
    result[item.noteId] = (result[item.noteId] || 0) + 1;
    return result;
  }, {});
  const [noteId, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  if (!noteId || count < 2) return null;
  const note = notes.find((item) => item.id === noteId);
  return { ...note, count };
}

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function getStepIntervalSeconds() {
  return (60 / BPM) / 2;
}

function getSustainLength(noteId, step) {
  let length = 1;
  while (step + length < STEP_COUNT && hasNote(noteId, step + length)) {
    length += 1;
  }
  return length;
}

function playPianoLikeNote(note, sustainSteps = 1) {
  ensureAudio();
  const now = audioContext.currentTime;
  const duration = Math.max(0.38, sustainSteps * getStepIntervalSeconds());
  const master = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const cutoff = Math.min(18000, Math.max(2200, note.frequency * 3.2));
  const outputGain = note.frequency < 65 ? 0.22 : note.frequency > 6000 ? 0.12 : 0.16;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(outputGain, now + 0.018);
  master.gain.setValueAtTime(outputGain, now + Math.max(0.02, duration - 0.08));
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.16);
  filter.connect(master).connect(audioContext.destination);

  [
    { ratio: 1, gain: note.frequency < 45 ? 0.38 : 0.55, type: 'triangle' },
    { ratio: 2.01, gain: note.frequency < 65 ? 0.28 : 0.18, type: 'sine' },
    { ratio: 3.01, gain: note.frequency < 65 ? 0.14 : 0.09, type: 'sine' },
    { ratio: 4.02, gain: note.frequency < 65 ? 0.07 : 0.045, type: 'sine' }
  ].forEach((partial) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(note.frequency * partial.ratio, now);
    gain.gain.setValueAtTime(partial.gain, now);
    gain.gain.setValueAtTime(partial.gain, now + Math.max(0.02, duration - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.16);
    oscillator.connect(gain).connect(filter);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.18);
  });
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  ensureAudio();
  playbackAnalysis = analyzeComposition();
  isPlaying = true;
  composeView.classList.add('is-playing');
  playStep = getLoopBounds().start;
  playButton.classList.add('is-playing');
  playButton.setAttribute('aria-pressed', 'true');
  syncControlButtons();
  startCaptionCycle(playbackAnalysis);
  tickPlayback();
}

function tickPlayback() {
  if (!isPlaying) return;
  const interval = getStepIntervalSeconds() * 1000;
  const loopBounds = getLoopBounds();
  flashStep(playStep, false);
  playStep += 1;
  if (playStep >= loopBounds.end) {
    playhead.style.setProperty('--progress', '100%');
    playTimer = window.setTimeout(() => {
      playStep = loopBounds.start;
      tickPlayback();
    }, LOOP_GAP_MS);
    return;
  }
  playTimer = window.setTimeout(tickPlayback, interval);
}

function getLoopBounds() {
  if (!composition.length) return { start: 0, end: STEP_COUNT };
  const starts = composition.map((item) => item.step);
  const ends = composition.map((item) => item.step + getSustainLength(item.noteId, item.step));
  return {
    start: Math.min(...starts),
    end: Math.max(...ends)
  };
}

function flashStep(step, audition) {
  const active = composition.filter((item) => item.step === step);
  document.querySelectorAll('.grid-cell').forEach((cell) => {
    cell.classList.toggle('is-playing', Number(cell.dataset.step) === step);
  });
  const loopBounds = isPlaying ? getLoopBounds() : { start: 0, end: STEP_COUNT };
  const loopLength = Math.max(1, loopBounds.end - loopBounds.start);
  playhead.style.setProperty('--progress', `${((step - loopBounds.start + 1) / loopLength) * 100}%`);
  if (audition || isPlaying) {
    active.forEach((item) => {
      if (!audition && step > 0 && hasNote(item.noteId, step - 1)) return;
      const note = notes.find((entry) => entry.id === item.noteId);
      if (note) playPianoLikeNote(note, audition ? 1 : getSustainLength(item.noteId, step));
    });
  }
  renderAnalysis(step);
}

function stopPlayback() {
  isPlaying = false;
  playbackAnalysis = null;
  window.clearTimeout(playTimer);
  stopCaptionCycle();
  composeView.classList.remove('is-playing');
  playButton.classList.remove('is-playing');
  playButton.setAttribute('aria-pressed', 'false');
  syncControlButtons();
  playhead.style.setProperty('--progress', '0%');
  document.querySelectorAll('.grid-cell').forEach((cell) => cell.classList.remove('is-playing'));
  renderAnalysis();
}

function startCaptionCycle(analysis) {
  if (!visualCaption) return;
  const phrases = getMoodPhrases(analysis);
  captionIndex = 0;
  const showPhrase = () => {
    visualCaption.textContent = phrases[captionIndex % phrases.length];
    visualCaption.classList.remove('is-visible');
    window.requestAnimationFrame(() => {
      visualCaption.classList.add('is-visible');
    });
    captionIndex += 1;
  };
  window.clearInterval(captionTimer);
  showPhrase();
  captionTimer = window.setInterval(showPhrase, 7000);
}

function stopCaptionCycle() {
  window.clearInterval(captionTimer);
  if (visualCaption) {
    visualCaption.classList.remove('is-visible');
    visualCaption.textContent = '';
  }
}

function getMoodPhrases(analysis) {
  if (!composition.length) return ['Place notes to hear a visual mood.'];
  if (analysis.paletteKey === 'bright') {
    return [
      'This piece feels bright and awake.',
      'It suggests sunlight, quick steps, and clear air.',
      'Short notes create a vivid yellow-green rhythm.'
    ];
  }
  if (analysis.paletteKey === 'moon') {
    return [
      'This piece feels slow and blue.',
      'It brings to mind rain on a quiet night.',
      'Longer notes leave a soft afterimage.'
    ];
  }
  if (analysis.paletteKey === 'sparse') {
    return [
      'This piece feels minimal and spacious.',
      'Silence becomes part of the composition.',
      'The visual mood stays pale and restrained.'
    ];
  }
  return [
    'This piece feels warm and balanced.',
    'It suggests a calm room after sunset.',
    'The rhythm moves gently without rushing.'
  ];
}

function clearComposition() {
  if (!composition.length && compositionTitle === 'Untitled' && !lastSelectedNoteId) return;
  pushUndoState();
  if (isPlaying) stopPlayback();
  composition = [];
  editingArchiveId = null;
  compositionTitle = 'Untitled';
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  updateTitleDisplay();
  render();
  playhead.style.setProperty('--progress', '0%');
}

function loadArchive() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistArchive() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archiveItems));
  } catch {
    // Keep the current in-memory archive usable even if file storage is blocked.
  }
}

function saveComposition() {
  if (!composition.length) {
    flashControl(saveButton);
    return;
  }
  const maxStep = Math.max(...composition.map((item) => item.step), 31);
  const snapshot = {
    id: editingArchiveId || `archive-${Date.now()}`,
    title: getCurrentTitle(),
    createdAt: editingArchiveId ? archiveItems.find((item) => item.id === editingArchiveId)?.createdAt || Date.now() : Date.now(),
    updatedAt: Date.now(),
    stepCount: maxStep + 1,
    composition: composition.map((item) => ({ ...item }))
  };
  const existingIndex = archiveItems.findIndex((item) => item.id === snapshot.id);
  if (existingIndex >= 0) {
    archiveItems.splice(existingIndex, 1, snapshot);
  } else {
    archiveItems.unshift(snapshot);
  }
  editingArchiveId = snapshot.id;
  persistArchive();
  renderArchive();
  flashControl(saveButton);
  setView('archive');
}

function editArchiveItem(id) {
  const item = archiveItems.find((entry) => entry.id === id);
  if (!item) return;
  if (isPlaying) stopPlayback();
  editingArchiveId = item.id;
  compositionTitle = item.title || 'Untitled';
  STEP_COUNT = Math.max(64, item.stepCount || 64);
  composition = item.composition.map((entry) => ({ ...entry }));
  updateTitleDisplay();
  render();
  setView('compose');
}

function deleteArchiveItem(id) {
  archiveItems = archiveItems.filter((item) => item.id !== id);
  if (editingArchiveId === id) editingArchiveId = null;
  persistArchive();
  renderArchive();
}

function renderArchive() {
  if (!archiveGrid) return;
  if (!archiveItems.length) {
    archiveGrid.innerHTML = '<p class="archive-empty">No saved compositions yet.</p>';
    return;
  }
  archiveGrid.innerHTML = archiveItems.map((item) => `
    <article class="archive-card">
      <div class="archive-cd" aria-hidden="true">
        ${renderCdSegments(item)}
      </div>
      <div class="archive-info">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${item.composition.length} blocks</span>
      </div>
      <div class="archive-actions">
        <button type="button" data-edit-id="${item.id}">Edit</button>
        <button type="button" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>
  `).join('');
  archiveGrid.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.addEventListener('click', () => editArchiveItem(button.dataset.editId));
  });
  archiveGrid.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => deleteArchiveItem(button.dataset.deleteId));
  });
}

function renderCdSegments(item) {
  const trackCount = notes.length;
  const lastFilledStep = item.composition.reduce((max, entry) => Math.max(max, entry.step), 0);
  const stepCount = Math.max(1, lastFilledStep + 1);
  const segments = item.composition.map((entry) => {
    const noteIndex = notes.findIndex((note) => note.id === entry.noteId);
    if (noteIndex < 0) return '';
    const note = notes[noteIndex];
    const radius = 49 + (noteIndex / Math.max(1, trackCount - 1)) * 42;
    const length = getSavedSustainLength(item.composition, entry.noteId, entry.step, stepCount);
    const isContinuation = entry.step > 0 && item.composition.some((saved) => saved.noteId === entry.noteId && saved.step === entry.step - 1);
    if (isContinuation) return '';
    const angle = (entry.step / stepCount) * 360 - 90;
    const sweep = Math.max(2.2, (length / stepCount) * 326);
    const dash = `${sweep} ${360 - sweep}`;
    return `<circle class="cd-segment" cx="120" cy="120" r="${radius.toFixed(2)}" pathLength="360" stroke="${note.color}" stroke-dasharray="${dash}" stroke-dashoffset="${(-angle).toFixed(2)}"></circle>`;
  }).join('');
  return `
    <span class="cd-shine"></span>
    <svg class="cd-map" viewBox="0 0 240 240" role="img" aria-label="composition cd map">
      <circle class="cd-guide" cx="120" cy="120" r="52"></circle>
      ${segments}
    </svg>
    <span class="cd-hole"></span>
  `;
}

function getSavedSustainLength(items, noteId, step, stepCount) {
  let length = 1;
  while (step + length < stepCount && items.some((item) => item.noteId === noteId && item.step === step + length)) {
    length += 1;
  }
  return length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function extendScoreIfNeeded() {
  if (!scoreScroll) return;
  const remainingX = scoreScroll.scrollWidth - scoreScroll.clientWidth - scoreScroll.scrollLeft;
  let addedTop = false;
  let changed = false;
  if (remainingX <= 480) {
    STEP_COUNT += 32;
    changed = true;
  }
  if (scoreScroll.scrollTop <= 96 && highestOctave < MAX_OCTAVE) {
    highestOctave += 1;
    addedTop = true;
    changed = true;
  }
  const remainingY = scoreScroll.scrollHeight - scoreScroll.clientHeight - scoreScroll.scrollTop;
  if (remainingY <= 160 && lowestOctave > MIN_OCTAVE) {
    lowestOctave -= 1;
    changed = true;
  }
  if (!changed) return;
  const cellSize = getComposeCellSize();
  notes = buildNotes();
  render();
  if (addedTop) scoreScroll.scrollTop += cellSize * NOTE_ORDER.length;
}

function getComposeCellSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--compose-cell')) || 40;
}

function scrollToMiddleNotes() {
  if (!scoreScroll) return;
  const firstMiddleIndex = notes.findIndex((note) => note.octave === 4 && note.key === 'si');
  if (firstMiddleIndex < 0) return;
  const cellSize = getComposeCellSize();
  const middleOffset = firstMiddleIndex * cellSize + (NOTE_ORDER.length * cellSize) / 2;
  const nextTop = Math.max(0, middleOffset - scoreScroll.clientHeight / 2);
  scoreScroll.scrollTo({ top: nextTop, behavior: 'smooth' });
}

function setView(viewName) {
  document.body.dataset.view = viewName;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-active', view.id === `${viewName}View`);
  });
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });
  if (viewName !== 'compose' && isPlaying) stopPlayback();
  if (viewName === 'compose' || viewName === 'home') window.scrollTo({ top: 0, behavior: 'auto' });
  if (viewName === 'home') {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
  if (sidePanel?.classList.contains('is-open')) closeSidePanel();
  updateCursorHint();
}

function openSidePanel() {
  if (!sidePanel || !sideTabButton) return;
  sidePanel.classList.add('is-open');
  sidePanel.setAttribute('aria-hidden', 'false');
  sideTabButton.setAttribute('aria-expanded', 'true');
}

function closeSidePanel() {
  if (!sidePanel || !sideTabButton) return;
  sidePanel.classList.remove('is-open');
  sidePanel.setAttribute('aria-hidden', 'true');
  sideTabButton.setAttribute('aria-expanded', 'false');
}

function initScrollReveals() {
  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  app?.classList.add('is-animated');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    root: null,
    threshold: 0.45
  });

  revealItems.forEach((item) => observer.observe(item));
}

function initSoftSectionScroll() {
  const getSections = () => [...document.querySelectorAll('#homeView.is-active .reveal')];

  window.addEventListener('wheel', (event) => {
    const sections = getSections();
    if (sections.length < 2 || Math.abs(event.deltaY) < 10 || isSectionScrolling) return;

    const positions = sections.map((section) => section.offsetTop - 66);
    const currentY = window.scrollY;
    const currentIndex = positions.reduce((closest, position, index) => {
      const distance = Math.abs(position - currentY);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;

    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(sections.length - 1, Math.max(0, currentIndex + direction));
    if (nextIndex === currentIndex) return;

    event.preventDefault();
    isSectionScrolling = true;
    window.scrollTo({
      top: positions[nextIndex],
      behavior: 'smooth'
    });
    window.setTimeout(() => {
      isSectionScrolling = false;
    }, 900);
  }, { passive: false });
}

function isHomeHeroVisible() {
  return document.getElementById('homeView')?.classList.contains('is-active') && window.scrollY < window.innerHeight * 0.35;
}

function updateCursorHint() {
  if (!customCursor) return;
  activeCursorHintGroup = null;
  window.clearTimeout(cursorHintTimer);
  window.clearTimeout(controlHintExitTimer);
  customCursor.classList.remove('show-hint');
  if (!isHomeHeroVisible()) return;
  setCursorHintText('please<br />scroll');
  cursorHintTimer = window.setTimeout(() => {
    if (!isHomeHeroVisible()) return;
    activeCursorHintGroup = 'home';
    positionCursorHint();
    customCursor.classList.add('show-hint');
  }, 1000);
}

function setCursorHintText(text) {
  const hint = customCursor?.querySelector('.cursor-hint');
  if (!hint) return;
  hint.innerHTML = text;
  requestAnimationFrame(positionCursorHint);
}

function positionCursorHint() {
  if (!customCursor) return;
  const hint = customCursor.querySelector('.cursor-hint');
  if (!hint) return;
  const rect = hint.getBoundingClientRect();
  const margin = 12;
  const defaultX = 14;
  const defaultY = 10;
  const nextX = lastPointerX + defaultX + rect.width > window.innerWidth - margin
    ? -rect.width - defaultX
    : defaultX;
  const nextY = lastPointerY + defaultY + rect.height > window.innerHeight - margin
    ? -rect.height - defaultY
    : defaultY;
  customCursor.style.setProperty('--hint-x', nextX + 'px');
  customCursor.style.setProperty('--hint-y', nextY + 'px');
}

function initCustomCursor() {
  if (!customCursor || window.matchMedia('(pointer: coarse)').matches) return;

  window.addEventListener('pointermove', (event) => {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    customCursor.classList.add('is-visible');
    customCursor.style.left = event.clientX + 'px';
    customCursor.style.top = event.clientY + 'px';
    positionCursorHint();
  });

  window.addEventListener('pointerleave', () => {
    customCursor.classList.remove('is-visible');
  });

  const bindCursorHint = (element) => {
    element.addEventListener('pointerenter', () => {
      window.clearTimeout(cursorHintTimer);
      window.clearTimeout(controlHintExitTimer);
      const wasControlHintVisible = activeCursorHintGroup === 'controls' && customCursor.classList.contains('show-hint');
      setCursorHintText(element.dataset.hint || 'click?');
      activeCursorHintGroup = 'controls';
      if (wasControlHintVisible) return;
      customCursor.classList.remove('show-hint');
      cursorHintTimer = window.setTimeout(() => {
        activeCursorHintGroup = 'controls';
        positionCursorHint();
        customCursor.classList.add('show-hint');
      }, 1000);
    });
    element.addEventListener('pointerleave', (event) => {
      if (event.relatedTarget?.closest?.('.control-button')) return;
      window.clearTimeout(controlHintExitTimer);
      controlHintExitTimer = window.setTimeout(updateCursorHint, 220);
    });
  };

  document.querySelectorAll('.control-button').forEach(bindCursorHint);
  scoreGrid?.addEventListener('pointerover', (event) => {
    const suggestedCell = event.target.closest('.grid-cell.is-suggested');
    const referenceCell = event.target.closest('.grid-cell.is-reference-octave');
    const cell = suggestedCell || referenceCell;
    if (!cell || !scoreGrid.contains(cell)) return;
    window.clearTimeout(cursorHintTimer);
    activeCursorHintGroup = suggestedCell ? 'harmony' : 'reference';
    customCursor.classList.remove('show-hint');
    setCursorHintText(suggestedCell ? 'fits with<br />this note' : (cell.dataset.hint || 'This soft gray<br />area is middle notes'));
    cursorHintTimer = window.setTimeout(() => {
      if (!cell.matches(':hover')) return;
      positionCursorHint();
      customCursor.classList.add('show-hint');
    }, 1000);
  });
  scoreGrid?.addEventListener('pointerout', (event) => {
    if (!event.target.closest('.grid-cell.is-suggested, .grid-cell.is-reference-octave')) return;
    if (event.relatedTarget?.closest?.('.grid-cell.is-suggested, .grid-cell.is-reference-octave')) return;
    updateCursorHint();
  });

  window.addEventListener('scroll', updateCursorHint, { passive: true });
  updateCursorHint();
}

function startResize(event) {
  event.preventDefault();
  isResizing = true;
  document.body.classList.add('is-resizing');
  window.addEventListener('pointermove', resizeAnalysisPanel);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function resizeAnalysisPanel(event) {
  if (!isResizing) return;
  const width = Math.round(window.innerWidth - event.clientX);
  const min = 320;
  const max = Math.round(window.innerWidth * 0.72);
  const nextWidth = Math.min(max, Math.max(min, width));
  document.documentElement.style.setProperty('--analysis-width', `${nextWidth}px`);
}

function stopResize() {
  isResizing = false;
  document.body.classList.remove('is-resizing');
  window.removeEventListener('pointermove', resizeAnalysisPanel);
}

function setGuideEnabled(enabled) {
  guideEnabled = enabled;
  if (!guideEnabled) {
    lastSelectedNoteId = null;
    lastSelectedStep = null;
  }
  guideButton?.classList.toggle('is-active', guideEnabled);
  guideButton?.setAttribute('aria-pressed', String(guideEnabled));
  updateHarmonyTypeControls();
  render();
}

function updateHarmonyTypeControls() {
  if (!harmonyTypeControl || !harmonyTypeButton) return;
  harmonyTypeControl.hidden = !guideEnabled;
  harmonyTypeButton.textContent = HARMONY_TYPES[harmonyType]?.label || 'Major Triad';
  if (!guideEnabled) closeHarmonyTypeMenu();
  harmonyTypeMenu?.querySelectorAll('[data-harmony-type]').forEach((button) => {
    button.setAttribute('aria-checked', String(button.dataset.harmonyType === harmonyType));
  });
}

function openHarmonyTypeMenu() {
  if (!harmonyTypeMenu || !harmonyTypeButton || !guideEnabled) return;
  harmonyTypeMenu.hidden = false;
  harmonyTypeButton.classList.add('is-active');
  harmonyTypeButton.setAttribute('aria-expanded', 'true');
}

function closeHarmonyTypeMenu() {
  if (!harmonyTypeMenu || !harmonyTypeButton) return;
  harmonyTypeMenu.hidden = true;
  harmonyTypeButton.classList.remove('is-active');
  harmonyTypeButton.setAttribute('aria-expanded', 'false');
}

function toggleHarmonyTypeMenu() {
  if (!harmonyTypeMenu || harmonyTypeMenu.hidden) {
    openHarmonyTypeMenu();
    return;
  }
  closeHarmonyTypeMenu();
}

function setHarmonyType(type) {
  if (!HARMONY_TYPES[type]) return;
  harmonyType = type;
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  closeHarmonyTypeMenu();
  updateHarmonyTypeControls();
  render();
}

function setExampleMode(enabled) {
  if (enabled === isExampleMode) return;
  pushUndoState();
  if (enabled) {
    draftComposition = composition.map((item) => ({ ...item }));
    draftStepCount = STEP_COUNT;
    draftTitle = compositionTitle;
    isExampleMode = true;
    document.body.classList.add('is-example-mode');
    exampleButton?.classList.add('is-active');
    exampleButton?.setAttribute('aria-pressed', 'true');
    loadExample(currentExampleIndex, false);
    return;
  }
  if (isPlaying) stopPlayback();
  isExampleMode = false;
  document.body.classList.remove('is-example-mode');
  exampleButton?.classList.remove('is-active');
  exampleButton?.setAttribute('aria-pressed', 'false');
  STEP_COUNT = draftStepCount || 64;
  composition = draftComposition.map((item) => ({ ...item }));
  compositionTitle = draftTitle || 'Untitled';
  editingArchiveId = null;
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  ensureOctaveRangeForComposition();
  updateExampleControls();
  render();
  playhead.style.setProperty('--progress', '0%');
}

function openExampleSongs() {
  setExampleMode(!isExampleMode);
}

function expandExampleNotes(items) {
  return items.flatMap(([noteId, step, length = 1], index) => Array.from({ length }, (_, offset) => ({
    id: 'example-' + currentExampleIndex + '-' + index + '-' + offset,
    noteId,
    step: step + offset
  })));
}

function loadExample(index, pushUndo = true) {
  if (pushUndo) pushUndoState();
  if (isPlaying) stopPlayback();
  currentExampleIndex = (index + exampleCompositions.length) % exampleCompositions.length;
  const example = exampleCompositions[currentExampleIndex];
  const maxStep = Math.max(...example.notes.map(([, step, length = 1]) => step + length), 31);
  STEP_COUNT = Math.max(64, maxStep + 8);
  composition = expandExampleNotes(example.notes);
  editingArchiveId = null;
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  ensureOctaveRangeForComposition();
  updateExampleControls();
  render();
  if (scoreScroll) {
    scoreScroll.scrollLeft = 0;
    scoreScroll.scrollTop = NOTE_ORDER.length * getComposeCellSize();
  }
}

function ensureOctaveRangeForComposition() {
  const octaves = composition.map((item) => Number(item.noteId.match(/-?\d+$/)?.[0])).filter(Number.isFinite);
  if (!octaves.length) return;
  highestOctave = Math.min(MAX_OCTAVE, Math.max(highestOctave, Math.max(...octaves)));
  lowestOctave = Math.max(MIN_OCTAVE, Math.min(lowestOctave, Math.min(...octaves)));
  notes = buildNotes();
}

function updateExampleControls() {
  updateTitleDisplay();
  syncControlButtons();
}

function getCurrentTitle() {
  const title = compositionTitle.trim();
  return title || 'Untitled';
}

function updateTitleDisplay() {
  if (!exampleName) return;
  exampleName.textContent = isExampleMode ? exampleCompositions[currentExampleIndex].title : getCurrentTitle();
  exampleName.classList.remove('is-editing-title');
  exampleName.contentEditable = String(!isExampleMode);
  exampleName.setAttribute('role', isExampleMode ? 'text' : 'textbox');
  exampleName.setAttribute('aria-label', isExampleMode ? 'Example song title' : 'Composition title');
  updateDurationDisplay();
}

function getCompositionDurationSeconds() {
  if (!composition.length) return 0;
  return getLoopBounds().end * getStepIntervalSeconds();
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(remainingSeconds).padStart(2, '0');
}

function updateDurationDisplay() {
  if (!compositionDuration) return;
  compositionDuration.textContent = formatDuration(getCompositionDurationSeconds());
}

function beginTitleEdit() {
  if (isExampleMode || !exampleName) return;
  exampleName.classList.add('is-editing-title');
  exampleName.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(exampleName);
  selection.removeAllRanges();
  selection.addRange(range);
}

function commitTitleEdit() {
  if (!exampleName || isExampleMode) return;
  exampleName.scrollLeft = 0;
  exampleName.classList.remove('is-editing-title');
  const nextTitle = exampleName.textContent.trim() || 'Untitled';
  if (nextTitle !== compositionTitle) pushUndoState();
  compositionTitle = nextTitle;
  updateTitleDisplay();
}

function handleTitleKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    exampleName?.blur();
  }
}

function setControlIcon(button, iconName, label) {
  if (!button) return;
  button.innerHTML = controlIcons[iconName] || '';
  button.setAttribute('aria-label', label);
  button.dataset.icon = iconName;
  const hints = {
    Play: 'click to<br />play',
    Pause: 'click to<br />pause',
    Save: 'save this<br />piece',
    Clear: 'start<br />over',
    'Previous example': 'previous<br />song',
    'Next example': 'next<br />song'
  };
  button.dataset.hint = hints[label] || label.toLowerCase() + '?';
}

function syncControlButtons() {
  setControlIcon(playButton, isPlaying ? 'pause' : 'play', isPlaying ? 'Pause' : 'Play');
  setControlIcon(saveButton, isExampleMode ? 'prev' : 'save', isExampleMode ? 'Previous example' : 'Save');
  setControlIcon(clearButton, isExampleMode ? 'next' : 'clear', isExampleMode ? 'Next example' : 'Clear');
}

function flashControl(button) {
  if (!button) return;
  button.classList.add('is-feedback');
  window.setTimeout(() => button.classList.remove('is-feedback'), 420);
}

function showPreviousExample() {
  loadExample(currentExampleIndex - 1);
}

function showNextExample() {
  loadExample(currentExampleIndex + 1);
}

function pushUndoState() {
  undoStack.push({
    stepCount: STEP_COUNT,
    highestOctave,
    lowestOctave,
    composition: composition.map((item) => ({ ...item })),
    editingArchiveId,
    lastSelectedNoteId,
    lastSelectedStep,
    compositionTitle,
    isExampleMode,
    currentExampleIndex
  });
  if (undoStack.length > 80) undoStack.shift();
}

function undoComposition() {
  const previous = undoStack.pop();
  if (!previous) return;
  if (isPlaying) stopPlayback();
  STEP_COUNT = previous.stepCount;
  highestOctave = Math.min(MAX_OCTAVE, previous.highestOctave);
  lowestOctave = Math.max(MIN_OCTAVE, previous.lowestOctave);
  notes = buildNotes();
  composition = previous.composition.map((item) => ({ ...item }));
  editingArchiveId = previous.editingArchiveId;
  lastSelectedNoteId = previous.lastSelectedNoteId;
  lastSelectedStep = previous.lastSelectedStep;
  compositionTitle = previous.compositionTitle || 'Untitled';
  isExampleMode = previous.isExampleMode;
  currentExampleIndex = previous.currentExampleIndex;
  document.body.classList.toggle('is-example-mode', isExampleMode);
  exampleButton?.classList.toggle('is-active', isExampleMode);
  exampleButton?.setAttribute('aria-pressed', String(isExampleMode));
  updateExampleControls();
  render();
  playhead.style.setProperty('--progress', '0%');
}

function handleKeyboardShortcuts(event) {
  const isUndo = (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
  if (!isUndo) return;
  event.preventDefault();
  undoComposition();
}
document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
playButton.addEventListener('click', togglePlayback);
saveButton.addEventListener('click', () => {
  if (isExampleMode) {
    showPreviousExample();
    return;
  }
  saveComposition();
});
clearButton.addEventListener('click', () => {
  if (isExampleMode) {
    showNextExample();
    return;
  }
  clearComposition();
});
exampleName?.addEventListener('click', beginTitleEdit);
exampleName?.addEventListener('blur', commitTitleEdit);
exampleName?.addEventListener('keydown', handleTitleKeydown);
guideButton?.addEventListener('click', () => setGuideEnabled(!guideEnabled));
harmonyTypeButton?.addEventListener('click', toggleHarmonyTypeMenu);
harmonyTypeMenu?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-harmony-type]');
  if (!button) return;
  setHarmonyType(button.dataset.harmonyType);
});
document.addEventListener('pointerdown', (event) => {
  if (!harmonyTypeControl || harmonyTypeControl.contains(event.target)) return;
  closeHarmonyTypeMenu();
});
exampleButton?.addEventListener('click', openExampleSongs);
middleNotesButton?.addEventListener('click', scrollToMiddleNotes);
window.addEventListener('keydown', handleKeyboardShortcuts);
scoreScroll?.addEventListener('scroll', extendScoreIfNeeded, { passive: true });
resizeHandle.addEventListener('pointerdown', startResize);
sideTabButton?.addEventListener('click', openSidePanel);
closePanelButton?.addEventListener('click', closeSidePanel);

updateHarmonyTypeControls();
updateTitleDisplay();
syncControlButtons();
render();
renderArchive();
initScrollReveals();
initSoftSectionScroll();
initCustomCursor();
