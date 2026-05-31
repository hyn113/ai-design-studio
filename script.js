let STEP_COUNT = 64;
const STORAGE_KEY = 'soundi-archive';
const OCTAVES = [5, 4, 3];
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

const notes = buildNotes();
const app = document.querySelector('.app');
const composeView = document.getElementById('composeView');
const scoreGrid = document.getElementById('scoreGrid');
const scoreScroll = document.querySelector('.score-scroll');
const playButton = document.getElementById('playButton');
const saveButton = document.getElementById('saveButton');
const clearButton = document.getElementById('clearButton');
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
let archiveItems = loadArchive();
let editingArchiveId = null;
let playbackAnalysis = null;
let captionTimer = null;
let captionIndex = 0;

function buildNotes() {
  const result = [];
  OCTAVES.forEach((octave) => {
    NOTE_ORDER.forEach(([key, label, semitone]) => {
      const midi = 12 * (octave + 1) + semitone;
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      result.push({
        id: `${key}${octave}`,
        key,
        label,
        octave,
        frequency,
        color: noteColors[key]
      });
    });
  });
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
      cell.type = 'button';
      cell.className = `grid-cell ${active ? 'is-filled' : ''}`;
      cell.dataset.noteId = note.id;
      cell.dataset.step = String(step);
      cell.style.setProperty('--note-color', note.color);
      cell.setAttribute('aria-label', `${note.label}${note.octave} ${step + 1}번째 칸`);
      cell.addEventListener('click', () => toggleCell(note.id, step));
      scoreGrid.appendChild(cell);
    }
  });

  renderAnalysis();
  if (scoreScroll) scoreScroll.scrollLeft = previousScrollLeft;
}

function hasNote(noteId, step) {
  return composition.some((item) => item.noteId === noteId && item.step === step);
}

function toggleCell(noteId, step) {
  const index = composition.findIndex((item) => item.noteId === noteId && item.step === step);
  if (index >= 0) {
    composition.splice(index, 1);
  } else {
    composition.push({
      id: `n-${Date.now()}-${Math.round(Math.random() * 9999)}`,
      noteId,
      step
    });
  }
  composition.sort((a, b) => a.step - b.step || notes.findIndex((note) => note.id === a.noteId) - notes.findIndex((note) => note.id === b.noteId));
  render();
  flashStep(step, true);
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
  if (!visualMarks.querySelector('.mark')) {
    visualMarks.innerHTML = '<span class="mark"></span>';
  }
  const blob = visualMarks.querySelector('.mark');
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

  blob.className = `mark mood-${analysis.paletteKey}`;
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
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
  master.gain.setValueAtTime(0.16, now + Math.max(0.02, duration - 0.08));
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.16);
  filter.connect(master).connect(audioContext.destination);

  [
    { ratio: 1, gain: 0.55, type: 'triangle' },
    { ratio: 2.01, gain: 0.18, type: 'sine' },
    { ratio: 3.01, gain: 0.09, type: 'sine' },
    { ratio: 4.02, gain: 0.045, type: 'sine' }
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
  playButton.textContent = 'Stop';
  playButton.classList.add('is-playing');
  playButton.setAttribute('aria-pressed', 'true');
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
  playButton.textContent = 'Play';
  playButton.classList.remove('is-playing');
  playButton.setAttribute('aria-pressed', 'false');
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
  if (isPlaying) stopPlayback();
  composition = [];
  editingArchiveId = null;
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
    saveButton.textContent = 'Empty';
    window.setTimeout(() => {
      saveButton.textContent = 'Save';
    }, 900);
    return;
  }
  const maxStep = Math.max(...composition.map((item) => item.step), 31);
  const snapshot = {
    id: editingArchiveId || `archive-${Date.now()}`,
    title: editingArchiveId ? archiveItems.find((item) => item.id === editingArchiveId)?.title || 'Untitled composition' : `Composition ${archiveItems.length + 1}`,
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
  saveButton.textContent = 'Saved';
  window.setTimeout(() => {
    saveButton.textContent = 'Save';
  }, 900);
  setView('archive');
}

function editArchiveItem(id) {
  const item = archiveItems.find((entry) => entry.id === id);
  if (!item) return;
  if (isPlaying) stopPlayback();
  editingArchiveId = item.id;
  STEP_COUNT = Math.max(64, item.stepCount || 64);
  composition = item.composition.map((entry) => ({ ...entry }));
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
  const remaining = scoreScroll.scrollWidth - scoreScroll.clientWidth - scoreScroll.scrollLeft;
  if (remaining > 480) return;
  STEP_COUNT += 32;
  render();
}

function setView(viewName) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-active', view.id === `${viewName}View`);
  });
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });
  if (viewName !== 'compose' && isPlaying) stopPlayback();
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

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.18;
    if (isInView) item.classList.add('is-visible');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    root: null,
    threshold: 0.45
  });

  revealItems.forEach((item) => observer.observe(item));
  window.requestAnimationFrame(() => app?.classList.add('is-animated'));
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
  window.clearTimeout(cursorHintTimer);
  customCursor.classList.remove('show-hint');
  if (!isHomeHeroVisible()) return;
  cursorHintTimer = window.setTimeout(() => {
    if (isHomeHeroVisible()) customCursor.classList.add('show-hint');
  }, 3000);
}

function initCustomCursor() {
  if (!customCursor || window.matchMedia('(pointer: coarse)').matches) return;

  window.addEventListener('pointermove', (event) => {
    customCursor.classList.add('is-visible');
    customCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  });

  window.addEventListener('pointerleave', () => {
    customCursor.classList.remove('is-visible');
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

function seedExample() {
  composition = [
    { id: 's1', noteId: 'do3', step: 0 },
    { id: 's1b', noteId: 'do3', step: 1 },
    { id: 's2', noteId: 'mi3', step: 2 },
    { id: 's3', noteId: 'sol3', step: 4 },
    { id: 's3b', noteId: 'sol3', step: 5 },
    { id: 's3c', noteId: 'sol3', step: 6 },
    { id: 's4', noteId: 'do4', step: 8 },
    { id: 's5', noteId: 're4', step: 9 },
    { id: 's6', noteId: 'mi4', step: 10 },
    { id: 's7', noteId: 'sol4', step: 12 },
    { id: 's8', noteId: 'do5', step: 16 },
    { id: 's8b', noteId: 'do5', step: 17 },
    { id: 's9', noteId: 'si4', step: 20 },
    { id: 's10', noteId: 'la4', step: 21 },
    { id: 's11', noteId: 'sol4', step: 22 },
    { id: 's12', noteId: 'mi4', step: 26 },
    { id: 's13', noteId: 'do4', step: 28 }
  ];
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
playButton.addEventListener('click', togglePlayback);
saveButton.addEventListener('click', saveComposition);
clearButton.addEventListener('click', clearComposition);
scoreScroll?.addEventListener('scroll', extendScoreIfNeeded, { passive: true });
resizeHandle.addEventListener('pointerdown', startResize);
sideTabButton?.addEventListener('click', openSidePanel);
closePanelButton?.addEventListener('click', closeSidePanel);

seedExample();
render();
renderArchive();
initScrollReveals();
initSoftSectionScroll();
initCustomCursor();
