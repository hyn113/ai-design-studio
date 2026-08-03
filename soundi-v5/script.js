let STEP_COUNT = 64;
const STORAGE_KEY = 'soundi-v5-archive';
const SCALE_KEYS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
const MAX_OCTAVE = 8;
const MIN_OCTAVE = 1;
let highestOctave = MAX_OCTAVE;
let lowestOctave = MIN_OCTAVE;
const NOTE_ORDER = [
  ['si', 'B', 11],
  ['la', 'A', 9],
  ['sol', 'G', 7],
  ['fa', 'F', 5],
  ['mi', 'E', 4],
  ['re', 'D', 2],
  ['do', 'C', 0]
];
const SHARP_KEYS = new Set(['do', 're', 'fa', 'sol', 'la']);
const FLAT_KEYS = new Set(['re', 'mi', 'sol', 'la', 'si']);
const ACCIDENTAL_DRAG_THRESHOLD = 14;
const BPM = 96;
const LOOP_GAP_MS = 0;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.15;
const HARMONY_TYPES = {
  major: { label: { ko: '메이저 트라이어드', en: 'Major Triad' }, intervals: [4, 7], maxSuggestions: 2, maxNotes: 3 },
  minor: { label: { ko: '마이너 트라이어드', en: 'Minor Triad' }, intervals: [3, 7], maxSuggestions: 2, maxNotes: 3 },
  suspended: { label: { ko: '서스펜디드 코드', en: 'Suspended Chord' }, intervals: [5, 7], maxSuggestions: 2, maxNotes: 3 },
  fifth: { label: { ko: '완전 5도', en: 'Perfect Fifth' }, intervals: [7], maxSuggestions: 1, maxNotes: 2 },
  octave: { label: { ko: '옥타브', en: 'Octave' }, intervals: [12], maxSuggestions: 1, maxNotes: 2 }
};

const TENSION_TYPES = {
  none: { label: { ko: '텐션 끄기', en: 'Tension Off' }, intervals: [] },
  major7: { label: { ko: '메이저 7', en: 'Major 7' }, intervals: [11] },
  add9: { label: { ko: '애드 9', en: 'Add 9' }, intervals: [14] }
};

