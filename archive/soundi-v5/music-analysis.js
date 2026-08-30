(function initSoundiMoodAI(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SoundiMoodAI = api;
}(typeof globalThis !== 'undefined' ? globalThis : window, function createSoundiMoodAI() {
  const MOODS = ['bright', 'calm', 'energetic', 'dreamy', 'tense', 'heavy'];
  const MIN_NOTES_FOR_MOOD = 4;
  const LONG_STEP = 4;
  const SHORT_STEP = 1.5;
  const TENSION_INTERVALS = new Set([1, 2, 6, 10, 11]);
  const CONSONANT_INTERVALS = new Set([0, 3, 4, 5, 7, 8, 9, 12]);

  const moodMeta = {
    bright: { label: { ko: '밝음', en: 'Bright' }, color: '#ffd92f' },
    calm: { label: { ko: '차분함', en: 'Calm' }, color: '#86c5df' },
    energetic: { label: { ko: '활기참', en: 'Energetic' }, color: '#ff6a3d' },
    dreamy: { label: { ko: '몽환적', en: 'Dreamy' }, color: '#b9a7ff' },
    tense: { label: { ko: '긴장감', en: 'Tense' }, color: '#7b5cff' },
    heavy: { label: { ko: '무거움', en: 'Heavy' }, color: '#344866' }
  };

  function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  function safeDivide(value, total) {
    return total ? value / total : 0;
  }

  function average(values, fallback = 0) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  }

  function normalizeInput(composition, notes, options = {}) {
    const noteMap = new Map((Array.isArray(notes) ? notes : []).map((note) => [note.id, note]));
    const stepCount = Math.max(1, Number(options.stepCount) || 64);
    const items = (Array.isArray(composition) ? composition : [])
      .map((item) => {
        const note = noteMap.get(item?.noteId);
        const step = Number(item?.step);
        if (!note || !Number.isFinite(step)) return null;
        const accidental = Number.isFinite(item.accidental) ? item.accidental : 0;
        return {
          id: item.id || `${item.noteId}-${step}`,
          noteId: item.noteId,
          key: note.key,
          octave: note.octave,
          step: Math.max(0, Math.round(step)),
          midi: (Number(note.midi) || 0) + accidental,
          accidental
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.step - b.step || b.midi - a.midi);
    return { items, stepCount };
  }

  function getSustainStarts(items, stepCount) {
    const occupied = new Set(items.map((item) => `${item.noteId}:${item.step}`));
    return items
      .filter((item) => !occupied.has(`${item.noteId}:${item.step - 1}`))
      .map((item) => {
        let duration = 1;
        while (item.step + duration < stepCount && occupied.has(`${item.noteId}:${item.step + duration}`)) {
          duration += 1;
        }
        return { ...item, duration };
      });
  }

  function getStepCenters(starts) {
    const grouped = new Map();
    starts.forEach((item) => {
      if (!grouped.has(item.step)) grouped.set(item.step, []);
      grouped.get(item.step).push(item.midi);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([step, midis]) => ({ step, pitch: average(midis) }));
  }

  function countRepeatedRhythmPatterns(activeSteps) {
    if (activeSteps.length < 6) return 0;
    const gaps = activeSteps.slice(1).map((step, index) => Math.min(8, step - activeSteps[index]));
    const counts = new Map();
    for (let index = 0; index <= gaps.length - 3; index += 1) {
      const key = gaps.slice(index, index + 3).join('-');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const max = Math.max(0, ...counts.values());
    return clamp01((max - 1) / 4);
  }

  function getHarmonyTraits(starts) {
    const byStep = new Map();
    starts.forEach((item) => {
      if (!byStep.has(item.step)) byStep.set(item.step, []);
      byStep.get(item.step).push(item.midi);
    });
    let majorThirds = 0;
    let minorThirds = 0;
    let tensePairs = 0;
    let totalPairs = 0;
    let consonantPairs = 0;
    byStep.forEach((midis) => {
      for (let i = 0; i < midis.length; i += 1) {
        for (let j = i + 1; j < midis.length; j += 1) {
          const interval = Math.abs(midis[j] - midis[i]) % 12;
          totalPairs += 1;
          if (interval === 4 || interval === 8) majorThirds += 1;
          if (interval === 3 || interval === 9) minorThirds += 1;
          if (TENSION_INTERVALS.has(interval)) tensePairs += 1;
          if (CONSONANT_INTERVALS.has(interval)) consonantPairs += 1;
        }
      }
    });
    return {
      majorTendency: safeDivide(majorThirds, majorThirds + minorThirds),
      minorTendency: safeDivide(minorThirds, majorThirds + minorThirds),
      dissonance: clamp01(safeDivide(tensePairs, Math.max(1, totalPairs)) * 1.25),
      consonance: safeDivide(consonantPairs, Math.max(1, totalPairs)),
      chordRatio: safeDivide([...byStep.values()].filter((midis) => midis.length >= 2).length, Math.max(1, byStep.size))
    };
  }

  function extractMusicFeatures(composition, notes, options = {}) {
    const { items, stepCount } = normalizeInput(composition, notes, options);
    const starts = getSustainStarts(items, stepCount);
    const noteCount = starts.length;
    const activeSteps = [...new Set(starts.map((item) => item.step))].sort((a, b) => a - b);
    const midis = starts.map((item) => item.midi);
    const minMidi = midis.length ? Math.min(...midis) : 48;
    const maxMidi = midis.length ? Math.max(...midis) : 84;
    const pitchSpan = Math.max(1, options.maxMidi ? options.maxMidi - (options.minMidi || 0) : 84);
    const averageMidi = average(midis, 60);
    const pitchValues = (Array.isArray(notes) ? notes : []).map((note) => Number(note.midi)).filter(Number.isFinite);
    const globalMin = pitchValues.length ? Math.min(...pitchValues) : 24;
    const globalMax = pitchValues.length ? Math.max(...pitchValues) : 108;
    const globalSpan = Math.max(1, globalMax - globalMin);
    const durations = starts.map((item) => item.duration);
    const longRatio = safeDivide(durations.filter((duration) => duration >= LONG_STEP).length, noteCount);
    const shortRatio = safeDivide(durations.filter((duration) => duration <= SHORT_STEP).length, noteCount);
    const highThreshold = globalMin + globalSpan * 0.66;
    const lowThreshold = globalMin + globalSpan * 0.34;
    const centers = getStepCenters(starts);
    const pitchDiffs = centers.slice(1).map((current, index) => current.pitch - centers[index].pitch);
    const intervals = pitchDiffs.map(Math.abs);
    const gaps = activeSteps.slice(1).map((step, index) => step - activeSteps[index]);
    const pitchClasses = starts.map((item) => ((item.midi % 12) + 12) % 12);
    const pitchClassCounts = pitchClasses.reduce((map, pitchClass) => map.set(pitchClass, (map.get(pitchClass) || 0) + 1), new Map());
    const maxPitchClassCount = Math.max(0, ...pitchClassCounts.values());
    const repeatedRhythm = countRepeatedRhythmPatterns(activeSteps);
    const harmony = getHarmonyTraits(starts);
    const firstStep = activeSteps[0] || 0;
    const lastEnd = starts.reduce((max, item) => Math.max(max, item.step + item.duration), 0);
    const usedSteps = Math.max(1, lastEnd - firstStep);
    const occupiedSteps = new Set();
    starts.forEach((item) => {
      for (let step = item.step; step < item.step + item.duration; step += 1) occupiedSteps.add(step);
    });
    const contourChange = centers.slice(1).reduce((sum, current, index) => {
      const previousDirection = index > 0 ? Math.sign(centers[index].pitch - centers[index - 1].pitch) : 0;
      const direction = Math.sign(current.pitch - centers[index].pitch);
      return sum + (previousDirection && direction && previousDirection !== direction ? 1 : 0);
    }, 0);

    return {
      noteCount,
      blockCount: items.length,
      stepCount,
      activeStepCount: activeSteps.length,
      averagePitch: clamp01((averageMidi - globalMin) / globalSpan),
      highRatio: safeDivide(midis.filter((midi) => midi >= highThreshold).length, noteCount),
      lowRatio: safeDivide(midis.filter((midi) => midi <= lowThreshold).length, noteCount),
      pitchRange: clamp01((maxMidi - minMidi) / pitchSpan),
      noteDensity: clamp01(noteCount / Math.max(8, stepCount * 0.55)),
      rhythmicDensity: clamp01(activeSteps.length / Math.max(8, stepCount * 0.5)),
      longNoteRatio: longRatio,
      shortNoteRatio: shortRatio,
      restRatio: clamp01(1 - safeDivide(occupiedSteps.size, usedSteps)),
      repetitionStrength: clamp01(Math.max(safeDivide(maxPitchClassCount, noteCount), repeatedRhythm) * 1.2),
      ascendingRatio: safeDivide(pitchDiffs.filter((diff) => diff > 0.1).length, pitchDiffs.length),
      descendingRatio: safeDivide(pitchDiffs.filter((diff) => diff < -0.1).length, pitchDiffs.length),
      averageInterval: clamp01(average(intervals, 0) / 12),
      rhythmVariation: clamp01(average(gaps.slice(1).map((gap, index) => Math.abs(gap - gaps[index])), 0) / 6),
      majorTendency: harmony.majorTendency,
      minorTendency: harmony.minorTendency,
      dissonance: harmony.dissonance,
      tension: clamp01(harmony.dissonance * 0.65 + average(intervals, 0) / 18 * 0.25 + safeDivide(starts.filter((item) => item.accidental !== 0).length, noteCount) * 0.1),
      chordRatio: harmony.chordRatio,
      overallChange: clamp01((average(intervals, 0) / 12) * 0.36 + clamp01(contourChange / 6) * 0.24 + clamp01(average(gaps, 0) / 8) * 0.14 + clamp01((maxMidi - minMidi) / 24) * 0.26),
      averageDuration: clamp01(average(durations, 1) / 8),
      raw: { starts, activeSteps, centers, gaps, durations }
    };
  }

  function calculateMoodScores(features) {
    const f = features || extractMusicFeatures([], []);
    const scores = {
      bright: 0.22 + f.averagePitch * 0.26 + f.highRatio * 0.2 + f.majorTendency * 0.14 + (1 - f.tension) * 0.1 + f.shortNoteRatio * 0.08,
      calm: 0.2 + f.longNoteRatio * 0.26 + f.restRatio * 0.18 + (1 - f.rhythmicDensity) * 0.14 + (1 - f.tension) * 0.14 + (1 - f.overallChange) * 0.08,
      energetic: 0.18 + f.rhythmicDensity * 0.3 + f.shortNoteRatio * 0.2 + f.repetitionStrength * 0.12 + f.overallChange * 0.12 + f.averagePitch * 0.08,
      dreamy: 0.2 + f.longNoteRatio * 0.18 + f.pitchRange * 0.16 + f.restRatio * 0.14 + f.chordRatio * 0.12 + (1 - Math.abs(f.ascendingRatio - f.descendingRatio)) * 0.1 + f.tension * 0.1,
      tense: 0.12 + f.tension * 0.38 + f.dissonance * 0.24 + f.averageInterval * 0.12 + f.rhythmVariation * 0.08 + f.overallChange * 0.06,
      heavy: 0.16 + f.lowRatio * 0.28 + f.longNoteRatio * 0.18 + f.minorTendency * 0.14 + (1 - f.averagePitch) * 0.14 + f.chordRatio * 0.1
    };
    return Object.fromEntries(MOODS.map((mood) => [mood, clamp01(scores[mood])]));
  }

  function selectDominantMoods(scores, features = {}) {
    const sorted = MOODS
      .map((mood) => ({ mood, score: clamp01(scores?.[mood]) }))
      .sort((a, b) => b.score - a.score);
    return {
      primaryMood: sorted[0]?.mood || 'calm',
      secondaryMood: sorted[1]?.mood || 'dreamy',
      primaryScore: sorted[0]?.score || 0,
      secondaryScore: sorted[1]?.score || 0,
      mixedMood: sorted[0] && sorted[1] ? Math.abs(sorted[0].score - sorted[1].score) < 0.12 : false,
      energy: clamp01(features.rhythmicDensity * 0.45 + features.shortNoteRatio * 0.25 + features.overallChange * 0.2 + features.repetitionStrength * 0.1),
      tension: clamp01(features.tension),
      brightness: clamp01(features.averagePitch * 0.34 + features.highRatio * 0.24 + features.majorTendency * 0.18 + (1 - features.lowRatio) * 0.14 + (1 - features.tension) * 0.1)
    };
  }

  function hexToRgb(hex) {
    const value = String(hex || '#000000').replace('#', '');
    const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value.padEnd(6, '0');
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }

  function rgbToHex(rgb) {
    return '#' + [rgb.r, rgb.g, rgb.b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('');
  }

  function mixHex(a, b, amount) {
    const from = hexToRgb(a);
    const to = hexToRgb(b);
    return rgbToHex({
      r: from.r + (to.r - from.r) * amount,
      g: from.g + (to.g - from.g) * amount,
      b: from.b + (to.b - from.b) * amount
    });
  }

  function createMoodVisualState(result) {
    const primary = moodMeta[result.primaryMood] || moodMeta.calm;
    const secondary = moodMeta[result.secondaryMood] || moodMeta.dreamy;
    const brightnessMix = 0.1 + clamp01(result.brightness) * 0.26;
    const base = mixHex(primary.color, '#ffffff', brightnessMix);
    const blend = mixHex(primary.color, secondary.color, result.mixedMood ? 0.46 : 0.26);
    return {
      colors: [base, blend, mixHex(secondary.color, '#ffffff', 0.18), mixHex(primary.color, '#111111', 0.08 + result.tension * 0.18)],
      gradientDuration: Math.round(15000 - result.energy * 7600),
      shapeDuration: Math.round(17000 - result.energy * 7200),
      pulseDuration: Math.round(4200 - result.energy * 2300),
      irregularity: clamp01(result.tension),
      focusX: `${32 + result.brightness * 36}%`,
      focusY: `${64 - result.energy * 28}%`
    };
  }

  function createStablePhraseIndex(values, count, salt = '') {
    if (!count) return 0;
    const parts = ['brightness', 'energy', 'tension', 'repetitionStrength', 'pitchRange', 'rhythmicDensity']
      .map((key) => Math.round(clamp01(values[key]) * 10));
    const key = `${salt}:${parts.join('-')}`;
    let hash = 2166136261;
    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) % count;
  }

  function pick(parts, values, salt) {
    return parts[createStablePhraseIndex(values, parts.length, salt)];
  }

  function createFeedbackSentence(result, language = 'ko') {
    if (!result || result.status !== 'ready') {
      return language === 'ko'
        ? '노트를 조금 더 놓으면, 음역과 리듬의 구조를 바탕으로 분위기를 표현할게요.'
        : 'Add a few more notes, and I will describe the mood from the pitch and rhythm structure.';
    }
    const f = result.features;
    const values = { ...f, brightness: result.brightness, energy: result.energy, tension: result.tension };
    const moodKo = {
      bright: ['밝은 흐름이 나타나요', '선명하고 열린 분위기로 정리돼요'],
      calm: ['차분한 흐름이 나타나요', '안정적인 분위기로 이어져요'],
      energetic: ['활기 있는 흐름이 나타나요', '움직임이 강한 분위기로 보여요'],
      dreamy: ['몽환적인 분위기가 함께 나타나요', '부드럽게 떠 있는 흐름으로 보여요'],
      tense: ['긴장감 있는 분위기가 드러나요', '불안정한 대비가 분위기를 만들어요'],
      heavy: ['무거운 분위기가 나타나요', '낮고 깊은 흐름으로 정리돼요']
    };
    const moodEn = {
      bright: ['a bright structure appears', 'the mood becomes clear and open'],
      calm: ['a calm structure appears', 'the mood settles into a steady shape'],
      energetic: ['an energetic structure appears', 'the movement becomes visually active'],
      dreamy: ['a dreamy layer appears', 'the phrase feels softly suspended'],
      tense: ['a tense structure appears', 'contrast creates an uneasy shape'],
      heavy: ['a heavy structure appears', 'the phrase settles into a low, deep shape']
    };
    if (language === 'en') {
      const range = f.highRatio > f.lowRatio + 0.12
        ? pick(['high notes lead the phrase', 'the melody stays mostly in the upper range'], values, 'en-range-high')
        : f.lowRatio > f.highRatio + 0.12
          ? pick(['low notes anchor the phrase', 'the melody stays mostly in the lower range'], values, 'en-range-low')
          : pick(['high and low notes stay balanced', 'the pitch range is evenly distributed'], values, 'en-range-mid');
      const rhythm = f.shortNoteRatio > f.longNoteRatio
        ? pick(['short rhythms repeat in close spacing', 'compact note lengths create active motion'], values, 'en-rhythm-short')
        : pick(['longer notes connect the phrase smoothly', 'wide rhythmic spacing leaves visible room'], values, 'en-rhythm-long');
      const repeat = f.repetitionStrength > 0.55 ? 'with repeated patterns holding the shape' : 'with small changes between phrases';
      const motion = f.ascendingRatio > f.descendingRatio + 0.15 ? 'and the melody tends to rise' : f.descendingRatio > f.ascendingRatio + 0.15 ? 'and the melody tends to descend' : 'and the melody moves in a balanced contour';
      const ending = pick(moodEn[result.primaryMood], values, `en-${result.primaryMood}`);
      const secondary = result.mixedMood ? `, while ${moodEn[result.secondaryMood][0]}` : '';
      return `${range} and ${rhythm}, ${repeat}, ${motion}; ${ending}${secondary}.`;
    }
    const range = f.highRatio > f.lowRatio + 0.12
      ? pick(['높은 음역이 중심을 이루고', '멜로디가 위쪽 음역에 많이 놓이고'], values, 'ko-range-high')
      : f.lowRatio > f.highRatio + 0.12
        ? pick(['낮은 음역이 중심을 잡고', '멜로디가 아래쪽 음역에 많이 놓이고'], values, 'ko-range-low')
        : pick(['높은 음과 낮은 음이 균형을 이루고', '음역이 한쪽으로 치우치지 않고'], values, 'ko-range-mid');
    const rhythm = f.shortNoteRatio > f.longNoteRatio
      ? pick(['짧은 리듬이 촘촘하게 반복되어', '짧은 음들이 가까운 간격으로 이어져'], values, 'ko-rhythm-short')
      : pick(['긴 음이 완만하게 이어지며', '넓은 간격과 긴 음이 흐름을 만들며'], values, 'ko-rhythm-long');
    const repeat = f.repetitionStrength > 0.55 ? '반복되는 패턴이 구조를 잡아' : '조금씩 달라지는 움직임이 더해져';
    const motion = f.ascendingRatio > f.descendingRatio + 0.15 ? '선율이 위로 향하는 경향을 보여' : f.descendingRatio > f.ascendingRatio + 0.15 ? '선율이 아래로 내려가는 경향을 보여' : '선율이 오르내림의 균형을 보여';
    const ending = pick(moodKo[result.primaryMood], values, `ko-${result.primaryMood}`);
    const secondary = result.mixedMood ? `, 그 안에 ${moodKo[result.secondaryMood][0]}` : '';
    return `${range} ${rhythm}, ${repeat} ${motion} ${ending}${secondary}.`;
  }

  function buildReasons(result) {
    const f = result.features;
    const reasons = [];
    if (f.highRatio > f.lowRatio + 0.12) reasons.push('high-pitch-focus');
    if (f.lowRatio > f.highRatio + 0.12) reasons.push('low-pitch-focus');
    if (f.shortNoteRatio > 0.5) reasons.push('short-note-density');
    if (f.longNoteRatio > 0.35) reasons.push('long-note-flow');
    if (f.repetitionStrength > 0.55) reasons.push('repeated-patterns');
    if (f.tension > 0.45) reasons.push('interval-tension');
    if (f.chordRatio > 0.22) reasons.push('stacked-notes');
    if (f.restRatio > 0.45) reasons.push('visible-rest-space');
    return reasons.slice(0, 5);
  }

  function analyzeMusicMood(composition, notes, options = {}) {
    const features = extractMusicFeatures(composition, notes, options);
    if (features.noteCount < (options.minNotesForMood || MIN_NOTES_FOR_MOOD)) {
      return {
        status: 'insufficient',
        features,
        scores: Object.fromEntries(MOODS.map((mood) => [mood, 0])),
        primaryMood: 'calm',
        secondaryMood: 'dreamy',
        primaryScore: 0,
        secondaryScore: 0,
        energy: 0,
        tension: 0,
        brightness: 0.5,
        reasons: ['not-enough-notes'],
        visualState: createMoodVisualState({ primaryMood: 'calm', secondaryMood: 'dreamy', mixedMood: true, energy: 0, tension: 0, brightness: 0.5 })
      };
    }
    const scores = calculateMoodScores(features);
    const dominant = selectDominantMoods(scores, features);
    const result = {
      status: 'ready',
      features,
      scores,
      ...dominant
    };
    result.reasons = buildReasons(result);
    result.visualState = createMoodVisualState(result);
    return result;
  }

  return {
    MOODS,
    moodMeta,
    extractMusicFeatures,
    calculateMoodScores,
    selectDominantMoods,
    createMoodVisualState,
    createFeedbackSentence,
    createStablePhraseIndex,
    analyzeMusicMood
  };
}));
