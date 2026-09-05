let STEP_COUNT = 64;
const STORAGE_KEY = 'soundi-v6-archive';
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
  major: { label: { ko: '장3화음', en: 'Major Triad' }, intervals: [4, 7], maxSuggestions: 2, maxNotes: 3 },
  minor: { label: { ko: '단3화음', en: 'Minor Triad' }, intervals: [3, 7], maxSuggestions: 2, maxNotes: 3 },
  suspended: { label: { ko: '서스펜디드 코드', en: 'Suspended Chord' }, intervals: [5, 7], maxSuggestions: 2, maxNotes: 3 },
  fifth: { label: { ko: '완전5도', en: 'Perfect Fifth' }, intervals: [7], maxSuggestions: 1, maxNotes: 2 },
  octave: { label: { ko: '옥타브', en: 'Octave' }, intervals: [12], maxSuggestions: 1, maxNotes: 2 }
};

const TENSION_TYPES = {
  none: { label: { ko: '텐션 끄기', en: 'Tension Off' }, intervals: [] },
  major7: { label: { ko: '장7도', en: 'Major 7' }, intervals: [11] },
  add9: { label: { ko: '부가9도', en: 'Add 9' }, intervals: [14] }
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
const volumeControl = document.getElementById('volumeControl');
const volumeButton = document.getElementById('volumeButton');
const volumePopover = document.getElementById('volumePopover');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValueLabel = document.getElementById('volumeValueLabel');
const middleNotesButton = document.getElementById('middleNotesButton');
const guideButton = document.getElementById('guideButton');
const harmonyTypeControl = document.getElementById('harmonyTypeControl');
const harmonyTypeButton = document.getElementById('harmonyTypeButton');
const harmonyTypeMenu = document.getElementById('harmonyTypeMenu');
const tensionControl = document.getElementById('tensionControl');
const tensionButton = document.getElementById('tensionButton');
const tensionMenu = document.getElementById('tensionMenu');
const exampleButton = document.getElementById('exampleButton');
const importExampleButton = document.getElementById('importExampleButton');
const exampleName = document.getElementById('exampleName');
const compositionDuration = document.getElementById('compositionDuration');
const archiveGrid = document.getElementById('archiveGrid');
const coverModal = document.getElementById('coverModal');
const coverPreviewRecord = document.getElementById('coverPreviewRecord');
const coverTitleInput = document.getElementById('coverTitleInput');
const coverCloseButton = document.getElementById('coverCloseButton');
const coverOptionButtons = document.querySelectorAll('[data-cover-type]');
const coverImageInput = document.getElementById('coverImageInput');
const publishCoverButton = document.getElementById('publishCoverButton');
const playhead = document.getElementById('playhead');
const gridPlayhead = document.getElementById('gridPlayhead');
const visualStage = document.getElementById('visualStage');
const visualMarks = document.getElementById('visualMarks');
const visualCaption = document.getElementById('visualCaption');
const moodMetrics = document.getElementById('moodMetrics');
const analysisTabs = document.querySelectorAll('[data-analysis-tab]');
const analysisPages = document.querySelectorAll('.analysis-page');
const feedbackCard = document.getElementById('feedbackCard');
const intentPrompt = document.getElementById('intentPrompt');
const intentStyle = document.getElementById('intentStyle');
const intentDirection = document.getElementById('intentDirection');
const aiNativeSelects = [intentStyle, intentDirection].filter(Boolean);
const aiAnalyzeButton = document.getElementById('aiAnalyzeButton');
const intentPromptError = document.getElementById('intentPromptError');
const aiFormMessage = document.getElementById('aiFormMessage');
const aiCoachResult = document.getElementById('aiCoachResult');
const aiCoachSource = document.getElementById('aiCoachSource');
const resizeHandle = document.getElementById('resizeHandle');
const siteHeader = document.querySelector('.site-header');
const lessonView = document.getElementById('lessonView');
const lessonDemo = document.getElementById('lessonDemo');
const lessonRhythmGrid = document.getElementById('lessonRhythmGrid');
const lessonMoodOrb = document.getElementById('lessonMoodOrb');
const lessonMoodText = document.getElementById('lessonMoodText');
const lessonStepLabel = document.getElementById('lessonStepLabel');
const lessonTitle = document.getElementById('lessonTitle');
const lessonText = document.getElementById('lessonText');
const lessonPrevButton = document.getElementById('lessonPrevButton');
const lessonNextButton = document.getElementById('lessonNextButton');
const lessonStartButton = document.getElementById('lessonStartButton');
const lessonTrackButtons = document.querySelectorAll('[data-lesson-track]');
const lessonNoteButtons = document.querySelectorAll('[data-lesson-note]');
const lessonTensionToggle = document.getElementById('lessonTensionToggle');
const languageToggle = document.getElementById('languageToggle');
const revealItems = document.querySelectorAll('.reveal');
const sideTabButton = document.getElementById('sideTabButton');
const sidePanel = document.getElementById('sidePanel');
const closePanelButton = document.getElementById('closePanelButton');
const customCursor = document.getElementById('customCursor');

let composition = [];
let audioContext = null;
let masterGainNode = null;
let volumeLevel = 1;
let playTimer = null;
let playStep = 0;
let isPlaying = false;
let isMuted = false;
let isResizing = false;
let volumeAdjustTimer = null;
let cursorHintTimer = null;
let controlHintExitTimer = null;
let activeCursorHintGroup = null;
let scoreHintTarget = null;
let lastPointerX = 0;
let lastPointerY = 0;
let cursorFrame = null;
let cursorHintFrame = null;
let pendingScoreHintEvent = null;
let scoreHintFrame = null;
let archiveItems = loadArchive();
let editingArchiveId = null;
let draftCover = { type: 'block', color: '#ffdc21', image: '' };
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
let lessonTensionEnabled = false;
let aiCoachStatus = 'idle';
let aiCoachFeedback = null;
let aiAnalyzeLockedUntilEdit = false;
let lessonMoodIndex = 0;
let lessonMoodTimer = null;
let lessonRhythmTimer = null;
let visualCaptionTimer = null;
let lastVisualCaptionText = '';
const SESSION_VIEW_KEY = 'soundi:lastView';
const SESSION_ANALYSIS_TAB_KEY = 'soundi:lastAnalysisTab';
const viewNames = ['home', 'lesson', 'compose', 'archive'];
const analysisTabNames = ['visual', 'coach'];

const lessonTrackOrder = ['pitch', 'rhythmLength', 'colorHarmony', 'feedback'];

const aiPromptExamples = {
  ko: [
    '예: 비 오는 날 조용한 피아노 음악',
    '예: 밝고 짧게 움직이는 동요',
    '예: 밤에 듣는 차분한 멜로디',
    '예: 조금 긴장감 있는 OST',
    '예: 따뜻하고 느린 어쿠스틱 곡',
    '예: 가볍고 리듬이 살아있는 음악'
  ],
  en: [
    'e.g. quiet piano music on a rainy day',
    'e.g. a bright short children’s melody',
    'e.g. a calm melody for night',
    'e.g. a slightly tense soundtrack cue',
    'e.g. warm and slow acoustic music',
    'e.g. light music with a clear rhythm'
  ]
};
let lastPromptExample = '';

const lessonTracks = {
  pitch: {
    label: '',
    title: { ko: '색으로 표현한 음계', en: 'Notes Shown in Color' },
    text: {
      ko: '각 계이름은 서로 다른 색으로 표현돼요. 같은 계이름은 옥타브가 달라도 같은 색을 사용해 음의 반복과 흐름을 쉽게 알아볼 수 있어요.',
      en: 'Each note is shown with its own color. The same note name keeps the same color across octaves, making repetition and flow easier to see.'
    }
  },
  colorHarmony: {
    label: '',
    title: { ko: '겹쳐진 음의 조화', en: 'Layered Note Harmony' },
    text: {
      ko: '같은 세로선에 놓인 음은 동시에 연주돼요. 색 조합을 통해 화음의 조화를 확인해보세요.',
      en: 'Notes on the same vertical line play together. Use the color combinations to see how the harmony works.'
    }
  },
  rhythmLength: {
    label: '',
    title: { ko: '길이로 표현한 리듬', en: 'Rhythm Shown by Length' },
    text: {
      ko: '한 블록은 한 박자를 의미해요. 같은 음의 블록이 이어지면 하나의 긴 음이 돼요.',
      en: 'One block means one beat. When blocks of the same note continue, they become one long note.'
    }
  },
  feedback: {
    label: '',
    title: { ko: '곡의 분위기', en: 'Song Mood' },
    text: {
      ko: '완성된 곡의 분위기는 색과 움직임으로 표현돼요. 완성된 곡이 어떤 분위기인지 분석해 한눈에 보여줘요.',
      en: 'A finished song mood is expressed through color and movement. The analysis shows the overall atmosphere at a glance.'
    }
  }
};

const lessonRhythmRows = [
  {
    id: 'short',
    label: { ko: '짧은 음', en: 'Short notes' },
    noteId: 're4',
    beatCount: 12,
    blocks: [
      { start: 1, length: 1 },
      { start: 3, length: 1 },
      { start: 5, length: 1 },
      { start: 7, length: 1 },
      { start: 9, length: 1 },
      { start: 11, length: 1 }
    ]
  },
  {
    id: 'mixed',
    label: { ko: '긴 음', en: 'Long notes' },
    noteId: 'si3',
    beatCount: 12,
    blocks: [
      { start: 1, length: 3 },
      { start: 5, length: 3 },
      { start: 9, length: 3 }
    ]
  }
];

const lessonMoodStates = [
  {
    className: 'mood-bright',
    colors: ['#fff4a5', '#bdf569', '#ffb36f'],
    text: { ko: '밝고 가볍게 움직이는 분위기예요.', en: 'A bright, light-moving mood.' }
  },
  {
    className: 'mood-calm',
    colors: ['#dbeaff', '#9dbdff', '#7b75c9'],
    text: { ko: '차분하고 여백이 느껴지는 분위기예요.', en: 'A calm mood with open space.' }
  },
  {
    className: 'mood-warm',
    colors: ['#ffe4b8', '#ffb0a7', '#f7d76f'],
    text: { ko: '따뜻하고 부드럽게 이어지는 분위기예요.', en: 'A warm mood that flows softly.' }
  },
  {
    className: 'mood-tense',
    colors: ['#ff7600', '#65d2ee', '#854cf5'],
    text: { ko: '색 대비가 강해 조금 긴장감 있는 분위기예요.', en: 'Strong color contrast gives it a slightly tense mood.' }
  }
];

const translations = {
  ko: {
    navLesson: '레슨',
    navCompose: '작곡',
    navArchive: '아카이브',
    archiveEmpty: '아직 저장된 곡이 없어요.',
    guideButton: '화음 가이드',
    harmonyMajor: '장3화음',
    harmonyMinor: '단3화음',
    harmonySuspended: '서스펜디드 코드',
    harmonyFifth: '완전5도',
    harmonyOctave: '옥타브',
    tensionNone: '텐션 끄기',
    tensionMajor7: '장7도',
    tensionAdd9: '부가9도',
    examplesButton: '예시곡',
    lessonPitchNav: '01 색으로 표현한 음계',
    lessonColorHarmonyNav: '03 겹쳐진 음의 조화',
    lessonRhythmLengthNav: '02 길이로 표현한 리듬',
    lessonFeedbackNav: '04 곡의 분위기',
    homeReadyButton: '작곡하러 가기',
    lessonStart: '작곡 시작하기',
    lessonMajorCard: '안정적인 색 조합',
    lessonMinorCard: '가깝고 차분한 조합',
    lessonTensionCard: '대비가 큰 조합',
    lessonTensionToggleOff: '텐션 OFF',
    lessonTensionToggleOn: '텐션 ON',
    lessonHarmonyMajorName: '장3화음',
    lessonHarmonyMajorDesc: '도·미·솔처럼 세 음을 같은 위치에 함께 놓아보세요. 이렇게 여러 음을 동시에 겹쳐 사용하는 것을 ‘화음’이라고 해요. 어떤 음을 함께 사용하느냐에 따라 화음의 분위기도 달라져요. 도·미·솔처럼 세 음이 안정적으로 어우러지는 조합을 ‘장3화음’이라고 하며, 보통 밝고 편안한 분위기를 표현할 때 사용해요.',
    lessonHarmonyMinorName: '단3화음',
    lessonHarmonyMinorDesc: '레·파·라 세 음을 함께 놓아 만든 화음이에요. 장3화음과 마찬가지로 세 음을 사용하지만, 함께 사용하는 음이 달라지면 만들어지는 분위기도 달라져요. 장3화음이 밝은 분위기와 자주 연결된다면, 단3화음은 차분하거나 어두운 분위기를 표현할 때 자주 사용해요.',
    lessonHarmonySuspendedName: '서스펜디드',
    lessonHarmonySuspendedDesc: '미·라·시 세 음을 함께 놓아 만든 화음이에요. 밝거나 어두운 분위기 어느 한쪽으로 쉽게 정해지지 않는 것이 특징이에요. 무언가 아직 끝나지 않은 듯한 긴장감이나 다음으로 이어지는 느낌을 표현할 때 사용할 수 있어요.',
    lessonHarmonyFifthName: '완전5도',
    lessonHarmonyFifthDesc: '파·도처럼 두 음을 함께 놓아 만든 가장 단순한 조합이에요. 밝음과 어두움 어느 한쪽의 성격이 강하지 않고, 단단하고 열린 분위기를 만들 수 있어요. 이렇게 두 음이 일정한 간격으로 떨어져 있는 관계를 음악에서는 ‘완전5도’라고 해요.',
    lessonTensionHeading: '텐션',
    lessonTensionDesc: '텐션은 기본 화음에 한 음을 더해 분위기를 바꾸는 방법이에요.',
    lessonMajor7Name: '장7도',
    lessonMajor7Desc: '솔·시·레 세 음에 파♯을 하나 더 겹쳐 만든 화음이에요. 기본적인 세 음의 조화에 새로운 음 하나가 더해지면서 조금 더 복잡하고 섬세한 분위기를 만들어요. 이렇게 네 음을 쌓은 조합을 ‘장7도 화음’이라고 해요.',
    lessonAdd9Name: '부가9도',
    lessonAdd9Desc: '라·도♯·미 세 음에 높은 시를 하나 더 겹쳐 만든 화음이에요. 기본이 되는 세 음은 그대로 유지하면서 새로운 음 하나를 더하기 때문에, 기존의 분위기를 크게 바꾸지 않고 더 넓고 풍부한 조화를 만들 수 있어요. 이런 화음을 ‘부가9도 화음’이라고 해요.',
    lessonFeedbackDemo: '시각 피드백은 내 음악의 구조를 읽어줘요.',
    analysisVisualTab: '내 곡의 분위기',
    analysisAiTab: 'With AI',
    importExampleButton: '내 곡으로 가져오기',
    aiPromptLabel: '만들고 싶은 곡',
    aiPromptPlaceholder: '예: 비 오는 날 조용한 피아노 음악',
    aiStyleLabel: '음악 스타일',
    aiDirectionLabel: '수정 방향',
    aiAnalyzeButton: '분석하기',
    metricPitch: '음높이 범위',
    metricPitchValue: '음높이 - 균형',
    metricRhythm: '리듬 밀도',
    metricRhythmValue: '리듬 - 보통'
  },
  en: {
    navLesson: 'Lesson',
    navCompose: 'Compose',
    navArchive: 'Archive',
    archiveEmpty: 'No saved compositions yet.',
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
    lessonPitchNav: '01 Notes Shown in Color',
    lessonColorHarmonyNav: '03 Layered Note Harmony',
    lessonRhythmLengthNav: '02 Rhythm Shown by Length',
    lessonFeedbackNav: '04 Song Mood',
    homeReadyButton: 'Ready to compose?',
    lessonStart: 'Start composing',
    lessonMajorCard: 'Stable color set',
    lessonMinorCard: 'Close, darker set',
    lessonTensionCard: 'More contrast',
    lessonTensionToggleOff: 'Tension OFF',
    lessonTensionToggleOn: 'Tension ON',
    lessonHarmonyMajorName: 'Major Triad',
    lessonHarmonyMajorDesc: 'Place C, E, and G together in the same position. When several notes are layered at the same time, they form what musicians call a “chord.” Different combinations of notes can create different moods. C, E, and G form a major triad, a combination often used to create a bright and comfortable mood.',
    lessonHarmonyMinorName: 'Minor Triad',
    lessonHarmonyMinorDesc: 'Place D, F, and A together to make this chord. Like a major triad, it uses three notes, but changing which notes are combined can change the mood. While major triads are often connected with brighter moods, minor triads are often used for calmer or darker moods.',
    lessonHarmonySuspendedName: 'Suspended',
    lessonHarmonySuspendedDesc: 'Place E, A, and B together to make this chord. Its character does not settle clearly into a bright or dark mood. It can create a sense of tension, as if something is not finished yet or is about to continue into the next chord.',
    lessonHarmonyFifthName: 'Perfect Fifth',
    lessonHarmonyFifthDesc: 'Place F and C together to make this simple two-note combination. It does not strongly lean toward either a bright or dark character, and can create a strong, open mood. Musicians call this particular relationship between two notes a “perfect fifth.”',
    lessonTensionHeading: 'Tension',
    lessonTensionDesc: 'Tension adds one note to a basic chord and changes its mood.',
    lessonMajor7Name: 'Major 7th',
    lessonMajor7Desc: 'Add F♯ to G, B, and D to create a four-note chord. Adding one new note to the basic three-note combination creates a more complex and delicate mood. This combination is called a “major seventh chord.”',
    lessonAdd9Name: 'Add 9',
    lessonAdd9Desc: 'Add a higher B to A, C♯, and E to create this four-note chord. The original three-note combination stays in place while one new note is added, creating a wider and richer harmony without greatly changing its basic character. This is called an “add9 chord.”',
    lessonFeedbackDemo: 'Visual feedback reads your composition structure.',
    analysisVisualTab: 'My Song Mood',
    analysisAiTab: 'With AI',
    importExampleButton: 'Import to my song',
    aiPromptLabel: 'What you want to make',
    aiPromptPlaceholder: 'e.g. quiet piano music on a rainy day',
    aiStyleLabel: 'Music style',
    aiDirectionLabel: 'Edit direction',
    aiAnalyzeButton: 'Analyze',
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
  clear: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M32 22C32 27.5 27.5 32 22 32C16.5 32 12 27.5 12 22C12 16.5 16.5 12 22 12C25.1 12 27.9 13.4 29.7 15.7"></path><path d="M31 10V17H24"></path></svg>',
  volume: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M13 18H18L25 12V32L18 26H13V18Z"></path><path d="M29 18.5C30.2 20.1 30.2 23.9 29 25.5"></path><path d="M32.5 15C35.3 18.5 35.3 25.5 32.5 29"></path></svg>',
  muted: '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M13 18H18L25 12V32L18 26H13V18Z"></path><path d="M30 18L36 24"></path><path d="M36 18L30 24"></path></svg>'
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
  const raw = Math.min(48, Math.max(32, window.innerHeight * 0.042));
  const dpr = window.devicePixelRatio || 1;
  return Math.round(raw * dpr) / dpr;
}

function refreshComposeZoomSize() {
  const dpr = window.devicePixelRatio || 1;
  const rawSize = getBaseComposeCellSize() * composeZoom;
  const snappedSize = Math.round(rawSize * dpr) / dpr;
  document.documentElement.style.setProperty('--compose-cell', `${snappedSize}px`);
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
  const next = Math.min(MAX_ZOOM, Math.max(minZoom, nextZoom));
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
  resizeIntentPrompt();
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
  return getGridTargetFromPoint(event.clientX, event.clientY);
}

function getGridTargetFromPoint(clientX, clientY) {
  if (!scoreGrid) return null;
  const rect = scoreGrid.getBoundingClientRect();
  const cellSize = getComposeCellSize();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
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
    refreshAnalysisAfterEdit();
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
  let changed = false;
  if (shouldFill && index < 0) {
    const suggestion = getHarmonySuggestion(noteId, step, false);
    composition.push({
      id: 'n-' + Date.now() + '-' + Math.round(Math.random() * 9999),
      noteId,
      step,
      accidental: suggestion?.accidental || 0
    });
    changed = true;
  } else if (!shouldFill && index >= 0) {
    composition.splice(index, 1);
    changed = true;
  }
  sortComposition();
  updateHarmonyAnchorAfterEdit(noteId, step, shouldFill, keptAnchor);
  if (changed) refreshAnalysisAfterEdit();
}

function refreshAnalysisAfterEdit() {
  aiAnalyzeLockedUntilEdit = false;
  if (aiAnalyzeButton) aiAnalyzeButton.disabled = aiCoachStatus === 'loading';
  if (isPlaying) {
    playbackAnalysis = analyzeComposition();
    startCaptionCycle(playbackAnalysis);
    renderAnalysis(playStep);
    return;
  }
  renderAnalysis();
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
  const isEmpty = composition.length === 0;
  const moodAI = window.SoundiMoodAI?.analyzeMusicMood(composition, notes, {
    stepCount: STEP_COUNT,
    minNotesForMood: 4
  });
  const features = moodAI?.features || {};
  const activeSteps = features.raw?.activeSteps || [...new Set(composition.map((item) => item.step))].sort((a, b) => a - b);
  const durations = features.raw?.durations || [];
  const visualState = moodAI?.visualState;
  const emptyColors = ['#ffffff', '#f8f8f8', '#efefef', '#ffffff'];
  const paletteKey = isEmpty ? 'empty' : moodAI?.primaryMood || 'warm';
  const palette = {
    name: getMoodTypeLabel({ paletteKey, moodAI }),
    vars: isEmpty ? emptyColors.slice(0, 3) : visualState?.colors?.slice(0, 3) || palettes.warm.vars,
    marks: isEmpty ? emptyColors : visualState?.colors || palettes.warm.marks,
    sphere: isEmpty ? emptyColors : visualState?.colors || palettes.warm.sphere,
    motion: {
      gradient: visualState?.gradientDuration || 10400,
      shape: visualState?.shapeDuration || 10800
    }
  };

  return {
    isEmpty,
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
    pitchLevel: features.averagePitch || 0.5,
    rhythmDensity: features.rhythmicDensity || 0,
    noteLength: features.averageDuration || 0,
    repetitionStrength: features.repetitionStrength || 0,
    rhythmVariation: features.rhythmVariation || 0,
    shortNoteRatio: features.shortNoteRatio || 0,
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
  visualStage.style.setProperty('--focus-x', '50%');
  visualStage.style.setProperty('--focus-y', '34%');

  renderMoodBlob(analysis, activeStep);
  renderMoodMetrics(analysis);
  renderFeedback(analysis);
  renderLocalMoodCaption(analysis);
  renderAICoachResult();
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
  const visualMotion = getReactiveCircleMotion(analysis);

  blob.classList.remove('is-shape-reset');
  void blob.offsetWidth;

  blob.className = `mark mood-${analysis.paletteKey}`;
  blob.style.setProperty('--x', '50%');
  blob.style.setProperty('--y', '34%');
  blob.style.setProperty('--w', '248px');
  blob.style.setProperty('--h', '248px');
  blob.style.setProperty('--rotate', '0deg');
  blob.style.setProperty('--opacity', '1');
  blob.style.setProperty('--pitch-level', analysis.pitchLevel);
  blob.style.setProperty('--mark-color', color);
  blob.style.setProperty('--mark-color-2', color2);
  blob.style.setProperty('--mark-color-3', color3);
  blob.style.setProperty('--mark-color-4', color4);
  blob.style.setProperty('--surface-duration', `${visualMotion.surfaceDuration}ms`);
  blob.style.setProperty('--shape-duration', `${visualMotion.shapeDuration}ms`);
  blob.style.setProperty('--pulse-duration', `${visualMotion.pulseDuration}ms`);
  blob.style.setProperty('--pulse-scale', visualMotion.pulseScale);
  blob.style.setProperty('--outline-a', `${visualMotion.outlineA}%`);
  blob.style.setProperty('--outline-b', `${visualMotion.outlineB}%`);
  blob.style.setProperty('--outline-c', `${visualMotion.outlineC}%`);
  blob.style.setProperty('--outline-d', `${visualMotion.outlineD}%`);
  blob.style.setProperty('--surface-blur', `${visualMotion.surfaceBlur}px`);
  blob.style.setProperty('--surface-saturate', visualMotion.surfaceSaturate);
}

function getReactiveCircleMotion(analysis) {
  if (analysis.isEmpty) {
    return {
      outlineA: 50,
      outlineB: 50,
      outlineC: 50,
      outlineD: 50,
      shapeDuration: 16000,
      surfaceDuration: 18000,
      surfaceBlur: 34,
      surfaceSaturate: '1.00',
      pulseDuration: 4200,
      pulseScale: '1.004'
    };
  }
  const outlineChange = clampMetric(analysis.tension * 0.5 + analysis.rhythmVariation * 0.28 + (1 - analysis.repetitionStrength) * 0.12);
  const surfaceActivity = clampMetric(analysis.rhythmDensity * 0.34 + analysis.rhythmVariation * 0.28 + analysis.energy * 0.26 + (1 - analysis.repetitionStrength) * 0.12);
  const pulseAmount = clampMetric(analysis.energy * 0.58 + analysis.rhythmDensity * 0.3 + analysis.shortNoteRatio * 0.12);
  return {
    outlineA: Math.round(49 + outlineChange * 7),
    outlineB: Math.round(51 - outlineChange * 6),
    outlineC: Math.round(50 + outlineChange * 5),
    outlineD: Math.round(50 - outlineChange * 4),
    shapeDuration: Math.round(13000 - outlineChange * 5600),
    surfaceDuration: Math.round(14500 - surfaceActivity * 7800),
    surfaceBlur: Math.round(32 - surfaceActivity * 10),
    surfaceSaturate: (1.08 + surfaceActivity * 0.34).toFixed(2),
    pulseDuration: Math.round(3400 - pulseAmount * 1650),
    pulseScale: (1.004 + pulseAmount * 0.028).toFixed(3)
  };
}

function clampMetric(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
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
  if (note.octave <= 3) color = mixHex(color, '#0c0c0c', 0.34);
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
  const barCount = 12;
  const hasSignal = !analysis.isEmpty;
  moodMetrics.innerHTML = metrics.map((item) => `
    <section class="mood-metric" style="--metric:${item.percent}%">
      <div class="mood-meter" aria-hidden="true">
        ${Array.from({ length: barCount }, (_, index) => {
          const threshold = Math.round(((index + 1) / barCount) * 100);
          const isActive = hasSignal && item.percent >= threshold;
          return `<span class="${isActive ? 'is-active' : ''}"></span>`;
        }).join('')}
      </div>
      <strong>${item.title}</strong>
    </section>
  `).join('');
}

function getMoodMetricItems(analysis) {
  const pitchPercent = Math.round(clampMetric(analysis.pitchLevel) * 100);
  const rhythmPercent = Math.round(clampMetric(analysis.rhythmDensity) * 100);
  const lengthPercent = Math.round(clampMetric(analysis.noteLength) * 100);
  const repeatPercent = Math.round(clampMetric(analysis.repetitionStrength) * 100);
  const metric = (item) => item;
  if (currentLanguage === 'ko') {
    return [
      metric({ title: '높낮이', min: '낮음', max: '높음', value: `${pitchPercent}%`, percent: pitchPercent }),
      metric({ title: '리듬 밀도', min: '여백', max: '촘촘함', value: `${rhythmPercent}%`, percent: rhythmPercent }),
      metric({ title: '음길이', min: '짧음', max: '김', value: `${lengthPercent}%`, percent: lengthPercent }),
      metric({ title: '반복성', min: '변화', max: '반복', value: `${repeatPercent}%`, percent: repeatPercent })
    ];
  }
  return [
    metric({ title: 'Pitch', min: 'Low', max: 'High', value: `${pitchPercent}%`, percent: pitchPercent }),
    metric({ title: 'Rhythm Density', min: 'Spacious', max: 'Dense', value: `${rhythmPercent}%`, percent: rhythmPercent }),
    metric({ title: 'Note Length', min: 'Short', max: 'Long', value: `${lengthPercent}%`, percent: lengthPercent }),
    metric({ title: 'Repetition', min: 'Changing', max: 'Repeating', value: `${repeatPercent}%`, percent: repeatPercent })
  ];
}

function renderFeedback(analysis) {
  if (!feedbackCard) return;
  const ai = analysis.moodAI;
  const sentence = getConciseFeedbackSentence(analysis);
  const primary = ai?.primaryMood || 'warm';
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

function getConciseFeedbackSentence(analysis) {
  const ai = analysis?.moodAI;

  if (ai && window.SoundiMoodAI?.createFeedbackSentence) {
    return window.SoundiMoodAI.createFeedbackSentence(ai, currentLanguage);
  }

  if (!analysis || analysis.isEmpty) {
    return currentLanguage === 'ko'
      ? '블록을 조금 더 놓아보세요. 곡의 흐름이 보이면 어떤 분위기인지 알려드릴게요.'
      : 'Add a few more blocks. Once the flow takes shape, I will describe the mood it suggests.';
  }

  return currentLanguage === 'ko'
    ? '블록을 조금 더 놓아보세요. 곡의 흐름이 보이면 어떤 분위기인지 알려드릴게요.'
    : 'Add a few more blocks. Once the flow takes shape, I will describe the mood it suggests.';
}

function getRandomPromptExample(language = currentLanguage) {
  const examples = aiPromptExamples[language] || aiPromptExamples.ko;
  if (!examples.length) return '';
  if (examples.length === 1) return examples[0];
  let next = examples[Math.floor(Math.random() * examples.length)];
  if (next === lastPromptExample) {
    next = examples[(examples.indexOf(next) + 1) % examples.length];
  }
  lastPromptExample = next;
  return next;
}

function refreshIntentPromptPlaceholder() {
  if (!intentPrompt) return;
  intentPrompt.setAttribute('placeholder', getRandomPromptExample(currentLanguage));
}

function ensureAIPromptRequiredMarker() {
  const promptField = intentPrompt?.closest('.ai-field');
  const promptLabel = promptField?.querySelector('span');
  promptLabel?.classList.add('is-required');
}

function getIntentPayload() {
  return {
    prompt: intentPrompt?.value.trim() || '',
    style: intentStyle?.value || '',
    direction: intentDirection?.value || ''
  };
}

function resizeIntentPrompt() {
  if (!intentPrompt) return;
  const computed = window.getComputedStyle(intentPrompt);
  const maxHeight = Number.parseFloat(computed.maxHeight) || 112;
  intentPrompt.style.height = 'auto';
  const nextHeight = Math.min(intentPrompt.scrollHeight, maxHeight);
  intentPrompt.style.height = `${nextHeight}px`;
  intentPrompt.style.overflowY = intentPrompt.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function validateAICoachForm(showMessage = false) {
  const intent = getIntentPayload();
  const tooLong = intent.prompt.length > 100;
  const hasPrompt = Boolean(intent.prompt);
  const hasMeaningfulPrompt = isMeaningfulIntentPrompt(intent.prompt);
  const hasCompositionIntent = hasClearCompositionIntent(intent.prompt);
  const hasBlocks = composition.length > 0;
  const promptField = intentPrompt?.closest('.ai-field');

  promptField?.classList.toggle('is-invalid', tooLong || (hasPrompt && (!hasMeaningfulPrompt || !hasCompositionIntent)));
  if (intentPromptError) {
    intentPromptError.textContent = tooLong
      ? (currentLanguage === 'ko' ? '작곡 의도는 100자 이내로 적어주세요.' : 'Keep the prompt within 100 characters.')
      : hasPrompt && !hasMeaningfulPrompt
        ? (currentLanguage === 'ko' ? '읽을 수 있는 작곡 의도로 적어주세요.' : 'Write a readable composition prompt.')
      : hasPrompt && !hasCompositionIntent
        ? (currentLanguage === 'ko' ? '만들고 싶은 곡의 분위기나 방향을 구체적으로 적어주세요.' : 'Describe the mood or direction of the music more clearly.')
      : '';
  }

  if (aiFormMessage) {
    aiFormMessage.textContent = '';
    if (showMessage && !hasPrompt) {
      aiFormMessage.textContent = currentLanguage === 'ko' ? '만들고 싶은 곡을 먼저 적어주세요.' : 'Add a composition prompt first.';
    } else if (showMessage && !hasMeaningfulPrompt) {
      aiFormMessage.textContent = currentLanguage === 'ko' ? '곡의 느낌을 문장으로 적어주세요.' : 'Describe the mood in a short sentence.';
    } else if (showMessage && !hasCompositionIntent) {
      aiFormMessage.textContent = currentLanguage === 'ko' ? '작곡하고 싶은 분위기나 방향을 알 수 없어요. 예: 조용한 피아노, 신나는 동요처럼 구체적으로 적어주세요.' : 'I cannot tell the music direction yet. Try something like “quiet piano” or “bright children’s song.”';
    } else if (showMessage && !hasBlocks) {
      aiFormMessage.textContent = currentLanguage === 'ko' ? '블록을 먼저 놓아주세요.' : 'Add at least one block first.';
    }
  }

  return hasPrompt && hasMeaningfulPrompt && hasCompositionIntent && hasBlocks && !tooLong;
}

function isMeaningfulIntentPrompt(prompt) {
  const normalized = String(prompt || '').trim().replace(/\s+/g, '');
  if (!normalized) return false;
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(normalized)) return false;
  if (/^(.)\1{1,}$/.test(normalized)) return false;
  const koreanSyllables = normalized.match(/[가-힣]/g) || [];
  const latinLetters = normalized.match(/[a-zA-Z]/g) || [];
  const numbers = normalized.match(/\d/g) || [];
  if (koreanSyllables.length >= 2) return true;
  if (latinLetters.length >= 3) return true;
  return koreanSyllables.length + latinLetters.length + numbers.length >= 4;
}

function hasClearCompositionIntent(prompt) {
  const normalized = String(prompt || '').toLowerCase();
  const compact = normalized.replace(/\s+/g, '');
  const intentWords = [
    '음악', '곡', '작곡', '노래', '멜로디', '선율', '리듬', '박자', '화음', '코드', '피아노', '기타', '악기', '동요', '발라드', '클래식', 'ost', '어쿠스틱',
    '분위기', '느낌', '감정', '밝', '신나', '기쁜', '즐거', '차분', '조용', '잔잔', '고요', '편안', '따뜻', '슬픈', '우울', '외로운', '긴장', '불안', '무서', '공포', '몽환', '신비', '꿈', '밤', '비', '바다', '숲',
    'music', 'song', 'compose', 'composition', 'melody', 'rhythm', 'beat', 'harmony', 'chord', 'piano', 'guitar', 'instrument', 'children', 'ballad', 'classical', 'soundtrack', 'acoustic',
    'mood', 'feeling', 'bright', 'happy', 'joy', 'calm', 'quiet', 'soft', 'warm', 'sad', 'lonely', 'tense', 'tension', 'scary', 'dark', 'dreamy', 'mystery', 'night', 'rain'
  ];
  return intentWords.some((word) => compact.includes(word));
}

function clearAICoachFormMessage() {
  resizeIntentPrompt();
  if (aiFormMessage) aiFormMessage.textContent = '';
  validateAICoachForm(false);
}

function initCustomSelects() {
  aiNativeSelects.forEach((select) => {
    if (select.dataset.enhanced === 'true') return;
    select.dataset.enhanced = 'true';
    select.classList.add('native-select');
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    const button = document.createElement('button');
    button.className = 'custom-select-button';
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    Array.from(select.options).forEach((option) => {
      if (option.disabled) return;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'custom-select-option';
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.textContent = option.textContent;
      menu.appendChild(item);
    });

    select.after(wrapper);
    wrapper.append(button, menu);
    syncCustomSelect(select);

    button.addEventListener('click', () => toggleCustomSelect(select));
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.custom-select-option');
      if (!item) return;
      select.value = item.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeCustomSelect(select);
      syncCustomSelect(select);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openCustomSelect(select);
    });
    select.addEventListener('change', () => syncCustomSelect(select));
  });
}

function getCustomSelectParts(select) {
  const wrapper = select?.nextElementSibling?.classList?.contains('custom-select') ? select.nextElementSibling : null;
  return {
    wrapper,
    button: wrapper?.querySelector('.custom-select-button'),
    menu: wrapper?.querySelector('.custom-select-menu')
  };
}

function syncCustomSelect(select) {
  const { button, menu } = getCustomSelectParts(select);
  if (!button || !menu) return;
  const selected = select.options[select.selectedIndex];
  button.textContent = selected?.textContent || '';
  button.classList.toggle('is-placeholder', !select.value);
  menu.querySelectorAll('.custom-select-option').forEach((item) => {
    const isSelected = item.dataset.value === select.value;
    item.classList.toggle('is-selected', isSelected);
    item.setAttribute('aria-selected', String(isSelected));
  });
}

function rebuildCustomSelectMenu(select) {
  const { menu } = getCustomSelectParts(select);
  if (!menu) return;
  menu.replaceChildren();
  Array.from(select.options).forEach((option) => {
    if (option.disabled) return;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'custom-select-option';
    item.dataset.value = option.value;
    item.setAttribute('role', 'option');
    item.textContent = option.textContent;
    menu.appendChild(item);
  });
}

function localizeSelectOptions() {
  aiNativeSelects.forEach((select) => {
    Array.from(select.options).forEach((option) => {
      const label = currentLanguage === 'ko' ? option.dataset.labelKo : option.dataset.labelEn;
      if (label) option.textContent = label;
    });
    rebuildCustomSelectMenu(select);
    syncCustomSelect(select);
  });
}

function openCustomSelect(select) {
  aiNativeSelects.forEach((item) => {
    if (item !== select) closeCustomSelect(item);
  });
  const { wrapper, button, menu } = getCustomSelectParts(select);
  if (!wrapper || !button || !menu) return;
  wrapper.classList.add('is-open');
  button.setAttribute('aria-expanded', 'true');
  menu.hidden = false;
}

function closeCustomSelect(select) {
  const { wrapper, button, menu } = getCustomSelectParts(select);
  if (!wrapper || !button || !menu) return;
  wrapper.classList.remove('is-open');
  button.setAttribute('aria-expanded', 'false');
  menu.hidden = true;
}

function toggleCustomSelect(select) {
  const { wrapper } = getCustomSelectParts(select);
  if (wrapper?.classList.contains('is-open')) closeCustomSelect(select);
  else openCustomSelect(select);
}

function closeAllCustomSelects() {
  aiNativeSelects.forEach(closeCustomSelect);
}

function createCoachPayload(analysis) {
  const features = analysis.moodAI?.features || {};
  const vat = {
    valence: roundMetric((analysis.brightness - 0.5) * 2),
    arousal: roundMetric((analysis.energy - 0.5) * 2),
    tension: roundMetric((analysis.tension - 0.5) * 2)
  };
  const blockFeatures = {
    pitchHeight: roundMetric(features.averagePitch || analysis.pitchLevel),
    blockLength: roundMetric(features.averageDuration || analysis.noteLength),
    rhythmDensity: roundMetric(features.rhythmicDensity || analysis.rhythmDensity),
    repetition: roundMetric(features.repetitionStrength || analysis.repetitionStrength),
    regularity: roundMetric(1 - (features.rhythmVariation || analysis.rhythmVariation || 0)),
    pitchMotion: roundMetric(features.overallChange || 0),
    harmonyStability: roundMetric(1 - Math.max(features.dissonance || 0, features.tension || analysis.tension || 0))
  };
  return {
    language: currentLanguage,
    intent: getIntentPayload(),
    vat,
    blockFeatures,
    composition: {
      title: compositionTitle,
      stepCount: STEP_COUNT,
      noteCount: features.noteCount || composition.length,
      blockCount: features.blockCount || composition.length,
      activeStepCount: features.activeStepCount || analysis.activeSteps.length,
      primaryMood: analysis.moodAI?.primaryMood || analysis.paletteKey,
      secondaryMood: analysis.moodAI?.secondaryMood || '',
      energy: roundMetric(analysis.energy),
      tension: roundMetric(analysis.tension),
      brightness: roundMetric(analysis.brightness),
      density: roundMetric(analysis.density),
      highRatio: roundMetric(analysis.highRatio),
      lowRatio: roundMetric(analysis.lowRatio),
      chordRatio: roundMetric(analysis.chordRatio),
      repetitionStrength: roundMetric(features.repetitionStrength || 0),
      longNoteRatio: roundMetric(features.longNoteRatio || 0),
      shortNoteRatio: roundMetric(features.shortNoteRatio || 0),
      rhythmVariation: roundMetric(features.rhythmVariation || 0),
      reasons: analysis.moodAI?.reasons || []
    }
  };
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getIntentLabels(intent) {
  const maps = {
    style: {
      children: { ko: '동요', en: 'Children’s music' },
      ballad: { ko: '발라드', en: 'Ballad' },
      classical: { ko: '클래식', en: 'Classical' },
      soundtrack: { ko: 'OST', en: 'Soundtrack' },
      acoustic: { ko: '어쿠스틱', en: 'Acoustic' }
    },
    direction: {
      startFresh: { ko: '새로 만들기', en: 'Start fresh' },
      reduce: { ko: '덜어내기', en: 'Reduce' },
      richer: { ko: '풍성하게', en: 'Richer' },
      rhythm: { ko: '리듬 강조', en: 'Emphasize rhythm' }
    },
    mood: {
      joy: { ko: '밝은', en: 'bright' },
      calm: { ko: '차분한', en: 'calm' },
      sadness: { ko: '느린', en: 'slow' },
      tension: { ko: '긴장감 있는', en: 'tense' },
      mystery: { ko: '몽환적인', en: 'dreamy' },
      balanced: { ko: '균형 있는', en: 'balanced' }
    }
  };
  return {
    style: localized(maps.style[intent.style]) || '',
    direction: localized(maps.direction[intent.direction]) || '',
    mood: localized(maps.mood[intent.promptMode]) || localized(maps.mood.balanced)
  };
}




function getDesiredMusicSubject(intent) {
  const prompt = String(intent?.prompt || '').toLowerCase();
  const style = String(intent?.style || '').toLowerCase();
  const source = `${prompt} ${style}`;

  const subjects = [
    { words: ['재즈', 'jazz'], ko: '재즈 음악', en: 'Jazz music' },
    { words: ['클래식', 'classical'], ko: '클래식 음악', en: 'Classical music' },
    { words: ['발라드', 'ballad'], ko: '발라드', en: 'A ballad' },
    { words: ['동요', 'children'], ko: '동요', en: 'Children’s music' },
    { words: ['ost', '사운드트랙', 'soundtrack'], ko: 'OST 음악', en: 'Soundtrack music' },
    { words: ['어쿠스틱', 'acoustic'], ko: '어쿠스틱 음악', en: 'Acoustic music' },
    { words: ['피아노', 'piano'], ko: '피아노 중심의 곡', en: 'A piano-led piece' }
  ];

  const matched = subjects.find(item => item.words.some(word => source.includes(word)));
  if (matched) return currentLanguage === 'en' ? matched.en : matched.ko;
  return currentLanguage === 'en' ? 'The music you want to make' : '만들고 싶은 곡';
}

function describeDesiredComposition(intent) {
  const targetVAT = getTargetVATForIntent(intent);
  const subject = getDesiredMusicSubject(intent);

  if (!targetVAT) {
    return currentLanguage === 'en'
      ? [`${subject} is interpreted from your own wording rather than forced into one fixed mood.`, 'Soundi therefore explains the direction through visible block placement such as height, length, spacing, and stacking.']
      : [`${subject}은 사용자가 적은 표현을 하나의 분위기로 단정하지 않고 그대로 방향으로 해석해요.`, '그래서 화면에서 확인할 수 있는 블록의 높이, 길이, 간격, 겹침을 기준으로 배치 방향을 설명해요.'];
  }

  const parts = [];
  if (currentLanguage === 'en') {
    if (targetVAT.arousal <= 0.32) parts.push(`${subject} tends to feel spacious and unhurried. On the grid, longer blocks with wider gaps usually support that flow.`);
    else if (targetVAT.arousal >= 0.65) parts.push(`${subject} tends to feel active and forward-moving. On the grid, shorter blocks placed more frequently usually make the rhythm feel more active.`);
    else parts.push(`${subject} tends to keep a moderate pace. Mixing long and short blocks without making the spacing too dense usually keeps the flow balanced.`);

    if (targetVAT.valence >= 0.68) parts.push('Placing more blocks in the middle-to-upper rows can make the melodic direction feel lighter and clearer.');
    else if (targetVAT.valence <= 0.32) parts.push('Placing more blocks in the middle-to-lower rows and extending their lengths can make the melodic direction feel more grounded and subdued.');
    else parts.push('Keeping most blocks around the middle rows without pushing too far upward or downward helps preserve the emotional center.');

    if (targetVAT.tension >= 0.62) parts.push('For stronger harmonic tension, place supporting blocks close together on the same vertical line so several notes sound at once.');
    else if (targetVAT.tension <= 0.28) parts.push('For a more open and stable harmony, use fewer blocks on the same vertical line and keep simultaneous stacks simple.');
    else parts.push('For moderate harmonic color, stack supporting blocks only at selected moments rather than throughout the whole grid.');
  } else {
    if (targetVAT.arousal <= 0.32) parts.push(`${subject}은 움직임이 크지 않고 여백이 느껴지는 흐름이 잘 어울려요. 화면에서는 긴 블록을 중심으로 두고 블록 사이 간격을 넉넉하게 배치하는 편이에요.`);
    else if (targetVAT.arousal >= 0.65) parts.push(`${subject}은 리듬이 자주 움직이며 앞으로 나아가는 흐름이 잘 어울려요. 화면에서는 짧은 블록을 비교적 자주 놓고 블록 사이 간격을 촘촘하게 배치하는 편이에요.`);
    else parts.push(`${subject}은 너무 빠르거나 느리지 않은 흐름이 잘 어울려요. 화면에서는 긴 블록과 짧은 블록을 섞되 간격이 한쪽으로 치우치지 않게 배치하는 편이에요.`);

    if (targetVAT.valence >= 0.68) parts.push('선율은 화면의 중간 · 높은 위치에 블록을 조금 더 배치하면 가볍고 맑은 방향을 만들기 쉬워요.');
    else if (targetVAT.valence <= 0.32) parts.push('선율은 화면의 중간 · 낮은 위치에 블록의 비중을 늘리고 길이를 길게 잡으면 더 가라앉은 방향을 만들기 쉬워요.');
    else parts.push('선율은 화면의 중간 위치를 중심으로 블록을 배치하고, 위아래로 지나치게 치우치지 않게 두면 분위기의 중심을 유지하기 좋아요.');

    if (targetVAT.tension >= 0.62) parts.push('화음의 긴장감을 높이고 싶다면 같은 세로선에 가까운 위치의 블록을 함께 놓아 여러 블록이 동시에 보이도록 쌓는 방식이 잘 어울려요.');
    else if (targetVAT.tension <= 0.28) parts.push('화음을 더 열려 있고 안정적으로 만들고 싶다면 같은 세로선에 겹치는 블록 수를 줄이고 단순하게 쌓는 편이 좋아요.');
    else parts.push('화음의 색을 적당히 더하고 싶다면 필요한 구간에서만 같은 세로선에 보조 블록을 추가해 부분적으로 겹쳐 배치하는 편이 좋아요.');
  }

  return parts;
}

function createCoachDiagnosis(intent, summary) {
  const currentParts = [];
  const targetVAT = getTargetVATForIntent(intent);
  const editPlan = [];
  const highLed = summary.highRatio > summary.lowRatio + 0.12;
  const lowLed = summary.lowRatio > summary.highRatio + 0.12;
  const shortLed = summary.shortNoteRatio > summary.longNoteRatio + 0.08;
  const longLed = summary.longNoteRatio > summary.shortNoteRatio + 0.08;
  const dense = summary.density > 0.48;
  const sparse = summary.density < 0.28;
  const chordLight = summary.chordRatio < 0.22;
  const repetitive = summary.repetitionStrength > 0.58;

  if (currentLanguage === 'en') {
    currentParts.push(highLed ? 'The melody is concentrated in the upper register.' : lowLed ? 'The melody is concentrated in the lower register.' : 'The pitch range is centered around the middle register.');
    currentParts.push(shortLed ? 'Short notes make the rhythm move quickly.' : longLed ? 'Long notes make the flow feel sustained.' : 'Short and long notes are used in a fairly balanced way.');
    if (dense) currentParts.push('Notes appear frequently, so the texture is relatively dense.');
    else if (sparse) currentParts.push('There is a lot of space between notes, so the texture is sparse.');
    else currentParts.push('The note density is moderate.');
  } else {
    currentParts.push(highLed ? '현재 곡은 높은 음역의 비중이 커서 선율이 위쪽에 집중되어 있어요.' : lowLed ? '현재 곡은 낮은 음역의 비중이 커서 선율이 아래쪽에 집중되어 있어요.' : '현재 곡은 중간 음역을 중심으로 높낮이가 비교적 고르게 분포되어 있어요.');
    currentParts.push(shortLed ? '짧은 음의 비율이 높아 리듬이 빠르게 움직이는 편이에요.' : longLed ? '긴 음의 비율이 높아 한 음이 오래 이어지는 흐름이에요.' : '짧은 음과 긴 음의 비율이 비교적 균형을 이루고 있어요.');
    if (dense) currentParts.push('블록이 촘촘하게 배치되어 음의 밀도가 높은 편이에요.');
    else if (sparse) currentParts.push('블록 사이의 여백이 많아 음의 밀도가 낮은 편이에요.');
    else currentParts.push('블록의 밀도는 중간 정도예요.');
  }

  const addPlan = (ko, en) => editPlan.push(currentLanguage === 'en' ? en : ko);

  if (intent.direction === 'reduce') {
    addPlan('겹치거나 반복되는 블록 덜어내기', 'Remove some repeated or overlapping blocks to create more space.');
    addPlan('보조적으로 반복되는 음부터 줄이기', 'Keep the main melodic line and reduce secondary repetitions first.');
  } else if (intent.direction === 'rhythm') {
    addPlan('짧은 음을 일정한 간격으로 추가하기', 'Add short notes at regular intervals to make the beat clearer.');
    addPlan('긴 음 사이에 짧은 음 배치하기', 'Place short notes between longer notes to create rhythmic contrast.');
  } else if (intent.direction === 'richer') {
    addPlan('같은 시점에 보조음을 더해 화음 쌓기', 'Keep the main line and add supporting notes at the same moments to build harmonic layers.');
    if (chordLight) addPlan('일부 구간에 3화음이나 보조음 추가하기', 'Because simultaneous notes are limited, add triads or supporting tones in selected sections.');
  } else if (intent.direction === 'startFresh') {
    addPlan('원하는 분위기의 짧은 기본 프레이즈부터 새로 만들기', 'Instead of editing the current blocks, start with a short phrase that matches the intended mood.');
  }

  if (!intent.direction || intent.direction === 'startFresh') {
    if (intent.promptMode === 'joy') {
      if (!highLed) addPlan('중간 · 높은 위치의 블록 늘리기', 'Add more mid-to-high notes to move the melodic center upward.');
      if (!shortLed) addPlan('긴 블록 일부를 짧은 블록으로 나누기', 'Split some longer notes into shorter notes to increase motion.');
      if (sparse) addPlan('빈 칸에 짧은 블록 추가하기', 'Add short notes in empty beats to slightly increase rhythmic density.');
    } else if (intent.promptMode === 'calm') {
      if (highLed) addPlan('위쪽 블록 일부를 중간 · 낮은 위치로 내리기', 'Move some high notes into the mid-to-low register to reduce brightness.');
      if (shortLed) addPlan('짧은 블록 일부를 길게 이어주기', 'Connect some short notes into longer sustained phrases.');
      if (dense) addPlan('연속된 블록을 덜어내 음 사이 여백 만들기', 'Remove some consecutive blocks to create more space between notes.');
    } else if (intent.promptMode === 'sadness') {
      if (!lowLed) addPlan('중간 · 낮은 위치의 블록 늘리기', 'Increase the lower register so the melodic center moves downward.');
      if (!longLed) addPlan('블록 길이를 늘려 지속되는 흐름 만들기', 'Lengthen notes to favor sustained motion over quick movement.');
      addPlan('반복되는 핵심 음을 남겨 중심 만들기', 'Keep a repeated anchor note to give the melody a consistent center.');
    } else if (intent.promptMode === 'tension') {
      addPlan('같은 세로선에 가까운 위치의 보조 블록 추가하기', 'Add nearby supporting tones around existing harmony to increase tension.');
      if (repetitive) addPlan('반복 간격 일부 어긋나게 만들기', 'Offset some repeated intervals to make the pattern less predictable.');
      else addPlan('짧은 음을 불규칙한 위치에 배치하기', 'Place short notes at irregular positions to reduce rhythmic stability.');
    } else if (intent.promptMode === 'mystery') {
      addPlan('중간 위치 사이에 위쪽 블록을 드문 간격으로 추가하기', 'Keep the middle register and add occasional high notes for register contrast.');
      addPlan('일부 음만 남겨 느슨한 반복 만들기', 'Use partial rather than exact repetition to create a looser recurring pattern.');
    } else if (intent.promptMode === 'unknown') {
      addPlan('현재 곡의 음역·리듬·밀도를 중심으로 정리하기', 'The emotional direction is not clearly classified, so the edit plan focuses on the current musical structure.');
    } else {
      addPlan('현재 음역을 유지하며 리듬과 화음 배치 정리하기', 'Keep the current register while refining rhythm spacing and chord placement for balance.');
    }
  }

  if (targetVAT && editPlan.length < 3) {
    const candidates = [];
    if (targetVAT.arousal >= summary.energy + 0.15) {
      candidates.push([ '짧은 블록을 늘리고 블록 사이 간격 좁히기', 'Use more short notes and tighter spacing to increase movement.' ]);
    } else if (targetVAT.arousal <= summary.energy - 0.15) {
      candidates.push([ '일부 블록을 길게 이어주고 블록 사이 여백 늘리기', 'Lengthen some notes and add more space between blocks to reduce movement.' ]);
    }
    if (targetVAT.tension >= summary.tension + 0.15) {
      candidates.push([ '가까운 음정의 보조음 더하기', 'Add nearby supporting tones to increase harmonic tension.' ]);
    } else if (targetVAT.tension <= summary.tension - 0.15) {
      candidates.push([ '같은 세로선에 쌓이는 블록 수 줄이기', 'Simplify simultaneous notes to reduce harmonic friction and tension.' ]);
    }
    candidates.forEach(([ko, en]) => {
      if (editPlan.length < 3) addPlan(ko, en);
    });
  }
  const gapAnalysis = describeDesiredComposition(intent);

  return {
    currentState: currentParts.join(' '),
    gapAnalysis,
    editPlan: editPlan.slice(0, 3),
    editSummary: currentLanguage === 'en'
      ? 'These edits will be converted into concrete block additions and removals. Review the plan, then apply it.'
      : '위 방향을 실제 블록의 추가·삭제 위치로 변환해 두었어요. 내용을 확인한 뒤 수정하기를 누르면 적용돼요.'
  };
}

function describeCoachGap(intent, summary, language = 'ko') {
  const highLed = summary.highRatio > summary.lowRatio + 0.12;
  const lowLed = summary.lowRatio > summary.highRatio + 0.12;
  const shortLed = summary.shortNoteRatio > summary.longNoteRatio + 0.08;
  const longLed = summary.longNoteRatio > summary.shortNoteRatio + 0.08;
  const dense = summary.density > 0.48;
  const sparse = summary.density < 0.28;
  let ko = '음역과 리듬';
  let en = 'pitch range and rhythm';

  if (intent.direction === 'reduce') {
    ko = dense ? '블록 밀도와 반복량' : '반복되는 블록의 양';
    en = dense ? 'block density and repetition' : 'the amount of repeated material';
  } else if (intent.direction === 'richer') {
    ko = summary.chordRatio < 0.22 ? '동시에 쌓이는 음과 화음의 밀도' : '보조음의 배치';
    en = summary.chordRatio < 0.22 ? 'simultaneous notes and harmonic density' : 'the placement of supporting tones';
  } else if (intent.direction === 'rhythm') {
    ko = '음의 길이와 박 사이의 간격';
    en = 'note length and spacing between beats';
  } else if (intent.promptMode === 'joy') {
    ko = lowLed || longLed || sparse ? '음역의 높이, 음의 길이, 리듬 밀도' : '리듬의 추진력';
    en = lowLed || longLed || sparse ? 'register height, note length, and rhythmic density' : 'rhythmic drive';
  } else if (intent.promptMode === 'calm') {
    ko = highLed || shortLed || dense ? '높은 음의 비율, 짧은 음의 양, 블록 밀도' : '음 사이의 여백';
    en = highLed || shortLed || dense ? 'the amount of high notes, short notes, and block density' : 'space between notes';
  } else if (intent.promptMode === 'sadness') {
    ko = !lowLed || !longLed ? '낮은 음역의 비중과 음의 지속시간' : '선율의 반복 중심';
    en = !lowLed || !longLed ? 'lower-register weight and note duration' : 'the repeated melodic anchor';
  } else if (intent.promptMode === 'tension') {
    ko = '화음의 긴장도와 리듬의 규칙성';
    en = 'harmonic tension and rhythmic regularity';
  } else if (intent.promptMode === 'mystery') {
    ko = '음역 대비와 반복 패턴의 규칙성';
    en = 'register contrast and repetition regularity';
  }
  return language === 'en' ? en : ko;
}

function createLocalCoachFeedback(payload) {
  const { intent, composition: summary } = payload;
  const effectiveIntent = getEffectiveIntent(intent);
  const diagnosis = createCoachDiagnosis(effectiveIntent, summary);
  const operations = createLocalEditOperations(effectiveIntent, summary);

  return {
    source: 'local',
    summary: diagnosis.currentState,
    gapAnalysis: diagnosis.gapAnalysis,
    editPlan: diagnosis.editPlan,
    editSummary: diagnosis.editSummary,
    operations,
    visualDirection: {
      shape: summary.tension > 0.45 ? '조금 날카로운 유기적 형태' : '둥글게 흔들리는 유기적 형태',
      color: getVisualColorSuggestion(effectiveIntent, summary),
      motion: summary.energy > 0.55 ? '빠르게 튀는 움직임' : '천천히 번지는 움직임'
    }
  };
}


function inferTargetVAT(prompt) {
  const text = String(prompt || '').toLowerCase().trim();
  if (!text) return null;

  const groups = [
    { name: 'calm', words: ['고즈넉', '고요', '잔잔', '차분', '평온', '편안', '포근', '정적', 'serene', 'peaceful', 'quiet', 'calm', 'soft'], vat: { valence: 0.65, arousal: 0.20, tension: 0.15 } },
    { name: 'joy', words: ['밝', '경쾌', '신나', '즐거', '활기', '설레', '상쾌', 'happy', 'joy', 'bright', 'cheerful', 'upbeat'], vat: { valence: 0.85, arousal: 0.75, tension: 0.20 } },
    { name: 'sadness', words: ['슬프', '쓸쓸', '외롭', '우울', '애잔', '허전', 'sad', 'lonely', 'melancholy'], vat: { valence: 0.20, arousal: 0.25, tension: 0.20 } },
    { name: 'tension', words: ['불안', '긴장', '초조', '위태', '긴박', '날카', '불길', 'anxious', 'tense', 'urgent', 'uneasy'], vat: { valence: 0.20, arousal: 0.75, tension: 0.85 } },
    { name: 'mystery', words: ['몽환', '신비', '미스터리', '오묘', '낯선', 'dreamy', 'mysterious', 'ethereal'], vat: { valence: 0.50, arousal: 0.35, tension: 0.50 } },
    { name: 'warm', words: ['따뜻', '다정', '포근', 'warm', 'gentle'], vat: { valence: 0.80, arousal: 0.30, tension: 0.12 } },
    { name: 'excitement', words: ['벅찬', '벅차', '웅장', '고조', '감격', 'emotional', 'uplifting', 'epic'], vat: { valence: 0.78, arousal: 0.72, tension: 0.45 } }
  ];

  const matched = groups.filter(group => group.words.some(word => text.includes(word)));
  if (!matched.length) return null;
  const average = key => Math.max(0, Math.min(1, matched.reduce((sum, group) => sum + group.vat[key], 0) / matched.length));
  return {
    valence: average('valence'),
    arousal: average('arousal'),
    tension: average('tension'),
    matched: matched.map(group => group.name)
  };
}

function getTargetVATForIntent(intent) {
  if (intent?.targetVAT) return intent.targetVAT;
  const fallbacks = {
    joy: { valence: 0.85, arousal: 0.75, tension: 0.20 },
    calm: { valence: 0.65, arousal: 0.20, tension: 0.15 },
    sadness: { valence: 0.20, arousal: 0.25, tension: 0.20 },
    tension: { valence: 0.20, arousal: 0.75, tension: 0.85 },
    mystery: { valence: 0.50, arousal: 0.35, tension: 0.50 }
  };
  return fallbacks[intent?.promptMode] || null;
}

function getEffectiveIntent(intent) {
  const prompt = (intent.prompt || '').toLowerCase();
  const includesAny = (words) => words.some((word) => prompt.includes(word));
  const next = {
    ...intent,
    style: intent.style || '',
    direction: intent.direction || '',
    promptMode: 'balanced'
  };

  if (next.style === 'children') next.promptMode = 'joy';
  if (next.style === 'ballad' || next.style === 'acoustic') next.promptMode = 'calm';
  if (next.style === 'soundtrack') next.promptMode = 'mystery';

  if (includesAny(['조용', '차분', '잔잔', '고요', '고즈넉', '평온', '편안', '포근', '정적', '비', 'rain', 'quiet', 'calm', 'soft', 'peaceful', 'serene'])) next.promptMode = 'calm';
  if (includesAny(['잠', '수면', '밤', 'sleep', 'night'])) next.promptMode = 'calm';
  if (includesAny(['슬픈', '슬픔', '외로운', '우울', 'sad', 'lonely', 'blue'])) next.promptMode = 'sadness';
  if (includesAny(['긴장', '불안', '무서', '공포', '위험', 'tension', 'scary', 'dark'])) next.promptMode = 'tension';
  if (includesAny(['몽환', '신비', '우주', '꿈', 'mystery', 'dream', 'space'])) next.promptMode = 'mystery';
  if (includesAny(['신나는', '밝은', '기쁜', '활기', '빠른', '통통', 'dance', 'happy', 'bright', 'fast'])) next.promptMode = 'joy';

  next.targetVAT = inferTargetVAT(prompt);
  if (!next.targetVAT && !next.promptMode) next.promptMode = 'unknown';
  return next;
}

function createLocalEditOperations(intent, summary) {
  if (isExampleMode) return [];
  if (!composition.length || intent.direction === 'startFresh') return createSeedOperations(intent);
  const operations = [];
  const occupied = new Set(composition.map((item) => getGridCellKey(item.noteId, item.step)));
  const activeSteps = [...new Set(composition.map((item) => item.step))].sort((a, b) => a - b);
  const add = (noteId, step, length = 1) => {
    for (let offset = 0; offset < length; offset += 1) {
      const nextStep = step + offset;
      const key = getGridCellKey(noteId, nextStep);
      if (nextStep < 0 || nextStep >= STEP_COUNT || occupied.has(key)) continue;
      occupied.add(key);
      operations.push({ type: 'add', noteId, step: nextStep });
    }
  };
  const remove = (item) => {
    if (!item) return;
    operations.push({ type: 'remove', noteId: item.noteId, step: item.step });
    occupied.delete(getGridCellKey(item.noteId, item.step));
  };
  const fallbackStep = activeSteps[0] ?? 0;

  if (intent.direction === 'reduce') {
    composition
      .slice()
      .sort((a, b) => b.step - a.step)
      .filter((_, index) => index % 2 === 0)
      .slice(0, 8)
      .forEach(remove);
    return operations.slice(0, 18);
  }

  if (intent.direction === 'rhythm') {
    [0, 4, 8, 12].forEach((offset) => add('do4', Math.min(STEP_COUNT - 1, fallbackStep + offset), 1));
    [2, 10].forEach((offset) => add(intent.promptMode === 'joy' ? 'sol4' : 'mi4', Math.min(STEP_COUNT - 1, fallbackStep + offset), 1));
    return operations.slice(0, 18);
  }

  if (intent.direction === 'richer') {
    add('do4', Math.max(0, fallbackStep), 3);
    add(intent.promptMode === 'sadness' ? 'la3' : 'mi4', Math.min(STEP_COUNT - 4, fallbackStep + 6), 4);
    add(intent.promptMode === 'tension' ? 'si4' : 'sol4', Math.min(STEP_COUNT - 3, fallbackStep + 12), 3);
    if (summary.chordRatio < 0.25) add(intent.promptMode === 'joy' ? 'do5' : 'mi5', Math.min(STEP_COUNT - 2, fallbackStep + 16), 2);
    return operations.slice(0, 18);
  }

  if (intent.promptMode === 'calm' || intent.promptMode === 'sadness') {
    add(intent.promptMode === 'sadness' ? 'la3' : 'do4', Math.max(0, fallbackStep), 3);
    add(intent.promptMode === 'sadness' ? 'mi3' : 'sol3', Math.min(STEP_COUNT - 4, fallbackStep + 8), 4);
  } else if (intent.promptMode === 'tension') {
    activeSteps.slice(0, 3).forEach((step) => add('si4', step + 1, 1));
    add('fa5', Math.min(STEP_COUNT - 1, fallbackStep + 6), 1);
  } else if (intent.promptMode === 'mystery') {
    add('la4', Math.min(STEP_COUNT - 2, fallbackStep + 2), 2);
    add('si4', Math.min(STEP_COUNT - 1, fallbackStep + 7), 1);
    if (summary.repetitionStrength < 0.45) add('mi5', Math.min(STEP_COUNT - 2, fallbackStep + 12), 2);
  } else {
    add('do5', Math.min(STEP_COUNT - 1, fallbackStep + 2), 1);
    add('mi5', Math.min(STEP_COUNT - 1, fallbackStep + 4), 1);
    add('sol5', Math.min(STEP_COUNT - 1, fallbackStep + 6), 1);
  }
  return operations.slice(0, 18);
}

function createSeedOperations(intent) {
  const moodSeeds = {
    calm: [['do4', 0, 4], ['mi4', 6, 4], ['sol4', 12, 5], ['do4', 20, 6]],
    sadness: [['la3', 0, 5], ['do4', 7, 4], ['mi4', 14, 5], ['la3', 24, 6]],
    mystery: [['mi4', 0, 3], ['la4', 5, 4], ['si4', 12, 2], ['mi5', 20, 4]],
    tension: [['fa4', 0, 2], ['si4', 3, 1], ['mi5', 6, 2], ['fa5', 12, 1]],
    joy: [['do4', 0, 1], ['mi4', 2, 1], ['sol4', 4, 1], ['do5', 8, 2], ['sol4', 12, 1]],
    balanced: [['do4', 0, 2], ['mi4', 4, 2], ['sol4', 8, 3], ['mi4', 14, 2], ['do4', 20, 4]]
  };
  const styleSeeds = {
    children: moodSeeds.joy,
    ballad: moodSeeds.calm,
    classical: moodSeeds.balanced,
    soundtrack: moodSeeds.mystery,
    acoustic: moodSeeds.calm
  };
  const seed = styleSeeds[intent.style] || moodSeeds[intent.promptMode] || moodSeeds.balanced;
  return seed.flatMap(([noteId, step, length]) => Array.from({ length }, (_, offset) => ({
    type: 'add',
    noteId,
    step: step + offset
  }))).slice(0, 18);
}

function getEditSummary(operations, intent) {
  if (!operations.length) return '';
  const labels = getIntentLabels(intent);
  const mood = labels.mood;
  if (currentLanguage === 'en') {
    if (intent.direction === 'reduce') return `Leave more space so the ${mood} mood reads more clearly.`;
    if (intent.direction === 'rhythm') return `Place short notes at regular intervals so the rhythm feels more intentional.`;
    if (intent.direction === 'richer') return `Layer a few supporting notes around the main line so the ${mood} mood feels fuller.`;
    if (intent.direction === 'startFresh') return `Start with a simple ${mood} phrase, then extend it after the shape feels clear.`;
    return `Adjust the pitch range and rhythm spacing so the ${mood} intention is easier to read.`;
  }
  if (intent.direction === 'reduce') return `여백을 더 남기면 ${mood} 분위기가 더 또렷하게 읽혀요.`;
  if (intent.direction === 'rhythm') return `짧은 음을 일정한 간격으로 놓으면 리듬 의도가 더 분명해져요.`;
  if (intent.direction === 'richer') return `중심 선율 주변에 받쳐주는 음을 더하면 ${mood} 분위기가 더 풍성해져요.`;
  if (intent.direction === 'startFresh') return `먼저 단순한 ${mood} 흐름을 만들고, 형태가 보이면 길이를 늘려보세요.`;
  return `음높이 범위와 리듬 간격을 조정하면 ${mood} 의도가 더 잘 보여요.`;
}

function getLocalStructureLine(summary) {
  if (currentLanguage === 'en') {
    if (summary.repetitionStrength > 0.58) return 'Repeated patterns hold the structure.';
    if (summary.rhythmVariation > 0.52) return 'The flow changes often.';
    if (summary.longNoteRatio > summary.shortNoteRatio) return 'Long notes connect the phrase smoothly.';
    return 'Short notes and space alternate.';
  }
  if (summary.repetitionStrength > 0.58) return '반복이 구조를 잡아요.';
  if (summary.rhythmVariation > 0.52) return '흐름 변화가 커요.';
  if (summary.longNoteRatio > summary.shortNoteRatio) return '긴 음이 부드럽게 이어져요.';
  return '짧은 음과 여백이 번갈아 나와요.';
}

function getVisualColorSuggestion(intent, summary) {
  if (currentLanguage === 'en') {
    if (intent.promptMode === 'joy') return summary.brightness > 0.55 ? 'yellow and orange' : 'yellow and light blue';
    if (intent.promptMode === 'calm') return 'light blue and white';
    if (intent.promptMode === 'mystery') return 'purple and blue';
    if (intent.promptMode === 'tension') return 'purple and red';
    if (intent.promptMode === 'sadness') return 'deep blue and gray';
    return 'warm yellow and soft white';
  }
  if (intent.promptMode === 'joy') return summary.brightness > 0.55 ? '노랑과 주황' : '노랑과 연한 파랑';
  if (intent.promptMode === 'calm') return '연한 파랑과 흰색';
  if (intent.promptMode === 'mystery') return '보라와 푸른색';
  if (intent.promptMode === 'tension') return '보라와 붉은색';
  if (intent.promptMode === 'sadness') return '짙은 파랑과 회색';
  return '따뜻한 노랑과 부드러운 흰색';
}

function renderAICoachResult() {
  if (!aiCoachResult) return;
  if (aiCoachSource) aiCoachSource.textContent = aiCoachFeedback?.source === 'llm' ? 'llm' : 'local';
  if (aiAnalyzeButton) aiAnalyzeButton.disabled = aiCoachStatus === 'loading' || aiAnalyzeLockedUntilEdit;
  if (aiCoachStatus === 'loading') {
    aiCoachResult.innerHTML = `<p class="ai-coach-muted">${currentLanguage === 'ko' ? '현재 곡과 작곡 의도를 비교하고 있어요...' : 'Comparing your composition with your intent...'}</p>`;
    return;
  }
  if (!aiCoachFeedback) {
    aiCoachResult.innerHTML = '';
    return;
  }
  const feedback = aiCoachFeedback;
  const hasOperations = Array.isArray(feedback.operations) && feedback.operations.length > 0 && !feedback.applied;
  const editItems = Array.isArray(feedback.editPlan)
    ? feedback.editPlan.filter(Boolean)
    : feedback.editPlan
      ? [feedback.editPlan]
      : [];
  aiCoachResult.innerHTML = `
    <section class="ai-coach-section">
      <span class="ai-coach-section-label">${currentLanguage === 'ko' ? '현재 곡' : 'Current composition'}</span>
      <p>${escapeHtml(feedback.summary || '')}</p>
    </section>
    ${feedback.gapAnalysis ? `
      <section class="ai-coach-section">
        <span class="ai-coach-section-label">${currentLanguage === 'ko' ? '분위기 비교' : 'Mood comparison'}</span>
        <div class="ai-coach-comparison">
          ${(Array.isArray(feedback.gapAnalysis) ? feedback.gapAnalysis : [feedback.gapAnalysis])
            .filter(Boolean)
            .map((item) => `<p>${escapeHtml(item)}</p>`)
            .join('')}
        </div>
      </section>
    ` : ''}
    <section class="ai-coach-section">
      <span class="ai-coach-section-label">${currentLanguage === 'ko' ? '수정 방향' : 'Edit direction'}</span>
      ${editItems.length ? `
        <ol class="ai-coach-plan">
          ${editItems.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ol>
      ` : `<p>${currentLanguage === 'ko' ? '현재 곡을 바탕으로 수정 방향을 정리하고 있어요.' : 'Preparing edit directions from the current composition.'}</p>`}
    </section>
    ${feedback.operations?.length ? `
      <div class="ai-edit-proposal">
        <button type="button" data-ai-action="apply-edits"${hasOperations ? '' : ' disabled'}>${feedback.applied ? (currentLanguage === 'ko' ? '수정 완료' : 'Applied') : (currentLanguage === 'ko' ? '수정하기' : 'Apply changes')}</button>
      </div>
    ` : ''}
  `;
}

function applyAICoachOperations() {
  if (!aiCoachFeedback?.operations?.length || aiCoachFeedback.applied || isExampleMode) return;
  const operations = sanitizeAIOperations(aiCoachFeedback.operations);
  if (!operations.length) return;
  if (isPlaying) stopPlayback();
  pushUndoState();
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  operations.forEach((operation) => {
    applyCellState(operation.noteId, operation.step, operation.type !== 'remove');
  });
  sortComposition();
  aiCoachFeedback = {
    ...aiCoachFeedback,
    applied: true
  };
  render();
  renderAICoachResult();
}

function sanitizeAIOperations(operations) {
  const safe = [];
  const seen = new Set();
  operations.slice(0, 24).forEach((operation) => {
    const type = operation.type === 'remove' ? 'remove' : 'add';
    const noteId = String(operation.noteId || '');
    const step = Number(operation.step);
    if (!notes.some((note) => note.id === noteId)) return;
    if (!Number.isInteger(step) || step < 0 || step >= STEP_COUNT) return;
    const key = `${type}:${noteId}:${step}`;
    if (seen.has(key)) return;
    seen.add(key);
    safe.push({ type, noteId, step });
  });
  return safe;
}

function setAnalysisTab(tabName) {
  const nextTab = isExampleMode || !analysisTabNames.includes(tabName) ? 'visual' : tabName;
  analysisTabs.forEach((button) => {
    const isActive = button.dataset.analysisTab === nextTab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  analysisPages.forEach((page) => {
    const isActive = page.id === (nextTab === 'coach' ? 'aiCoachPanel' : 'visualFeedbackPanel');
    page.classList.toggle('is-active', isActive);
    page.hidden = !isActive;
  });
  persistSessionState({ analysisTab: nextTab });
}

async function analyzeWithAICoach() {
  if (aiAnalyzeLockedUntilEdit) return;
  if (!validateAICoachForm(true)) {
    aiCoachStatus = 'idle';
    aiCoachFeedback = null;
    renderAICoachResult();
    return;
  }
  if (aiFormMessage) aiFormMessage.textContent = '';
  const analysis = analyzeComposition();
  const payload = createCoachPayload(analysis);
  aiCoachStatus = 'loading';
  aiCoachFeedback = null;
  renderAICoachResult();
  const localFeedback = createLocalCoachFeedback(payload);
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('AI server unavailable');
    const data = await response.json();
    const llmFeedback = data.feedback || {};
    aiCoachFeedback = {
      ...localFeedback,
      summary: llmFeedback.summary || localFeedback.summary,
      gapAnalysis: llmFeedback.gapAnalysis || localFeedback.gapAnalysis,
      source: 'llm'
    };
  } catch (error) {
    aiCoachFeedback = localFeedback;
  }
  aiCoachStatus = 'ready';
  aiAnalyzeLockedUntilEdit = true;
  renderAICoachResult();
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
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.setValueAtTime(volumeLevel, audioContext.currentTime);
    masterGainNode.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

function syncMasterVolume() {
  if (!masterGainNode || !audioContext) return;
  masterGainNode.gain.cancelScheduledValues(audioContext.currentTime);
  masterGainNode.gain.setTargetAtTime(isMuted ? 0 : volumeLevel, audioContext.currentTime, 0.012);
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
  filter.connect(master).connect(masterGainNode);

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

function playLessonNote(button) {
  const note = notes.find((item) => item.id === button.dataset.lessonNote);
  if (!note) return;
  button.classList.remove('is-playing');
  void button.offsetWidth;
  button.classList.add('is-playing');
  playPianoLikeNote(note, 1);
}

function renderLessonRhythmGrid() {
  if (!lessonRhythmGrid) return;
  lessonRhythmGrid.innerHTML = '';
  lessonRhythmRows.forEach((row) => {
    const beatCount = row.beatCount;
    const rowElement = document.createElement('div');
    rowElement.className = 'lesson-rhythm-row';
    rowElement.dataset.rhythmRow = row.id;
    rowElement.style.setProperty('--lesson-beat-count', String(beatCount));

    const button = document.createElement('button');
    button.className = 'lesson-rhythm-play';
    button.type = 'button';
    button.dataset.rhythmPlay = row.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', localized(row.label));
    button.innerHTML = '<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.8C9 6.9 10 6.35 10.78 6.83L17.42 10.94C18.14 11.39 18.14 12.61 17.42 13.06L10.78 17.17C10 17.65 9 17.1 9 16.2V7.8Z"></path></svg><span class="wave-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

    const track = document.createElement('div');
    track.className = 'lesson-rhythm-track';
    const playhead = document.createElement('span');
    playhead.className = 'lesson-rhythm-head';

    const blockLayer = document.createElement('div');
    blockLayer.className = 'lesson-rhythm-blocks';
    row.blocks.forEach((block) => {
      const item = document.createElement('span');
      item.dataset.beatStart = String(block.start);
      item.dataset.beatEnd = String(block.start + block.length);
      item.style.gridColumn = `${block.start} / span ${block.length}`;
      blockLayer.appendChild(item);
    });

    track.append(playhead, blockLayer);
    rowElement.append(button, track);
    lessonRhythmGrid.append(rowElement);
  });
}

function stopLessonRhythmDemo() {
  if (lessonRhythmTimer) window.clearTimeout(lessonRhythmTimer);
  lessonRhythmTimer = null;
  lessonRhythmGrid?.querySelectorAll('.lesson-rhythm-row').forEach((row) => row.classList.remove('is-playing'));
  lessonRhythmGrid?.querySelectorAll('.lesson-rhythm-play').forEach((button) => {
    button.classList.remove('is-playing', 'is-sounding');
    button.setAttribute('aria-pressed', 'false');
  });
  lessonRhythmGrid?.querySelectorAll('.lesson-rhythm-blocks span').forEach((block) => {
    block.classList.remove('is-active');
  });
}

function startLessonRhythmDemo(rowId) {
  if (!lessonRhythmGrid) return;
  const row = lessonRhythmRows.find((item) => item.id === rowId);
  const rowElement = lessonRhythmGrid.querySelector(`[data-rhythm-row="${rowId}"]`);
  const playButton = lessonRhythmGrid.querySelector(`[data-rhythm-play="${rowId}"]`);
  if (!row || !rowElement || !playButton) return;
  stopLessonRhythmDemo();
  const beatCount = row.beatCount;
  const beatDuration = getStepIntervalSeconds() * 1000;
  let beat = 1;
  rowElement.style.setProperty('--lesson-play-duration', `${beatCount * beatDuration}ms`);
  rowElement.classList.add('is-playing');
  playButton.classList.add('is-playing');
  playButton.setAttribute('aria-pressed', 'true');

  function tick() {
    rowElement.querySelectorAll('.lesson-rhythm-blocks span').forEach((block) => {
      const isActive = beat >= Number(block.dataset.beatStart) && beat < Number(block.dataset.beatEnd);
      block.classList.toggle('is-active', isActive);
      if (isActive) playButton.classList.add('is-sounding');
      if (beat === Number(block.dataset.beatStart)) {
        const note = notes.find((item) => item.id === row.noteId);
        if (note) playPianoLikeNote(note, Number(block.dataset.beatEnd) - Number(block.dataset.beatStart));
      }
    });
    if (!rowElement.querySelector('.lesson-rhythm-blocks span.is-active')) {
      playButton.classList.remove('is-sounding');
    }
    beat += 1;
    if (beat <= beatCount) {
      lessonRhythmTimer = window.setTimeout(tick, beatDuration);
      return;
    }
    lessonRhythmTimer = window.setTimeout(stopLessonRhythmDemo, beatDuration);
  }

  tick();
}

function toggleLessonRhythmDemo(rowId) {
  const playButton = lessonRhythmGrid?.querySelector(`[data-rhythm-play="${rowId}"]`);
  if (playButton?.classList.contains('is-playing')) {
    stopLessonRhythmDemo();
    return;
  }
  startLessonRhythmDemo(rowId);
}

function renderLessonMood() {
  if (!lessonMoodOrb || !lessonMoodText) return;
  const state = lessonMoodStates[lessonMoodIndex % lessonMoodStates.length];
  const moodTargets = [lessonView, siteHeader].filter(Boolean);
  moodTargets.forEach((target) => {
    target.style.setProperty('--mood-a', state.colors[0]);
    target.style.setProperty('--mood-b', state.colors[1]);
    target.style.setProperty('--mood-c', state.colors[2]);
  });
  lessonMoodOrb.className = `feedback-orb ${state.className}`;
  lessonMoodText.textContent = localized(state.text);
  lessonMoodText.classList.remove('is-visible');
  window.setTimeout(() => lessonMoodText.classList.add('is-visible'), 30);
}

function startLessonMoodLoop() {
  if (lessonMoodTimer) window.clearInterval(lessonMoodTimer);
  renderLessonMood();
  lessonMoodTimer = window.setInterval(() => {
    let nextIndex = Math.floor(Math.random() * lessonMoodStates.length);
    if (nextIndex === lessonMoodIndex) nextIndex = (nextIndex + 1) % lessonMoodStates.length;
    lessonMoodIndex = nextIndex;
    renderLessonMood();
  }, 4600);
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
  window.clearTimeout(visualCaptionTimer);
  const phrases = getMoodPhrases(analysis);
  captionIndex = 0;
  const showPhrase = () => {
    const activeCaptionText = phrases[captionIndex % phrases.length];
    const activeCaptionLines = activeCaptionText
      .split(/(?<=[.!?。])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);
    visualCaption.replaceChildren();
    activeCaptionLines.forEach((line) => {
      const span = document.createElement('span');
      span.className = 'visual-caption-line';
      span.textContent = line;
      visualCaption.appendChild(span);
    });
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
  window.clearTimeout(visualCaptionTimer);
  if (visualCaption) {
    visualCaption.classList.remove('is-visible');
    visualCaption.textContent = '';
  }
  lastVisualCaptionText = '';
}

function renderLocalMoodCaption(analysis) {
  if (!visualCaption || isPlaying) return;
  const nextText = getConciseFeedbackSentence(analysis);
  window.clearTimeout(visualCaptionTimer);
  visualCaptionTimer = window.setTimeout(() => {
    if (isPlaying || nextText === lastVisualCaptionText) return;

    const captionLines = nextText
      .split(/(?<=[.!?。])\s+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);

    visualCaption.replaceChildren();
    captionLines.forEach((line) => {
      const span = document.createElement('span');
      span.className = 'visual-caption-line';
      span.textContent = line;
      visualCaption.appendChild(span);
    });

    visualCaption.classList.remove('is-visible');
    window.requestAnimationFrame(() => {
      visualCaption.classList.add('is-visible');
    });
    lastVisualCaptionText = nextText;
  }, 300);
}

function getMoodPhrases(analysis) {
  return [getConciseFeedbackSentence(analysis)];
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

function saveComposition(cover = draftCover) {
  if (!composition.length) {
    flashControl(saveButton);
    return;
  }
  const maxStep = Math.max(...composition.map((item) => item.step), 31);
  const savedAt = Date.now();
  const snapshot = {
    id: `archive-${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
    title: getCurrentTitle(),
    createdAt: savedAt,
    updatedAt: savedAt,
    stepCount: maxStep + 1,
    cover: normalizeCover(cover),
    composition: composition.map((item) => ({ ...item }))
  };
  archiveItems.unshift(snapshot);
  editingArchiveId = null;
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
      <div class="archive-cd ${getArchiveCoverClass(item)}" style="${getArchiveCoverStyle(item)}" aria-hidden="true">
        ${renderArchiveRecordContent(item)}
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

function normalizeCover(cover = {}) {
  const type = ['block', 'color', 'image'].includes(cover.type) ? cover.type : 'block';
  return {
    type,
    color: getSafeCoverColor(cover.color || '#ffdc21'),
    image: type === 'image' ? String(cover.image || '') : ''
  };
}

function getSafeCoverColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) || /^#[0-9a-f]{3}$/i.test(color) ? color : '#ffdc21';
}

function getArchiveCoverClass(item) {
  const cover = normalizeCover(item.cover);
  if (cover.type === 'color') return 'cover-solid';
  if (cover.type === 'image' && cover.image) return 'cover-image';
  return '';
}

function getArchiveCoverStyle(item) {
  const cover = normalizeCover(item.cover);
  if (cover.type === 'color') return `--cover-color:${cover.color}`;
  if (cover.type === 'image' && cover.image) return `background-image:linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12)),url(${cover.image})`;
  return '';
}

function openCoverModal() {
  if (!composition.length) {
    flashControl(saveButton);
    return;
  }
  if (isPlaying) stopPlayback();
  const existingCover = editingArchiveId ? archiveItems.find((item) => item.id === editingArchiveId)?.cover : null;
  draftCover = normalizeCover(existingCover || draftCover || { type: 'block' });
  if (coverTitleInput) coverTitleInput.value = getCurrentTitle();
  updateCoverChoiceUI();
  renderCoverPreview();
  coverModal.hidden = false;
  requestAnimationFrame(() => coverTitleInput?.focus());
}

function closeCoverModal() {
  if (!coverModal) return;
  coverModal.hidden = true;
}

function setDraftCoverFromButton(button) {
  const type = button.dataset.coverType || 'block';
  if (type === 'image') {
    coverImageInput?.click();
    return;
  }
  draftCover = normalizeCover({
    ...draftCover,
    type,
    color: button.dataset.coverColor || draftCover.color,
    image: type === 'image' ? draftCover.image : ''
  });
  updateCoverChoiceUI();
  renderCoverPreview();
}

function updateCoverChoiceUI() {
  coverOptionButtons.forEach((button) => {
    const isColorMatch = draftCover.type === 'color' && button.dataset.coverType === 'color' && button.dataset.coverColor === draftCover.color;
    const isTypeMatch = draftCover.type !== 'color' && button.dataset.coverType === draftCover.type;
    button.classList.toggle('is-selected', isColorMatch || isTypeMatch);
  });
}

function renderCoverPreview() {
  if (!coverPreviewRecord) return;
  const previewItem = {
    composition,
    stepCount: Math.max(1, composition.reduce((max, entry) => Math.max(max, entry.step + 1), 0)),
    cover: draftCover
  };
  coverPreviewRecord.className = `archive-cd cover-preview-record ${getArchiveCoverClass(previewItem)}`;
  coverPreviewRecord.setAttribute('style', getArchiveCoverStyle(previewItem));
  coverPreviewRecord.innerHTML = renderArchiveRecordContent(previewItem);
}

function publishCoverComposition() {
  if (coverTitleInput) {
    compositionTitle = coverTitleInput.value.trim() || 'Untitled';
    updateTitleDisplay();
  }
  saveComposition(draftCover);
  closeCoverModal();
}

function handleCoverImageInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    draftCover = normalizeCover({ ...draftCover, type: 'image', image: String(reader.result || '') });
    updateCoverChoiceUI();
    renderCoverPreview();
  });
  reader.readAsDataURL(file);
}

function renderArchiveRecordContent(item) {
  const cover = normalizeCover(item.cover);
  if (cover.type === 'block') return renderCdSegments(item);
  return `
    <span class="cd-shine"></span>
    <span class="cd-hole"></span>
  `;
}

function renderCdSegments(item) {
  const usedNoteIds = [...new Set(item.composition.map((entry) => entry.noteId))]
    .sort((a, b) => notes.findIndex((note) => note.id === a) - notes.findIndex((note) => note.id === b));
  const trackCount = Math.max(1, usedNoteIds.length);
  const trackMap = new Map(usedNoteIds.map((noteId, index) => [noteId, index]));
  const innerRadius = 52;
  const outerRadius = 114;
  const trackHeight = (outerRadius - innerRadius) / trackCount;
  const strokeWidth = Math.max(3.2, trackHeight * 0.94);
  const trackRadii = usedNoteIds.map((_, index) => innerRadius + trackHeight * (index + 0.5));
  const guideRadii = Array.from({ length: trackCount + 1 }, (_, index) => innerRadius + trackHeight * index);
  const guides = guideRadii
    .map((radius) => `<circle class="cd-track-guide" cx="120" cy="120" r="${radius.toFixed(2)}"></circle>`)
    .join('');
  const songStepCount = item.composition.reduce((max, entry) => Math.max(max, entry.step + 1), 0);
  const stepCount = Math.max(1, songStepCount);
  const segments = item.composition.map((entry) => {
    const noteIndex = notes.findIndex((note) => note.id === entry.noteId);
    if (noteIndex < 0) return '';
    const note = notes[noteIndex];
    const trackIndex = trackMap.get(entry.noteId) || 0;
    const radius = trackRadii[trackIndex] || innerRadius + trackHeight * 0.5;
    const length = getSavedSustainLength(item.composition, entry.noteId, entry.step, stepCount);
    const isContinuation = entry.step > 0 && item.composition.some((saved) => saved.noteId === entry.noteId && saved.step === entry.step - 1);
    if (isContinuation) return '';
    const angle = (entry.step / stepCount) * 360 - 90;
    const sweep = Math.min(360, Math.max(2.2, (length / stepCount) * 360));
    const dash = `${sweep} ${360 - sweep}`;
    return `<circle class="cd-segment" cx="120" cy="120" r="${radius.toFixed(2)}" pathLength="360" stroke="${note.color}" stroke-width="${strokeWidth.toFixed(2)}" stroke-dasharray="${dash}" stroke-dashoffset="${(-angle).toFixed(2)}"></circle>`;
  }).join('');
  return `
    <span class="cd-shine"></span>
    <svg class="cd-map" viewBox="0 0 240 240" role="img" aria-label="composition record map">
      ${guides}
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

const noteNameLabels = {
  ko: {
    do: '도',
    re: '레',
    mi: '미',
    fa: '파',
    sol: '솔',
    la: '라',
    si: '시',
    me: '미♭'
  },
  en: {
    do: 'C',
    re: 'D',
    mi: 'E',
    fa: 'F',
    sol: 'G',
    la: 'A',
    si: 'B',
    me: 'E♭'
  }
};

function updateNoteNameLabels() {
  const labels = noteNameLabels[currentLanguage] || noteNameLabels.en;
  document.querySelectorAll('[data-note-key]').forEach((element) => {
    const key = element.dataset.noteKey;
    if (labels[key]) element.textContent = labels[key];
  });
}

function setLessonTensionEnabled(enabled) {
  lessonTensionEnabled = Boolean(enabled);
  const harmonyDemo = document.querySelector('.lesson-harmony-demo');
  harmonyDemo?.classList.toggle('has-tension', lessonTensionEnabled);
  lessonTensionToggle?.setAttribute('aria-pressed', String(lessonTensionEnabled));
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (dictionary[key] != null) element.setAttribute('placeholder', dictionary[key]);
  });
  updateNoteNameLabels();
  refreshIntentPromptPlaceholder();
  ensureAIPromptRequiredMarker();
  localizeSelectOptions();

  if (languageToggle) {
    const currentText = currentLanguage === 'ko' ? 'KOR' : 'ENG';
    const nextText = currentLanguage === 'ko' ? 'ENG' : 'KOR';
    languageToggle.querySelector('.language-current')?.replaceChildren(document.createTextNode(currentText));
    languageToggle.querySelector('.language-next')?.replaceChildren(document.createTextNode(nextText));
    languageToggle.setAttribute('aria-label', currentLanguage === 'ko' ? 'Switch to English' : '한국어로 전환');
  }
  updateHarmonyTypeControls();
  validateAICoachForm(false);
  if (playbackAnalysis) {
    renderMoodMetrics(playbackAnalysis);
    if (isPlaying) startCaptionCycle(playbackAnalysis);
  }
  renderLessonStep();
  renderLessonMood();
}

function renderLessonStep() {
  const track = lessonTracks[lessonTrack];
  if (!track || !lessonDemo || !lessonStepLabel || !lessonTitle || !lessonText) return;
  lessonDemo.dataset.step = String(lessonStep);
  lessonDemo.dataset.track = lessonTrack;
  lessonView?.classList.toggle('is-mood-mode', lessonTrack === 'feedback');
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
  stopLessonRhythmDemo();
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
  const nextView = viewNames.includes(viewName) ? viewName : 'home';
  const wasHome = document.body.dataset.view === 'home';
  const wasCompose = document.body.dataset.view === 'compose';
  document.body.dataset.view = nextView;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-active', view.id === `${nextView}View`);
  });
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === nextView);
  });
  if (nextView !== 'compose' && isPlaying) stopPlayback();
  if (nextView === 'home' && !wasHome) {
    homeView?.scrollTo({ top: 0, behavior: 'auto' });
  }
  if (nextView === 'compose' && !wasCompose && !hasCenteredComposeOnEntry) {
    hasCenteredComposeOnEntry = true;
    requestAnimationFrame(() => scrollC4RangeToCenter('auto'));
  }
  if (sidePanel?.classList.contains('is-open')) closeSidePanel();
  persistSessionState({ view: nextView });
  updateCursorHint();
}

function getPersistedSessionState() {
  try {
    return {
      view: localStorage.getItem(SESSION_VIEW_KEY),
      analysisTab: localStorage.getItem(SESSION_ANALYSIS_TAB_KEY)
    };
  } catch (error) {
    return { view: null, analysisTab: null };
  }
}

function persistSessionState({ view, analysisTab } = {}) {
  try {
    if (viewNames.includes(view)) localStorage.setItem(SESSION_VIEW_KEY, view);
    if (analysisTabNames.includes(analysisTab)) localStorage.setItem(SESSION_ANALYSIS_TAB_KEY, analysisTab);
  } catch (error) {
    // Ignore storage failures in private/file contexts.
  }
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
  const getScrollRoot = () => document.querySelector('#homeView.is-active');
  const getSections = () => [...document.querySelectorAll('#homeView.is-active .reveal')];
  let wheelIntent = 0;
  let wheelIntentTimer = 0;
  let wheelLockUntil = 0;
  const resetWheelIntent = () => {
    wheelIntent = 0;
    window.clearTimeout(wheelIntentTimer);
  };

  window.addEventListener('wheel', (event) => {
    const scrollRoot = getScrollRoot();
    const sections = getSections();
    if (!scrollRoot || sections.length < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const now = performance.now();
    if (isSectionScrolling || now < wheelLockUntil) return;

    const sectionHeight = Math.max(1, scrollRoot.clientHeight);
    const deltaModeLine = 1;
    const deltaModePage = 2;
    const delta = event.deltaMode === deltaModeLine
      ? event.deltaY * 40
      : event.deltaMode === deltaModePage
        ? event.deltaY * sectionHeight
        : event.deltaY;
    const absDelta = Math.abs(delta);
    const isMouseWheelStep = absDelta >= 72 || event.deltaMode !== 0;
    const intentThreshold = isMouseWheelStep ? 36 : 96;

    wheelIntent += delta;
    window.clearTimeout(wheelIntentTimer);
    wheelIntentTimer = window.setTimeout(resetWheelIntent, 220);

    if (Math.abs(wheelIntent) < intentThreshold) return;

    const positions = sections.map((_, index) => Math.round(sectionHeight * index));
    const currentY = scrollRoot.scrollTop;
    const currentIndex = Math.min(sections.length - 1, Math.max(0, Math.round(currentY / sectionHeight)));

    const direction = wheelIntent > 0 ? 1 : -1;
    const nextIndex = Math.min(sections.length - 1, Math.max(0, currentIndex + direction));
    if (nextIndex === currentIndex) {
      resetWheelIntent();
      return;
    }

    resetWheelIntent();
    isSectionScrolling = true;
    wheelLockUntil = now + 1150;
    const targetY = positions[nextIndex];
    updateCursorHint();
    scrollRoot.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
    window.setTimeout(() => {
      scrollRoot.scrollTo({
        top: targetY,
        behavior: 'auto'
      });
      window.setTimeout(() => {
        resetWheelIntent();
        isSectionScrolling = false;
      }, 260);
    }, 860);
  }, { passive: false, capture: true });
}

function initHomePointerGuards() {
  const isHomeSurfaceEvent = (event) => {
    const home = document.querySelector('#homeView.is-active');
    if (!home?.contains(event.target)) return false;
    return !event.target.closest('button, a, input, textarea, select, [role="button"], [contenteditable="true"]');
  };

  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'selectstart', 'dragstart'].forEach((type) => {
    document.addEventListener(type, (event) => {
      if (!isHomeSurfaceEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true });
  });
}

function isHomeHeroVisible() {
  const home = document.getElementById('homeView');
  return home?.classList.contains('is-active') && home.scrollTop < 4;
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
  scheduleCursorHintPosition();
}

function scheduleCursorPaint() {
  if (cursorFrame) return;
  cursorFrame = window.requestAnimationFrame(() => {
    cursorFrame = null;
    customCursor.classList.add('is-visible');
    customCursor.style.transform = `translate3d(${lastPointerX}px, ${lastPointerY}px, 0)`;
  });
}

function scheduleCursorHintPosition() {
  if (cursorHintFrame) return;
  cursorHintFrame = window.requestAnimationFrame(() => {
    cursorHintFrame = null;
    positionCursorHint();
  });
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
    scheduleCursorPaint();
    if (customCursor.classList.contains('show-hint')) scheduleCursorHintPosition();
  }, { passive: true });

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

  const updateScoreHint = (snapshot) => {
    const suggestedCell = snapshot.suggestedCell;
    const target = getGridTargetFromPoint(snapshot.x, snapshot.y);
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
      ? Math.hypot(snapshot.x - scoreHintTarget.x, snapshot.y - scoreHintTarget.y)
      : Infinity;
    if (scoreHintTarget?.key === nextTarget.key && movement < 4) return;

    window.clearTimeout(cursorHintTimer);
    scoreHintTarget = {
      ...nextTarget,
      x: snapshot.x,
      y: snapshot.y
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

  const scheduleScoreHint = (event) => {
    pendingScoreHintEvent = {
      x: event.clientX,
      y: event.clientY,
      suggestedCell: event.target?.closest?.('.grid-cell.is-suggested') || null
    };
    if (scoreHintFrame) return;
    scoreHintFrame = window.requestAnimationFrame(() => {
      scoreHintFrame = null;
      const snapshot = pendingScoreHintEvent;
      pendingScoreHintEvent = null;
      if (snapshot) updateScoreHint(snapshot);
    });
  };

  scoreGrid?.addEventListener('pointermove', scheduleScoreHint, { passive: true });
  scoreGrid?.addEventListener('pointerleave', resetScoreHint);

  window.addEventListener('scroll', updateCursorHint, { passive: true });
  homeView?.addEventListener('scroll', updateCursorHint, { passive: true });
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
    setAnalysisTab('visual');
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

function syncVolumeButton() {
  if (!volumeButton) return;
  const volumePercent = Math.round(volumeLevel * 100);
  const displayedVolumePercent = isMuted ? 0 : volumePercent;
  volumeButton.innerHTML = controlIcons[isMuted ? 'muted' : 'volume'];
  volumeButton.setAttribute('aria-pressed', String(isMuted));
  volumeButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
  volumeButton.dataset.hint = isMuted ? 'sound<br />off' : 'volume';
  volumeSlider?.style.setProperty('--volume-level', `${displayedVolumePercent}%`);
  if (volumeValueLabel) volumeValueLabel.textContent = String(displayedVolumePercent);
  if (volumeSlider && Number(volumeSlider.value) !== displayedVolumePercent) {
    volumeSlider.value = String(displayedVolumePercent);
  }
}

function setVolumeLevel(nextLevel) {
  volumeLevel = Math.max(0, Math.min(1, nextLevel));
  isMuted = volumeLevel <= 0;
  ensureAudio();
  syncMasterVolume();
  syncVolumeButton();
}

function showVolumeValueLabel() {
  if (!volumePopover) return;
  volumePopover.classList.add('is-adjusting');
  window.clearTimeout(volumeAdjustTimer);
  volumeAdjustTimer = window.setTimeout(() => {
    volumePopover.classList.remove('is-adjusting');
  }, 620);
}

function toggleVolumePopover() {
  if (!volumePopover) return;

  if (volumePopover.hidden) {
    volumePopover.hidden = false;
    volumeSlider?.focus();
    return;
  }

  if (isMuted) {
    volumeLevel = 0.5;
    isMuted = false;
  } else {
    isMuted = true;
  }

  ensureAudio();
  syncMasterVolume();
  syncVolumeButton();
}

function closeVolumePopover() {
  if (volumePopover) volumePopover.hidden = true;
}

function showPreviousExample() {
  loadExample(currentExampleIndex - 1);
}

function showNextExample() {
  loadExample(currentExampleIndex + 1);
}

function importCurrentExampleAsComposition() {
  if (!isExampleMode) return;
  pushUndoState();
  if (isPlaying) stopPlayback();
  const importedAt = Date.now();
  const example = exampleCompositions[currentExampleIndex];
  composition = composition.map((item, index) => ({
    ...item,
    id: `imported-example-${importedAt}-${index}`
  }));
  compositionTitle = example?.title || 'Untitled';
  isExampleMode = false;
  editingArchiveId = null;
  lastSelectedNoteId = null;
  lastSelectedStep = null;
  document.body.classList.remove('is-example-mode');
  exampleButton?.classList.remove('is-active');
  exampleButton?.setAttribute('aria-pressed', 'false');
  ensureOctaveRangeForComposition();
  setAnalysisTab('visual');
  updateExampleControls();
  render();
  playhead.style.setProperty('--progress', '0%');
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
  if (isExampleMode) setAnalysisTab('visual');
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
  openCoverModal();
});
coverCloseButton?.addEventListener('click', closeCoverModal);
coverModal?.querySelector('[data-cover-close]')?.addEventListener('click', closeCoverModal);
coverOptionButtons.forEach((button) => {
  button.addEventListener('click', () => setDraftCoverFromButton(button));
});
coverImageInput?.addEventListener('change', handleCoverImageInput);
coverTitleInput?.addEventListener('input', renderCoverPreview);
publishCoverButton?.addEventListener('click', publishCoverComposition);
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
importExampleButton?.addEventListener('click', importCurrentExampleAsComposition);
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
  if (event.target.closest?.('.custom-select')) return;
  if (volumeControl?.contains(event.target)) return;
  closeVolumePopover();
  closeAllCustomSelects();
  closeHarmonyTypeMenu();
  closeTensionMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAllCustomSelects();
    closeVolumePopover();
  }
});
exampleButton?.addEventListener('click', openExampleSongs);
intentPrompt?.addEventListener('input', clearAICoachFormMessage);
aiNativeSelects.forEach((select) => {
  select.addEventListener('change', clearAICoachFormMessage);
});
aiAnalyzeButton?.addEventListener('click', analyzeWithAICoach);
aiCoachResult?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-ai-action="apply-edits"]');
  if (!button) return;
  applyAICoachOperations();
});
analysisTabs.forEach((button) => {
  button.addEventListener('click', () => setAnalysisTab(button.dataset.analysisTab));
});
middleNotesButton?.addEventListener('click', scrollToMiddleNotes);
volumeButton?.addEventListener('click', toggleVolumePopover);
volumeSlider?.addEventListener('input', () => {
  setVolumeLevel(Number(volumeSlider.value) / 100);
  showVolumeValueLabel();
});
volumeSlider?.addEventListener('pointerdown', showVolumeValueLabel);
volumeSlider?.addEventListener('focus', showVolumeValueLabel);
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
lessonNoteButtons.forEach((button) => {
  button.addEventListener('click', () => playLessonNote(button));
  button.addEventListener('animationend', () => button.classList.remove('is-playing'));
});
lessonRhythmGrid?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-rhythm-play]');
  if (button) toggleLessonRhythmDemo(button.dataset.rhythmPlay);
});
lessonPrevButton?.addEventListener('click', retreatLesson);
lessonNextButton?.addEventListener('click', advanceLesson);
lessonTensionToggle?.addEventListener('click', () => {
  setLessonTensionEnabled(!lessonTensionEnabled);
});
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
initCustomSelects();
const persistedSessionState = getPersistedSessionState();
setAnalysisTab(analysisTabNames.includes(persistedSessionState.analysisTab) ? persistedSessionState.analysisTab : 'visual');
resizeIntentPrompt();
updateTitleDisplay();
syncControlButtons();
syncVolumeButton();
applyLanguage('ko');
setComposeZoom(1, false);
render();
renderArchive();
renderLessonRhythmGrid();
startLessonMoodLoop();
setView(viewNames.includes(persistedSessionState.view) ? persistedSessionState.view : 'home');
initScrollReveals();
initSoftSectionScroll();
initHomePointerGuards();
initCustomCursor();