const intervalLabels = {
  3: 'minor 3rd',
  4: 'major 3rd',
  5: '4th',
  7: '5th',
  11: 'major 7th',
  12: 'octave',
  14: '9th'
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
const pitchKeyboard = document.getElementById('pitchKeyboard');
const zoomOutButton = document.getElementById('zoomOutButton');
const zoomInButton = document.getElementById('zoomInButton');
const zoomLabel = document.getElementById('zoomLabel');
const resetZoomButton = document.getElementById('resetZoomButton');
const playButton = document.getElementById('playButton');
const saveButton = document.getElementById('saveButton');
const clearButton = document.getElementById('clearButton');
const middleNotesButton = document.getElementById('middleNotesButton');
const guideButton = document.getElementById('guideButton');
const harmonyTypeControl = document.getElementById('harmonyTypeControl');
const harmonyTypeButton = document.getElementById('harmonyTypeButton');
const harmonyTypeMenu = document.getElementById('harmonyTypeMenu');
const tensionControl = document.getElementById('tensionControl');
const tensionButton = document.getElementById('tensionButton');
const tensionMenu = document.getElementById('tensionMenu');
const exampleButton = document.getElementById('exampleButton');
const exampleName = document.getElementById('exampleName');
const compositionDuration = document.getElementById('compositionDuration');
const archiveGrid = document.getElementById('archiveGrid');
const playhead = document.getElementById('playhead');
const gridPlayhead = document.getElementById('gridPlayhead');
const visualStage = document.getElementById('visualStage');
const visualMarks = document.getElementById('visualMarks');
const visualCaption = document.getElementById('visualCaption');
const moodMetrics = document.getElementById('moodMetrics');
const feedbackCard = document.getElementById('feedbackCard');
const resizeHandle = document.getElementById('resizeHandle');
const lessonDemo = document.getElementById('lessonDemo');
const lessonStepLabel = document.getElementById('lessonStepLabel');
const lessonTitle = document.getElementById('lessonTitle');
const lessonText = document.getElementById('lessonText');
const lessonPrevButton = document.getElementById('lessonPrevButton');
const lessonNextButton = document.getElementById('lessonNextButton');
const lessonStartButton = document.getElementById('lessonStartButton');
const lessonTrackButtons = document.querySelectorAll('[data-lesson-track]');
const languageToggle = document.getElementById('languageToggle');
const revealItems = document.querySelectorAll('.reveal');
const sideTabButton = document.getElementById('sideTabButton');
const sidePanel = document.getElementById('sidePanel');
const closePanelButton = document.getElementById('closePanelButton');
const customCursor = document.getElementById('customCursor');

let composition = [];
let audioContext = null;
let playTimer = null;
let playStep = 0;
let isPlaying = false;
let isResizing = false;
let cursorHintTimer = null;
let controlHintExitTimer = null;
let activeCursorHintGroup = null;
let scoreHintTarget = null;
let lastPointerX = 0;
let lastPointerY = 0;
let archiveItems = loadArchive();
let editingArchiveId = null;
let playbackAnalysis = null;
let captionTimer = null;
let captionIndex = 0;
let currentLanguage = 'ko';
let guideEnabled = true;
let harmonyType = 'major';
let tensionType = 'none';
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
let composeZoom = 1;
let hasCenteredComposeOnEntry = false;
let isSectionScrolling = false;
let lessonTrack = 'pitch';
let lessonStep = 0;

const lessonTrackOrder = ['pitch', 'colorHarmony', 'rhythmLength', 'feedback'];

const lessonTracks = {
  pitch: {
    label: '01 / 04',
    title: { ko: '음높이', en: 'Pitch' },
    text: {
      ko: '위아래 위치로 음의 높이를 읽어요. C4는 가운데 기준점이고, 위로 갈수록 높은 음, 아래로 갈수록 낮은 음이에요.',
      en: 'Read pitch through vertical position. C4 is the middle reference: higher is up, lower is down.'
    }
  },
  colorHarmony: {
    label: '02 / 04',
    title: { ko: '색 + 화음', en: 'Color + Harmony' },
    text: {
      ko: '각 음은 고유한 색을 가지고, 여러 음을 같이 놓으면 색 조합이 생겨요. 반복되는 색과 조합의 안정감으로 멜로디와 화음을 읽어요.',
      en: 'Each note has its own color. When notes are placed together, color combinations help you read melody and harmony.'
    }
  },
  rhythmLength: {
    label: '03 / 04',
    title: { ko: '리듬 + 길이', en: 'Rhythm + Length' },
    text: {
      ko: '가로 간격은 시간이고, 블록 길이는 음이 유지되는 시간이에요. 촘촘함, 여백, 짧음, 길이를 함께 보며 흐름을 읽어요.',
      en: 'Horizontal spacing is time, and block length is duration. Density, silence, shortness, and length shape the flow.'
    }
  },
  feedback: {
    label: '04 / 04',
    title: { ko: '내 음악 보기', en: 'Reading Feedback' },
    text: {
      ko: '작곡 화면 오른쪽 패널은 내 음악이 어떤 구조인지 보여줘요. 원, 문장, 카드가 음높이, 리듬, 길이, 화음을 요약해요.',
      en: 'The right panel in Compose reads your music structure. The orb, sentence, and cards summarize pitch, rhythm, length, and harmony.'
    }
  }
};

const translations = {
  ko: {
    guideButton: '화음 가이드',
    harmonyMajor: '메이저 트라이어드',
    harmonyMinor: '마이너 트라이어드',
    harmonySuspended: '서스펜디드 코드',
    harmonyFifth: '완전 5도',
    harmonyOctave: '옥타브',
    tensionNone: '텐션 끄기',
    tensionMajor7: '메이저 7',
    tensionAdd9: '애드 9',
    examplesButton: '예시곡',
    lessonPitchNav: '음높이',
    lessonColorHarmonyNav: '색과 어울림',
    lessonRhythmLengthNav: '리듬과 길이',
    lessonFeedbackNav: '내 음악 보기',
    lessonStart: '작곡 시작하기',
    lessonMajorCard: '안정적인 색 조합',
    lessonMinorCard: '가깝고 차분한 조합',
    lessonTensionCard: '대비가 큰 조합',
    lessonFeedbackDemo: '시각 피드백은 내 음악의 구조를 읽어줘요.',
    metricPitch: '음높이 범위',
    metricPitchValue: '음높이 - 균형',
    metricRhythm: '리듬 밀도',
    metricRhythmValue: '리듬 - 보통'
  },
  en: {
    guideButton: 'Harmony Guide',
    harmonyMajor: 'Major Triad',
    harmonyMinor: 'Minor Triad',
    harmonySuspended: 'Suspended Chord',
    harmonyFifth: 'Perfect Fifth',
    harmonyOctave: 'Octave',
    tensionNone: 'Tension Off',
    tensionMajor7: 'Major 7',
    tensionAdd9: 'Add 9',
    examplesButton: 'Examples',
    lessonPitchNav: 'Pitch',
    lessonColorHarmonyNav: 'Color + Harmony',
    lessonRhythmLengthNav: 'Rhythm + Length',
    lessonFeedbackNav: 'Reading Feedback',
    lessonStart: 'Start composing',
    lessonMajorCard: 'Stable color set',
    lessonMinorCard: 'Close, darker set',
    lessonTensionCard: 'More contrast',
    lessonFeedbackDemo: 'Visual feedback reads your composition structure.',
    metricPitch: 'Pitch Range',
    metricPitchValue: 'Pitch - Balanced',
    metricRhythm: 'Rhythm Density',
    metricRhythmValue: 'Rhythm - Moderate'
  }
};

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
    title: 'Twinkle Twinkle Little Star',
    mood: 'Bright / Simple / Familiar',
    point: 'Repetition and basic melody structure',
    notes: [
      ['do4', 0, 2], ['do4', 2, 2], ['sol4', 4, 2], ['sol4', 6, 2],
      ['la4', 8, 2], ['la4', 10, 2], ['sol4', 12, 4],
      ['fa4', 16, 2], ['fa4', 18, 2], ['mi4', 20, 2], ['mi4', 22, 2],
      ['re4', 24, 2], ['re4', 26, 2], ['do4', 28, 4],
      ['sol4', 32, 2], ['sol4', 34, 2], ['fa4', 36, 2], ['fa4', 38, 2],
      ['mi4', 40, 2], ['mi4', 42, 2], ['re4', 44, 4],
      ['sol4', 48, 2], ['sol4', 50, 2], ['fa4', 52, 2], ['fa4', 54, 2],
      ['mi4', 56, 2], ['mi4', 58, 2], ['re4', 60, 4],
      ['do4', 64, 2], ['do4', 66, 2], ['sol4', 68, 2], ['sol4', 70, 2],
      ['la4', 72, 2], ['la4', 74, 2], ['sol4', 76, 4],
      ['fa4', 80, 2], ['fa4', 82, 2], ['mi4', 84, 2], ['mi4', 86, 2],
      ['re4', 88, 2], ['re4', 90, 2], ['do4', 92, 4]
    ]
  },
  {
    title: 'Happy Birthday to You',
    mood: 'Cheerful / Celebratory',
    point: 'Short melody with a clear emotional rise',
    notes: [
      ['sol4', 0, 1], ['sol4', 1, 1], ['la4', 2, 2], ['sol4', 4, 2], ['do5', 6, 2], ['si4', 8, 4],
      ['sol4', 12, 1], ['sol4', 13, 1], ['la4', 14, 2], ['sol4', 16, 2], ['re5', 18, 2], ['do5', 20, 4],
      ['sol4', 24, 1], ['sol4', 25, 1], ['sol5', 26, 2], ['mi5', 28, 2], ['do5', 30, 2], ['si4', 32, 2], ['la4', 34, 4],
      ['fa5', 38, 1], ['fa5', 39, 1], ['mi5', 40, 2], ['do5', 42, 2], ['re5', 44, 2], ['do5', 46, 4],
      ['do3', 0, 6], ['sol3', 6, 6], ['do3', 12, 6], ['sol3', 18, 6],
      ['do3', 24, 6], ['mi3', 30, 6], ['fa3', 36, 6], ['sol3', 42, 8],
      ['mi3', 6, 4], ['sol3', 6, 4], ['mi3', 18, 4], ['sol3', 18, 4],
      ['do4', 30, 4], ['sol3', 42, 4], ['si3', 42, 4]
    ]
  },
  {
    title: 'Ode to Joy',
    mood: 'Grand / Stable / Classical',
    point: 'Stepwise melodic movement',
    notes: [
      ['mi4', 0, 2], ['mi4', 2, 2], ['fa4', 4, 2], ['sol4', 6, 2],
      ['sol4', 8, 2], ['fa4', 10, 2], ['mi4', 12, 2], ['re4', 14, 2],
      ['do4', 16, 2], ['do4', 18, 2], ['re4', 20, 2], ['mi4', 22, 2],
      ['mi4', 24, 3], ['re4', 27, 1], ['re4', 28, 4],
      ['mi4', 32, 2], ['mi4', 34, 2], ['fa4', 36, 2], ['sol4', 38, 2],
      ['sol4', 40, 2], ['fa4', 42, 2], ['mi4', 44, 2], ['re4', 46, 2],
      ['do4', 48, 2], ['do4', 50, 2], ['re4', 52, 2], ['mi4', 54, 2],
      ['re4', 56, 3], ['do4', 59, 1], ['do4', 60, 4],
      ['do3', 0, 8], ['sol3', 8, 8], ['do3', 16, 8], ['sol3', 24, 8],
      ['do3', 32, 8], ['sol3', 40, 8], ['do3', 48, 8], ['do3', 56, 8],
      ['mi3', 0, 4], ['sol3', 0, 4], ['mi3', 16, 4], ['sol3', 16, 4],
      ['mi3', 48, 4], ['sol3', 48, 4], ['mi3', 56, 4], ['sol3', 56, 4]
    ]
  },
  {
    title: 'The Entertainer',
    mood: 'Playful / Rhythmic / Bouncy',
    point: 'Syncopated rhythm and lively motion',
    notes: [
      ['re5', 0, 1], ['mi4', 1, 1], ['mi4', 2, 1], ['do5', 4, 1], ['mi4', 6, 1], ['do5', 8, 1], ['mi4', 10, 1], ['do5', 12, 2],
      ['do5', 16, 1], ['re5', 18, 1], ['mi5', 20, 1], ['mi5', 22, 2], ['do5', 25, 1], ['re5', 27, 1], ['mi5', 29, 1], ['si4', 31, 2],
      ['re5', 34, 1], ['do5', 36, 1], ['mi4', 38, 1], ['do5', 40, 1], ['mi4', 42, 1], ['do5', 44, 2],
      ['la4', 48, 1], ['si4', 50, 1], ['do5', 52, 1], ['re5', 54, 1], ['mi5', 56, 2], ['do5', 60, 4],
      ['do3', 0, 2], ['sol3', 2, 2], ['do3', 4, 2], ['sol3', 6, 2], ['do3', 8, 2], ['sol3', 10, 2], ['do3', 12, 4],
      ['fa3', 16, 2], ['do4', 18, 2], ['fa3', 20, 2], ['do4', 22, 2], ['sol3', 24, 2], ['re4', 26, 2], ['sol3', 28, 4],
      ['do3', 34, 2], ['sol3', 36, 2], ['mi3', 38, 2], ['sol3', 40, 2], ['do3', 42, 2], ['sol3', 44, 4],
      ['fa3', 48, 2], ['do4', 50, 2], ['sol3', 52, 2], ['re4', 54, 2], ['do3', 56, 8]
    ]
  },
  {
    title: 'Greensleeves',
    mood: 'Calm / Emotional / Old folk',
    point: 'Long notes and lyrical melody',
    notes: [
      ['la4', 0, 2], ['do5', 2, 3], ['re5', 5, 1], ['mi5', 6, 2], ['fa5', 8, 3], ['mi5', 11, 1], ['re5', 12, 2], ['si4', 14, 4],
      ['sol4', 18, 2], ['la4', 20, 3], ['si4', 23, 1], ['do5', 24, 2], ['la4', 26, 4],
      ['la4', 32, 2], ['do5', 34, 3], ['re5', 37, 1], ['mi5', 38, 2], ['fa5', 40, 3], ['mi5', 43, 1], ['re5', 44, 2], ['si4', 46, 4],
      ['sol4', 50, 2], ['la4', 52, 3], ['si4', 55, 1], ['do5', 56, 2], ['la4', 58, 6],
      ['la3', 0, 8], ['mi3', 8, 8], ['sol3', 16, 8], ['la3', 24, 8],
      ['la3', 32, 8], ['mi3', 40, 8], ['sol3', 48, 8], ['la3', 56, 8],
      ['do4', 0, 4], ['mi4', 0, 4], ['si3', 16, 4], ['re4', 16, 4],
      ['do4', 32, 4], ['mi4', 32, 4], ['do4', 56, 4], ['mi4', 56, 4]
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

function getBaseComposeCellSize() {
  return Math.round(Math.min(48, Math.max(32, window.innerHeight * 0.042)));
}

function refreshComposeZoomSize() {
  document.documentElement.style.setProperty('--compose-cell', `${Math.round(getBaseComposeCellSize() * composeZoom)}px`);
  updateGridMetrics();
}

function getMinComposeZoom() {
  if (!scoreScroll || !notes.length) return MIN_ZOOM;
  const baseCellSize = getBaseComposeCellSize();
  const availableHeight = scoreScroll.clientHeight || window.innerHeight;
  const minCellSize = Math.ceil(availableHeight / notes.length);
  const minToKeepPlayableRangeVisible = minCellSize / baseCellSize;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, minToKeepPlayableRangeVisible));
}

function updateZoomControls() {
  const minZoom = getMinComposeZoom();
  if (zoomLabel && document.activeElement !== zoomLabel) zoomLabel.value = `${Math.round(composeZoom * 100)}%`;
  if (zoomOutButton) zoomOutButton.disabled = composeZoom <= minZoom + 0.001;
  if (zoomInButton) zoomInButton.disabled = composeZoom >= MAX_ZOOM;
}

function commitZoomInput() {
  if (!zoomLabel) return;
  const rawValue = String(zoomLabel.value || '').replace('%', '').trim();
  const nextPercent = Number.parseFloat(rawValue);
  if (Number.isFinite(nextPercent)) {
    setComposeZoom(nextPercent / 100);
  }
  updateZoomControls();
}

function handleZoomInputKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitZoomInput();
    zoomLabel.blur();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    updateZoomControls();
    zoomLabel.blur();
  }
}

function setComposeZoom(nextZoom, preserveCenter = true) {
  const minZoom = getMinComposeZoom();
  const next = Math.min(MAX_ZOOM, Math.max(minZoom, Number(nextZoom.toFixed(2))));
  if (next === composeZoom) {
    refreshComposeZoomSize();
    updateZoomControls();
    return;
  }

  const center = scoreScroll && preserveCenter
    ? {
      x: (scoreScroll.scrollLeft + scoreScroll.clientWidth / 2) / Math.max(1, scoreScroll.scrollWidth),
      y: (scoreScroll.scrollTop + scoreScroll.clientHeight / 2) / Math.max(1, scoreScroll.scrollHeight)
    }
    : null;

  composeZoom = next;
  refreshComposeZoomSize();
  updateZoomControls();

  if (!scoreScroll || !center) return;
  requestAnimationFrame(() => {
    scoreScroll.scrollLeft = Math.max(0, center.x * scoreScroll.scrollWidth - scoreScroll.clientWidth / 2);
    scoreScroll.scrollTop = Math.max(0, center.y * scoreScroll.scrollHeight - scoreScroll.clientHeight / 2);
  });
}

function handleComposeResize() {
  const minZoom = getMinComposeZoom();
  if (composeZoom < minZoom) {
    setComposeZoom(minZoom, false);
    return;
  }
  refreshComposeZoomSize();
  updateZoomControls();
}

function render() {
  const previousScrollLeft = scoreScroll?.scrollLeft || 0;
  const previousScrollTop = scoreScroll?.scrollTop || 0;
  updateGridMetrics();
  renderPitchKeyboard();
  scoreGrid.innerHTML = '';

  const cells = new Map();
  composition.forEach((item) => {
    cells.set(getGridCellKey(item.noteId, item.step), { noteId: item.noteId, step: item.step, item, suggestion: null });
  });

  if (guideEnabled && lastSelectedNoteId && lastSelectedStep !== null && hasNote(lastSelectedNoteId, lastSelectedStep)) {
    notes.forEach((note) => {
      const key = getGridCellKey(note.id, lastSelectedStep);
      if (cells.has(key)) return;
      const suggestion = getHarmonySuggestion(note.id, lastSelectedStep, false);
      if (suggestion) cells.set(key, { noteId: note.id, step: lastSelectedStep, item: null, suggestion });
    });
  }

  const fragment = document.createDocumentFragment();
  cells.forEach((cellState) => {
    const cell = createGridCell(cellState.noteId, cellState.step, cellState.item, cellState.suggestion);
    if (cell) fragment.appendChild(cell);
  });
  scoreGrid.appendChild(fragment);

  renderAnalysis();
  updateDurationDisplay();
  if (scoreScroll) {
    scoreScroll.scrollLeft = previousScrollLeft;
    scoreScroll.scrollTop = previousScrollTop;
  }
}

function updateGridMetrics() {
  if (!scoreGrid) return;
  const cellSize = getComposeCellSize();
  const referenceStart = Math.max(0, notes.findIndex((note) => note.octave === 4 && note.key === 'si'));
  scoreGrid.style.setProperty('--step-count', STEP_COUNT);
  scoreGrid.style.setProperty('--note-count', notes.length);
  scoreGrid.style.setProperty('--reference-top', `${referenceStart * cellSize}px`);
  scoreGrid.style.setProperty('--reference-bottom', `${(referenceStart + NOTE_ORDER.length) * cellSize}px`);
}

function getGridCellKey(noteId, step) {
  return `${noteId}:${step}`;
}

function getGridTargetFromPointer(event) {
  if (!scoreGrid) return null;
  const rect = scoreGrid.getBoundingClientRect();
  const cellSize = getComposeCellSize();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || y < 0) return null;
  const step = Math.floor(x / cellSize);
  const noteIndex = Math.floor(y / cellSize);
  if (step < 0 || step >= STEP_COUNT || noteIndex < 0 || noteIndex >= notes.length) return null;
  return { noteId: notes[noteIndex].id, step };
}

function createGridCell(noteId, step, item = null, suggestion = null) {
  const note = notes.find((entry) => entry.id === noteId);
  if (!note || step < 0 || step >= STEP_COUNT) return null;
  const active = Boolean(item);
  const accidental = item?.accidental || 0;
  const cell = document.createElement('button');
  const cellClasses = [
    'grid-cell',
    active ? 'is-filled' : '',
    accidental === 1 ? 'is-sharp' : '',
    accidental === -1 ? 'is-flat' : '',
    suggestion ? 'is-suggested' : '',
    canAccidental(note, 1) ? 'can-sharp' : '',
    canAccidental(note, -1) ? 'can-flat' : '',
    note.octave === 4 ? 'is-reference-octave' : '',
    step % 4 === 0 ? 'is-beat-line' : '',
    step % 8 === 0 ? 'is-measure-line' : '',
    note.key === 'si' ? 'is-octave-start' : ''
  ].filter(Boolean).join(' ');
  cell.type = 'button';
  cell.className = cellClasses;
  cell.dataset.noteId = note.id;
  cell.dataset.step = String(step);
  if (suggestion) cell.dataset.relation = suggestion.label;
  if (note.octave === 4) cell.dataset.hint = 'This soft gray<br />area is middle notes';
  cell.style.setProperty('--note-color', note.color);
  cell.style.gridColumn = String(step + 1);
  cell.style.gridRow = String(notes.findIndex((entry) => entry.id === note.id) + 1);
  cell.setAttribute('aria-label', `${getDisplayNoteLabel(note, accidental)} ${step + 1}번째 칸`);
  if (suggestion) {
    const label = document.createElement('span');
    label.className = 'harmony-label';
    label.textContent = suggestion.shortLabel;
    cell.appendChild(label);
  }
  return cell;
}

function syncGridCell(noteId, step) {
  if (!scoreGrid) return;
  const selector = '[data-note-id="' + noteId + '"][data-step="' + step + '"]';
  scoreGrid.querySelector(selector)?.remove();
  const item = getNoteAt(noteId, step);
  if (!item) return;
  const cell = createGridCell(noteId, step, item, null);
  if (cell) scoreGrid.appendChild(cell);
}

function renderPitchKeyboard() {
  if (!pitchKeyboard) return;
  pitchKeyboard.style.setProperty('--note-count', notes.length);
  pitchKeyboard.innerHTML = notes.map((note) => `
    <span class="pitch-label${note.octave === 4 ? ' is-middle' : ''}${note.key === 'do' ? ' is-octave-label' : ''}${note.key === 'si' ? ' is-octave-start' : ''}">
      <span>${note.key === 'do' ? `C${note.octave}` : ''}</span>
    </span>
  `).join('');
}

function getHarmonySuggestion(noteId, step, active) {
  if (!guideEnabled || active || lastSelectedStep !== step || !lastSelectedNoteId || !hasNote(lastSelectedNoteId, lastSelectedStep)) return null;
  const type = HARMONY_TYPES[harmonyType];
  if (getStepNoteCount(step) >= (type?.maxNotes || 3)) return null;
  return getHarmonySuggestions(lastSelectedNoteId).find((suggestion) => suggestion.id === noteId) || null;
}

function isHarmonySuggestion(noteId, step, active) {
  return Boolean(getHarmonySuggestion(noteId, step, active));
}

function getHarmonySuggestionIds(noteId) {
  return getHarmonySuggestions(noteId).map((suggestion) => suggestion.id);
}

function getHarmonySuggestions(noteId) {
  const selected = notes.find((note) => note.id === noteId);
  const type = HARMONY_TYPES[harmonyType];
  if (!selected || !type) return [];
  const intervals = [...type.intervals, ...(TENSION_TYPES[tensionType]?.intervals || [])];
  const suggestions = intervals
    .map((interval) => {
      const target = getPlayableTarget(selected.midi + interval);
      if (!target) return null;
      const relation = intervalLabels[interval] || `${interval} semitones`;
      const accidentalText = target.accidental > 0 ? ' sharp' : target.accidental < 0 ? ' flat' : '';
      return {
        id: target.id,
        accidental: target.accidental,
        interval,
        label: relation + accidentalText,
        shortLabel: getShortIntervalLabel(interval) + (target.accidental > 0 ? ' #' : target.accidental < 0 ? ' b' : '')
      };
    })
    .filter(Boolean)
    .filter((suggestion) => suggestion.id !== selected.id || suggestion.accidental !== 0);
  return suggestions.slice(0, (type.maxSuggestions || suggestions.length) + (tensionType === 'none' ? 0 : 1));
}

function getShortIntervalLabel(interval) {
  if (interval === 3 || interval === 4) return '3rd';
  if (interval === 5) return '4th';
  if (interval === 7) return '5th';
  if (interval === 11) return '7th';
  if (interval === 12) return '8ve';
  if (interval === 14) return '9th';
  return `${interval}`;
}

function getPlayableTarget(targetMidi) {
  const exact = notes.find((note) => note.midi === targetMidi);
  if (exact) return { id: exact.id, accidental: 0 };
  const sharpBase = notes.find((note) => canAccidental(note, 1) && note.midi + 1 === targetMidi);
  if (sharpBase) return { id: sharpBase.id, accidental: 1 };
  const flatBase = notes.find((note) => canAccidental(note, -1) && note.midi - 1 === targetMidi);
  if (flatBase) return { id: flatBase.id, accidental: -1 };
  return null;
}

function canAccidental(note, accidental) {
  if (!note) return false;
  return accidental > 0 ? SHARP_KEYS.has(note.key) : accidental < 0 ? FLAT_KEYS.has(note.key) : true;
}

function getDisplayNoteLabel(note, accidental = 0) {
  return `${note.label}${accidental > 0 ? '#' : accidental < 0 ? 'b' : ''}${note.octave}`;
}

function getPlaybackFrequency(note, accidental = 0) {
  const midi = note.midi + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
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

function getNoteAt(noteId, step) {
  return composition.find((item) => item.noteId === noteId && item.step === step);
}

function hasNote(noteId, step) {
  return Boolean(getNoteAt(noteId, step));
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
  const maxNotes = (type?.maxNotes || 3) + (tensionType === 'none' ? 0 : 1);
  const isComplete = getStepNoteCount(step) >= maxNotes || (suggestions.length > 0 && suggestions.every((id) => hasNote(id, step)));
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
  const wasFilled = hasNote(noteId, step);
  gridDragState = {
    noteId,
    shouldFill: !wasFilled,
    wasFilled,
    touched: new Set(),
    startY: event.clientY,
    currentNoteId: noteId,
    currentStep: step,
    changedAccidental: false
  };
  if (wasFilled) {
    gridDragState.touched.add(noteId + ':' + step);
  } else {
    applyDragCell(noteId, step);
  }
  window.addEventListener('pointermove', updateAccidentalDrag);
  window.addEventListener('pointerup', endGridDrag, { once: true });
}

function beginGridDragFromEvent(event) {
  const target = getGridTargetFromPointer(event);
  if (!target) return;
  beginGridDrag(event, target.noteId, target.step);
}

function continueGridDragFromEvent(event) {
  if (!gridDragState) return;
  const target = getGridTargetFromPointer(event);
  if (!target) return;
  continueGridDrag(target.noteId, target.step);
}

function continueGridDrag(noteId, step) {
  if (!gridDragState || gridDragState.noteId !== noteId) return;
  applyDragCell(noteId, step);
}

function applyDragCell(noteId, step) {
  if (!gridDragState) return;
  const key = noteId + ':' + step;
  gridDragState.currentNoteId = noteId;
  gridDragState.currentStep = step;
  if (gridDragState.touched.has(key)) return;
  gridDragState.touched.add(key);
  applyCellState(noteId, step, gridDragState.shouldFill);
  syncGridCell(noteId, step);
  flashStep(step, true);
}

function updateAccidentalDrag(event) {
  if (!gridDragState || (!gridDragState.shouldFill && !gridDragState.wasFilled)) return;
  const note = notes.find((entry) => entry.id === gridDragState.currentNoteId);
  if (!note) return;
  const deltaY = event.clientY - gridDragState.startY;
  const accidental = deltaY <= -ACCIDENTAL_DRAG_THRESHOLD
    ? 1
    : deltaY >= ACCIDENTAL_DRAG_THRESHOLD
      ? -1
      : 0;
  if (setCellAccidental(gridDragState.currentNoteId, gridDragState.currentStep, canAccidental(note, accidental) ? accidental : 0)) {
    gridDragState.changedAccidental = true;
  }
}

function endGridDrag() {
  if (!gridDragState) return;
  window.removeEventListener('pointermove', updateAccidentalDrag);
  const state = gridDragState;
  if (state.wasFilled && !state.changedAccidental) {
    applyCellState(state.noteId, state.currentStep, false);
  }
  gridDragState = null;
  sortComposition();
  render();
}

function applyCellState(noteId, step, shouldFill) {
  const index = composition.findIndex((item) => item.noteId === noteId && item.step === step);
  const keptAnchor = shouldKeepHarmonyAnchor(noteId, step);
  if (shouldFill && index < 0) {
    const suggestion = getHarmonySuggestion(noteId, step, false);
    composition.push({
      id: 'n-' + Date.now() + '-' + Math.round(Math.random() * 9999),
      noteId,
      step,
      accidental: suggestion?.accidental || 0
    });
  } else if (!shouldFill && index >= 0) {
    composition.splice(index, 1);
  }
  sortComposition();
  updateHarmonyAnchorAfterEdit(noteId, step, shouldFill, keptAnchor);
}

function setCellAccidental(noteId, step, accidental) {
  const item = getNoteAt(noteId, step);
  const note = notes.find((entry) => entry.id === noteId);
  if (!item || !note) return false;
  const nextAccidental = canAccidental(note, accidental) ? accidental : 0;
  const changed = (item.accidental || 0) !== nextAccidental;
  item.accidental = nextAccidental;
  const cell = scoreGrid.querySelector('[data-note-id="' + noteId + '"][data-step="' + step + '"]');
  if (!cell) return changed;
  cell.classList.toggle('is-sharp', item.accidental === 1);
  cell.classList.toggle('is-flat', item.accidental === -1);
  return changed;
}

function sortComposition() {
  composition.sort((a, b) => a.step - b.step || notes.findIndex((note) => note.id === a.noteId) - notes.findIndex((note) => note.id === b.noteId));
}

function analyzeComposition() {
  const moodAI = window.SoundiMoodAI?.analyzeMusicMood(composition, notes, {
    stepCount: STEP_COUNT,
    minNotesForMood: 4
  });
  const features = moodAI?.features || {};
  const activeSteps = features.raw?.activeSteps || [...new Set(composition.map((item) => item.step))].sort((a, b) => a - b);
  const durations = features.raw?.durations || [];
  const visualState = moodAI?.visualState;
  const paletteKey = moodAI?.primaryMood || 'calm';
  const palette = {
    name: getMoodTypeLabel({ paletteKey, moodAI }),
    vars: visualState?.colors?.slice(0, 3) || palettes.warm.vars,
    marks: visualState?.colors || palettes.warm.marks,
    sphere: visualState?.colors || palettes.warm.sphere,
    motion: {
      gradient: visualState?.gradientDuration || 10400,
      shape: visualState?.shapeDuration || 10800
    }
  };

  return {
    moodAI,
    activeSteps,
    density: features.noteDensity || 0,
    activity: features.rhythmicDensity || 0,
    highRatio: features.highRatio || 0,
    lowRatio: features.lowRatio || 0,
    averageGap: features.raw?.gaps?.length
      ? features.raw.gaps.reduce((sum, gap) => sum + gap, 0) / features.raw.gaps.length
      : STEP_COUNT,
    averageLength: durations.length ? durations.reduce((sum, length) => sum + length, 0) / durations.length : 1,
    repetition: getMostRepeatedNote(),
    chordSteps: Math.round((features.chordRatio || 0) * Math.max(1, activeSteps.length)),
    chordRatio: features.chordRatio || 0,
    contour: (features.ascendingRatio || 0) - (features.descendingRatio || 0),
    energy: moodAI?.energy || 0,
    tension: moodAI?.tension || 0,
    brightness: moodAI?.brightness || 0.5,
    palette,
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
  if (analysis.moodAI?.visualState) {
    visualStage.style.setProperty('--focus-x', analysis.moodAI.visualState.focusX);
    visualStage.style.setProperty('--focus-y', analysis.moodAI.visualState.focusY);
  }

  renderMoodBlob(analysis, activeStep);
  renderMoodMetrics(analysis);
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
  const activeLengths = activeItems.map((item) => getSustainLength(item.noteId, item.step));
  const averageLength = activeLengths.length
    ? activeLengths.reduce((sum, length) => sum + length, 0) / activeLengths.length
    : 2;
  const chordCount = activeStep >= 0 ? composition.filter((item) => item.step === activeStep).length : analysis.chordSteps;
  const [color, color2, color3, color4] = getMoodSphereColors(analysis, averageLength, chordCount);

  blob.className = `mark mood-${analysis.paletteKey}`;
  blob.style.setProperty('--x', '50%');
  blob.style.setProperty('--y', '34%');
  blob.style.setProperty('--w', '248px');
  blob.style.setProperty('--h', '248px');
  blob.style.setProperty('--rotate', '0deg');
  blob.style.setProperty('--opacity', '1');
  blob.style.setProperty('--mark-color', color);
  blob.style.setProperty('--mark-color-2', color2);
  blob.style.setProperty('--mark-color-3', color3);
  blob.style.setProperty('--mark-color-4', color4);
  blob.style.setProperty('--gradient-duration', `${analysis.moodAI?.visualState?.gradientDuration || analysis.palette.motion?.gradient || 10400}ms`);
  blob.style.setProperty('--shape-duration', `${analysis.moodAI?.visualState?.shapeDuration || analysis.palette.motion?.shape || 10800}ms`);
  blob.style.setProperty('--pulse-duration', `${analysis.moodAI?.visualState?.pulseDuration || 2600}ms`);
  blob.style.setProperty('--irregularity', analysis.moodAI?.visualState?.irregularity || 0);
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

function renderMoodMetrics(analysis) {
  if (!moodMetrics) return;
  const metrics = getMoodMetricItems(analysis);
  moodMetrics.innerHTML = metrics.map((item) => `
    <section class="mood-metric mood-metric-${item.position}">
      <strong>${item.title}</strong>
      <span>${item.copy}</span>
      <em>${item.value}</em>
    </section>
  `).join('');
}

function getMoodMetricItems(analysis) {
  if (currentLanguage === 'ko') {
    const pitchCopy = analysis.highRatio > analysis.lowRatio + 0.12
      ? '높은 음이 많아서 가볍게 떠 있는 느낌이에요.'
      : analysis.lowRatio > analysis.highRatio + 0.12
        ? '낮은 음이 많아서 차분하고 깊게 느껴져요.'
        : '높은 음과 낮은 음이 균형 있게 섞여 있어요.';
    const rhythmCopy = analysis.averageGap <= 2
      ? '노트가 촘촘해서 움직임이 빠르게 느껴져요.'
      : analysis.averageGap >= 5
        ? '간격이 넓어서 여백이 크게 느껴져요.'
        : '적당한 간격이라 흐름을 따라가기 쉬워요.';
    const lengthCopy = analysis.averageLength >= 4
      ? '긴 음이 많아서 부드럽게 이어져 보여요.'
      : analysis.averageLength <= 1.5
        ? '짧은 음이 많아서 또렷하고 가볍게 보여요.'
        : '짧고 긴 음이 섞여 자연스럽게 흘러가요.';
    const harmonyCopy = analysis.chordSteps >= 4
      ? '겹친 음이 많아서 색 조합이 풍부해요.'
      : analysis.chordSteps > 0
        ? '함께 놓인 음이 있어 깊이가 더해져요.'
        : '대부분 한 음씩 보여서 멜로디가 또렷해요.';
    return [
      { position: 'top-left', title: '피치 범위', copy: pitchCopy, value: analysis.highRatio > analysis.lowRatio + 0.12 ? '피치 - 높음' : analysis.lowRatio > analysis.highRatio + 0.12 ? '피치 - 낮음' : '피치 - 균형' },
      { position: 'top-right', title: '리듬 밀도', copy: rhythmCopy, value: analysis.averageGap <= 2 ? '리듬 - 촘촘함' : analysis.averageGap >= 5 ? '리듬 - 여백 있음' : '리듬 - 보통' },
      { position: 'bottom-left', title: '노트 길이', copy: lengthCopy, value: analysis.averageLength >= 4 ? '길이 - 김' : analysis.averageLength <= 1.5 ? '길이 - 짧음' : '길이 - 섞임' },
      { position: 'bottom-right', title: '화음', copy: harmonyCopy, value: analysis.chordSteps >= 4 ? '화음 - 풍부함' : analysis.chordSteps > 0 ? '화음 - 더해짐' : '화음 - 또렷함' }
    ];
  }
  const pitchCopy = analysis.highRatio > analysis.lowRatio + 0.12
    ? 'Mostly high notes; light and lifted.'
    : analysis.lowRatio > analysis.highRatio + 0.12
      ? 'Mostly low notes; deep and grounded.'
      : 'High and low notes are balanced.';
  const rhythmCopy = analysis.averageGap <= 2
    ? 'Dense notes create active motion.'
    : analysis.averageGap >= 5
      ? 'Wide spacing leaves calm silence.'
      : 'Moderate spacing keeps a steady pace.';
  const lengthCopy = analysis.averageLength >= 4
    ? 'Long tones feel smooth and sustained.'
    : analysis.averageLength <= 1.5
      ? 'Short tones feel light and crisp.'
      : 'Mixed lengths give a natural flow.';
  const harmonyCopy = analysis.chordSteps >= 4
    ? 'Many stacked notes make richer color.'
    : analysis.chordSteps > 0
      ? 'Some harmony adds depth.'
      : 'Mostly single notes; melody is clear.';
  return [
    { position: 'top-left', title: 'Pitch Range', copy: pitchCopy, value: analysis.highRatio > analysis.lowRatio + 0.12 ? 'Pitch - High' : analysis.lowRatio > analysis.highRatio + 0.12 ? 'Pitch - Low' : 'Pitch - Balanced' },
    { position: 'top-right', title: 'Rhythm Density', copy: rhythmCopy, value: analysis.averageGap <= 2 ? 'Rhythm - Dense' : analysis.averageGap >= 5 ? 'Rhythm - Spacious' : 'Rhythm - Moderate' },
    { position: 'bottom-left', title: 'Note Length', copy: lengthCopy, value: analysis.averageLength >= 4 ? 'Length - Long' : analysis.averageLength <= 1.5 ? 'Length - Short' : 'Length - Mixed' },
    { position: 'bottom-right', title: 'Harmony', copy: harmonyCopy, value: analysis.chordSteps >= 4 ? 'Harmony - Rich' : analysis.chordSteps > 0 ? 'Harmony - Added' : 'Harmony - Clear' }
  ];
}

function renderFeedback(analysis) {
  if (!feedbackCard) return;
  const ai = analysis.moodAI;
  const sentence = window.SoundiMoodAI?.createFeedbackSentence(ai, currentLanguage) || '';
  const primary = ai?.primaryMood || 'calm';
  const secondary = ai?.secondaryMood || 'dreamy';
  const label = (mood) => window.SoundiMoodAI?.moodMeta?.[mood]?.label?.[currentLanguage] || mood;
  const scoreText = ai?.status === 'ready'
    ? `${Math.round((ai.primaryScore || 0) * 100)} / ${Math.round((ai.secondaryScore || 0) * 100)}`
    : currentLanguage === 'ko' ? '분석 대기' : 'Waiting';
  feedbackCard.innerHTML = `
    <strong>${currentLanguage === 'ko' ? '구조 기반 AI 피드백' : 'Structure-based AI feedback'}</strong>
    <p>${escapeHtml(sentence)}</p>
    <div class="feedback-mood-row">
      <span>${escapeHtml(label(primary))}</span>
      <span>${escapeHtml(label(secondary))}</span>
      <em>${scoreText}</em>
    </div>
  `;
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

function playPianoLikeNote(note, sustainSteps = 1, accidental = 0) {
  ensureAudio();
  const now = audioContext.currentTime;
  const duration = Math.max(0.42, sustainSteps * getStepIntervalSeconds());
  const master = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const frequency = getPlaybackFrequency(note, accidental);
  const octaveBoost = note.octave === 1 ? 1.18 : 1;
  const isLow = frequency < 110;
  const cutoff = isLow
    ? Math.max(360, frequency * 7.5)
    : Math.min(6200, Math.max(900, frequency * 8.5));
  const outputGain = (frequency < 55 ? 0.38 : frequency < 110 ? 0.29 : frequency > 2600 ? 0.11 : 0.16) * octaveBoost;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, now);
  filter.Q.setValueAtTime(0.45, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(outputGain, now + 0.028);
  master.gain.exponentialRampToValueAtTime(outputGain * 0.72, now + 0.16);
  master.gain.setValueAtTime(outputGain * 0.72, now + Math.max(0.18, duration - 0.12));
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.24);
  filter.connect(master).connect(audioContext.destination);

  const partials = isLow
    ? [
      { ratio: 1, gain: 1.0 * octaveBoost, type: 'sine' },
      { ratio: 1.005, gain: 0.42 * octaveBoost, type: 'triangle' },
      { ratio: 2, gain: 0.14, type: 'sine' }
    ]
    : [
      { ratio: 1, gain: 0.56, type: 'triangle' },
      { ratio: 2.003, gain: 0.13, type: 'sine' },
      { ratio: 3.002, gain: 0.045, type: 'sine' }
    ];

  partials.forEach((partial) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(partial.gain, now + 0.024);
    gain.gain.exponentialRampToValueAtTime(partial.gain * 0.62, now + 0.18);
    gain.gain.setValueAtTime(partial.gain * 0.62, now + Math.max(0.18, duration - 0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.24);
    oscillator.connect(gain).connect(filter);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.26);
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
  updatePlaybackPositionDisplay(step);
  const loopBounds = isPlaying ? getLoopBounds() : { start: 0, end: STEP_COUNT };
  const loopLength = Math.max(1, loopBounds.end - loopBounds.start);
  playhead.style.setProperty('--progress', `${((step - loopBounds.start + 1) / loopLength) * 100}%`);
  gridPlayhead?.style.setProperty('--play-step', String(step));
  if (audition || isPlaying) {
    active.forEach((item) => {
      if (!audition && step > 0 && hasNote(item.noteId, step - 1)) return;
      const note = notes.find((entry) => entry.id === item.noteId);
      if (note) playPianoLikeNote(note, audition ? 1 : getSustainLength(item.noteId, step), item.accidental || 0);
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
  gridPlayhead?.style.setProperty('--play-step', '0');
  updateDurationDisplay();
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
  const sentence = window.SoundiMoodAI?.createFeedbackSentence(analysis.moodAI, currentLanguage);
  return [sentence || (currentLanguage === 'ko'
    ? '노트를 조금 더 놓으면, 음역과 리듬의 구조를 바탕으로 분위기를 표현할게요.'
    : 'Add a few more notes, and I will describe the mood from the pitch and rhythm structure.')];
}

function getMoodTypeLabel(analysis) {
  const mood = analysis.moodAI?.primaryMood || analysis.paletteKey;
  const secondary = analysis.moodAI?.secondaryMood;
  const meta = window.SoundiMoodAI?.moodMeta || {};
  const primaryLabel = meta[mood]?.label?.en || mood;
  const secondaryLabel = analysis.moodAI?.mixedMood ? meta[secondary]?.label?.en : '';
  return secondaryLabel ? `${primaryLabel} / ${secondaryLabel}` : primaryLabel;
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
  if (remainingX > 480) return;
  STEP_COUNT += 32;
  highestOctave = MAX_OCTAVE;
  lowestOctave = MIN_OCTAVE;
  notes = buildNotes();
  render();
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

function scrollC4RangeToCenter(behavior = 'auto') {
  if (!scoreScroll) return;
  const firstMiddleIndex = notes.findIndex((note) => note.octave === 4 && note.key === 'si');
  if (firstMiddleIndex < 0) return;
  const cellSize = getComposeCellSize();
  const middleRangeCenter = firstMiddleIndex * cellSize + (NOTE_ORDER.length * cellSize) / 2;
  const nextTop = Math.max(0, middleRangeCenter - scoreScroll.clientHeight / 2);
  scoreScroll.scrollTo({ top: nextTop, behavior });
}

function localized(value) {
  if (value && typeof value === 'object') return value[currentLanguage] || value.en || value.ko || '';
  return value || '';
}

function applyLanguage(nextLanguage = currentLanguage) {
  currentLanguage = nextLanguage;
  document.documentElement.lang = currentLanguage;
  const dictionary = translations[currentLanguage] || translations.en;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key] != null) element.textContent = dictionary[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (dictionary[key] != null) element.innerHTML = dictionary[key];
  });

  if (languageToggle) {
    const currentText = currentLanguage === 'ko' ? 'KOR' : 'ENG';
    const nextText = currentLanguage === 'ko' ? 'ENG' : 'KOR';
    languageToggle.querySelector('.language-current')?.replaceChildren(document.createTextNode(currentText));
    languageToggle.querySelector('.language-next')?.replaceChildren(document.createTextNode(nextText));
    languageToggle.setAttribute('aria-label', currentLanguage === 'ko' ? 'Switch to English' : '한국어로 전환');
  }
  updateHarmonyTypeControls();
  if (playbackAnalysis) {
    renderMoodMetrics(playbackAnalysis);
    if (isPlaying) startCaptionCycle(playbackAnalysis);
  }
  renderLessonStep();
}

function renderLessonStep() {
  const track = lessonTracks[lessonTrack];
  if (!track || !lessonDemo || !lessonStepLabel || !lessonTitle || !lessonText) return;
  lessonDemo.dataset.step = String(lessonStep);
  lessonDemo.dataset.track = lessonTrack;
  lessonTrackButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.lessonTrack === lessonTrack);
  });
  lessonStepLabel.textContent = typeof track.label === 'function' ? track.label() : track.label;
  lessonTitle.textContent = localized(typeof track.title === 'function' ? track.title() : track.title);
  lessonText.textContent = localized(typeof track.text === 'function' ? track.text() : track.text);
  if (lessonPrevButton) lessonPrevButton.disabled = lessonTrackOrder.indexOf(lessonTrack) === 0;
  if (lessonNextButton) lessonNextButton.textContent = lessonTrack === 'feedback' ? 'Compose' : 'Next';
  if (lessonStartButton) lessonStartButton.hidden = lessonTrack !== 'feedback';
}

function setLessonTrack(nextTrack) {
  if (!lessonTracks[nextTrack]) return;
  lessonTrack = nextTrack;
  lessonStep = 0;
  renderLessonStep();
}

function advanceLesson() {
  const currentIndex = lessonTrackOrder.indexOf(lessonTrack);
  if (currentIndex >= 0 && currentIndex < lessonTrackOrder.length - 1) {
    setLessonTrack(lessonTrackOrder[currentIndex + 1]);
    return;
  }
  setView('compose');
}

function retreatLesson() {
  const currentIndex = lessonTrackOrder.indexOf(lessonTrack);
  if (currentIndex > 0) {
    setLessonTrack(lessonTrackOrder[currentIndex - 1]);
  }
}

function setView(viewName) {
  const wasCompose = document.body.dataset.view === 'compose';
  document.body.dataset.view = viewName;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-active', view.id === `${viewName}View`);
  });
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });
  if (viewName !== 'compose' && isPlaying) stopPlayback();
  if (viewName === 'compose' || viewName === 'lesson' || viewName === 'home') window.scrollTo({ top: 0, behavior: 'auto' });
  if (viewName === 'compose' && !wasCompose && !hasCenteredComposeOnEntry) {
    hasCenteredComposeOnEntry = true;
    requestAnimationFrame(() => scrollC4RangeToCenter('auto'));
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
  if (!revealItems.length) return;
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
  const resetScoreHint = () => {
    scoreHintTarget = null;
    if (activeCursorHintGroup === 'harmony' || activeCursorHintGroup === 'reference') {
      updateCursorHint();
    } else {
      window.clearTimeout(cursorHintTimer);
      customCursor.classList.remove('show-hint');
    }
  };

  const scheduleScoreHint = (event) => {
    const suggestedCell = event.target?.closest?.('.grid-cell.is-suggested');
    const target = getGridTargetFromPointer(event);
    const note = target ? notes.find((entry) => entry.id === target.noteId) : null;
    const isReferenceArea = note?.octave === 4;
    const nextTarget = suggestedCell
      ? {
        group: 'harmony',
        key: `harmony:${suggestedCell.dataset.noteId}:${suggestedCell.dataset.step}`,
        text: `${suggestedCell.dataset.relation || 'fits'}<br />from selected note`
      }
      : isReferenceArea
        ? {
          group: 'reference',
          key: 'reference-octave',
          text: 'This soft gray<br />area is middle notes'
        }
        : null;

    if (!nextTarget) {
      resetScoreHint();
      return;
    }

    const movement = scoreHintTarget
      ? Math.hypot(event.clientX - scoreHintTarget.x, event.clientY - scoreHintTarget.y)
      : Infinity;
    if (scoreHintTarget?.key === nextTarget.key && movement < 4) return;

    window.clearTimeout(cursorHintTimer);
    scoreHintTarget = {
      ...nextTarget,
      x: event.clientX,
      y: event.clientY
    };
    activeCursorHintGroup = nextTarget.group;
    customCursor.classList.remove('show-hint');
    setCursorHintText(nextTarget.text);
    cursorHintTimer = window.setTimeout(() => {
      if (!scoreHintTarget || scoreHintTarget.key !== nextTarget.key) return;
      positionCursorHint();
      customCursor.classList.add('show-hint');
    }, 1000);
  };

  scoreGrid?.addEventListener('pointermove', scheduleScoreHint);
  scoreGrid?.addEventListener('pointerleave', resetScoreHint);

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
  if (tensionControl) tensionControl.hidden = !guideEnabled;
  harmonyTypeButton.textContent = localized(HARMONY_TYPES[harmonyType]?.label) || 'Major Triad';
  if (tensionButton) {
    tensionButton.textContent = localized(TENSION_TYPES[tensionType]?.label) || 'Tension Off';
    tensionButton.classList.toggle('has-tension', tensionType !== 'none');
  }
  if (!guideEnabled) {
    closeHarmonyTypeMenu();
    closeTensionMenu();
  }
  harmonyTypeMenu?.querySelectorAll('[data-harmony-type]').forEach((button) => {
    button.setAttribute('aria-checked', String(button.dataset.harmonyType === harmonyType));
  });
  tensionMenu?.querySelectorAll('[data-tension-type]').forEach((button) => {
    button.setAttribute('aria-checked', String(button.dataset.tensionType === tensionType));
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

function openTensionMenu() {
  if (!tensionMenu || !tensionButton || !guideEnabled) return;
  tensionMenu.hidden = false;
  tensionButton.classList.add('is-active');
  tensionButton.setAttribute('aria-expanded', 'true');
}

function closeTensionMenu() {
  if (!tensionMenu || !tensionButton) return;
  tensionMenu.hidden = true;
  tensionButton.classList.remove('is-active');
  tensionButton.setAttribute('aria-expanded', 'false');
}

function toggleTensionMenu() {
  if (!tensionMenu || tensionMenu.hidden) {
    openTensionMenu();
    return;
  }
  closeTensionMenu();
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

function setTensionType(type) {
  if (!TENSION_TYPES[type]) return;
  tensionType = type;
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  closeTensionMenu();
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
    requestAnimationFrame(() => scrollC4RangeToCenter('auto'));
  }
}

function ensureOctaveRangeForComposition() {
  composition.forEach((item) => { if (!Number.isFinite(item.accidental)) item.accidental = 0; });
  highestOctave = MAX_OCTAVE;
  lowestOctave = MIN_OCTAVE;
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

function updatePlaybackPositionDisplay(step) {
  if (!compositionDuration || !isPlaying) return;
  const seconds = step * getStepIntervalSeconds();
  compositionDuration.textContent = formatDuration(seconds);
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
  highestOctave = MAX_OCTAVE;
  lowestOctave = MIN_OCTAVE;
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
tensionButton?.addEventListener('click', toggleTensionMenu);
tensionMenu?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tension-type]');
  if (!button) return;
  setTensionType(button.dataset.tensionType);
});
document.addEventListener('pointerdown', (event) => {
  if (harmonyTypeControl?.contains(event.target) || tensionControl?.contains(event.target)) return;
  closeHarmonyTypeMenu();
  closeTensionMenu();
});
exampleButton?.addEventListener('click', openExampleSongs);
middleNotesButton?.addEventListener('click', scrollToMiddleNotes);
window.addEventListener('keydown', handleKeyboardShortcuts);
scoreGrid?.addEventListener('pointerdown', beginGridDragFromEvent);
scoreGrid?.addEventListener('pointermove', continueGridDragFromEvent);
scoreScroll?.addEventListener('scroll', extendScoreIfNeeded, { passive: true });
scoreScroll?.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setComposeZoom(composeZoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
}, { passive: false });
zoomOutButton?.addEventListener('click', () => setComposeZoom(composeZoom - ZOOM_STEP));
zoomInButton?.addEventListener('click', () => setComposeZoom(composeZoom + ZOOM_STEP));
resetZoomButton?.addEventListener('click', () => setComposeZoom(1));
zoomLabel?.addEventListener('focus', () => zoomLabel.select());
zoomLabel?.addEventListener('blur', commitZoomInput);
zoomLabel?.addEventListener('keydown', handleZoomInputKeydown);
lessonTrackButtons.forEach((button) => {
  button.addEventListener('click', () => setLessonTrack(button.dataset.lessonTrack));
});
lessonPrevButton?.addEventListener('click', retreatLesson);
lessonNextButton?.addEventListener('click', advanceLesson);
languageToggle?.addEventListener('click', () => {
  languageToggle.classList.add('is-switching');
  window.setTimeout(() => {
    applyLanguage(currentLanguage === 'ko' ? 'en' : 'ko');
  }, 240);
  window.setTimeout(() => {
    languageToggle.classList.remove('is-switching');
  }, 240);
});
window.addEventListener('resize', handleComposeResize);
resizeHandle.addEventListener('pointerdown', startResize);
sideTabButton?.addEventListener('click', openSidePanel);
closePanelButton?.addEventListener('click', closeSidePanel);

updateHarmonyTypeControls();
updateTitleDisplay();
syncControlButtons();
applyLanguage('ko');
setComposeZoom(1, false);
render();
renderArchive();
initScrollReveals();
initSoftSectionScroll();
initCustomCursor();
