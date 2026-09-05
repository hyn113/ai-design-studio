(function initSoundiMoodAI(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SoundiMoodAI = api;
}(typeof globalThis !== 'undefined' ? globalThis : window, function createSoundiMoodAI() {
  const MOODS = ['bright', 'playful', 'ascending', 'airy', 'warm', 'sparse', 'dreamy', 'moon', 'deep', 'layered'];
  const MIN_NOTES_FOR_MOOD = 4;
  const LONG_STEP = 4;
  const SHORT_STEP = 1.5;
  const TENSION_INTERVALS = new Set([1, 2, 6, 10, 11]);
  const CONSONANT_INTERVALS = new Set([0, 3, 4, 5, 7, 8, 9, 12]);

  const moodMeta = {
    bright: { label: { ko: '밝음', en: 'Bright' }, color: '#ffd92f', palette: ['#ffe03d', '#a6f05a', '#ff8a24', '#fff7b8'] },
    playful: { label: { ko: '경쾌함', en: 'Playful' }, color: '#ffcf2f', palette: ['#ffe44d', '#76d9ff', '#99ef6d', '#ff8f7a'] },
    ascending: { label: { ko: '상승감', en: 'Ascending' }, color: '#82d8ff', palette: ['#7fdcff', '#99ef76', '#fff15a', '#eaffc7'] },
    airy: { label: { ko: '공기감', en: 'Airy' }, color: '#aeefff', palette: ['#c7f3ff', '#a9f2df', '#ffffff', '#eafcff'] },
    warm: { label: { ko: '따뜻함', en: 'Warm' }, color: '#ff9d2e', palette: ['#ff9a30', '#ff806d', '#ffe057', '#5fcf76'] },
    sparse: { label: { ko: '여백감', en: 'Sparse' }, color: '#d8e6e0', palette: ['#eeeeee', '#bfe7d8', '#ffd8c2', '#f8f8f8'] },
    dreamy: { label: { ko: '몽환적', en: 'Dreamy' }, color: '#b9a7ff', palette: ['#c7b7ff', '#a8efff', '#c7f2b2', '#f3eeff'] },
    moon: { label: { ko: '푸른 밤', en: 'Moon' }, color: '#6f9fe7', palette: ['#5f95e8', '#b7a7ee', '#d8e8ff', '#eef2ff'] },
    deep: { label: { ko: '깊음', en: 'Deep' }, color: '#344866', palette: ['#1f3f78', '#70659b', '#6f8797', '#d9e1ea'] },
    layered: { label: { ko: '겹쳐짐', en: 'Layered' }, color: '#8cbcff', palette: ['#8bd5ff', '#a184ff', '#ffd966', '#e8f5ff'] }
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
    const ascent = Math.max(0, f.ascendingRatio - f.descendingRatio);
    const openHigh = f.highRatio * f.restRatio;
    const moderateDensity = 1 - Math.min(1, Math.abs(f.rhythmicDensity - 0.46) / 0.46);
    const sparseSpace = clamp01(f.restRatio * 0.72 + (1 - f.noteDensity) * 0.28);
    const layeredWidth = clamp01(f.chordRatio * 0.62 + f.pitchRange * 0.38);
    const scores = {
      bright: 0.14 + f.rhythmicDensity * 0.24 + f.repetitionStrength * 0.2 + f.shortNoteRatio * 0.16 + f.averagePitch * 0.12 + f.majorTendency * 0.08 + (1 - f.tension) * 0.06,
      playful: 0.12 + f.highRatio * 0.28 + f.shortNoteRatio * 0.26 + f.rhythmicDensity * 0.18 + f.overallChange * 0.1 + (1 - f.longNoteRatio) * 0.06,
      ascending: 0.1 + ascent * 0.46 + f.highRatio * 0.2 + f.averagePitch * 0.12 + f.overallChange * 0.08 + (1 - f.lowRatio) * 0.04,
      airy: 0.12 + openHigh * 0.34 + f.highRatio * 0.18 + f.restRatio * 0.18 + (1 - f.rhythmicDensity) * 0.12 + (1 - f.tension) * 0.06,
      warm: 0.16 + moderateDensity * 0.26 + (1 - Math.abs(f.averagePitch - 0.52)) * 0.18 + f.majorTendency * 0.14 + (1 - f.tension) * 0.12 + f.repetitionStrength * 0.06,
      sparse: 0.18 + sparseSpace * 0.38 + f.restRatio * 0.2 + (1 - f.rhythmicDensity) * 0.12 + (1 - f.noteDensity) * 0.08 + (1 - f.overallChange) * 0.04,
      dreamy: 0.14 + f.longNoteRatio * 0.24 + f.pitchRange * 0.22 + f.restRatio * 0.14 + (1 - Math.abs(f.ascendingRatio - f.descendingRatio)) * 0.1 + f.chordRatio * 0.08 + (1 - f.tension) * 0.08,
      moon: 0.14 + f.lowRatio * 0.26 + f.restRatio * 0.22 + f.longNoteRatio * 0.18 + (1 - f.rhythmicDensity) * 0.12 + (1 - f.averagePitch) * 0.08,
      deep: 0.14 + f.lowRatio * 0.3 + f.longNoteRatio * 0.24 + (1 - f.averagePitch) * 0.16 + f.minorTendency * 0.1 + f.chordRatio * 0.06,
      layered: 0.12 + layeredWidth * 0.36 + f.chordRatio * 0.28 + f.pitchRange * 0.14 + f.longNoteRatio * 0.06 + f.repetitionStrength * 0.04
    };
    return Object.fromEntries(MOODS.map((mood) => [mood, clamp01(scores[mood])]));
  }

  function selectDominantMoods(scores, features = {}) {
    const sorted = MOODS
      .map((mood) => ({ mood, score: clamp01(scores?.[mood]) }))
      .sort((a, b) => b.score - a.score);
    return {
      primaryMood: sorted[0]?.mood || 'warm',
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
    const value = String(hex || '#0c0c0c').replace('#', '');
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
    const primary = moodMeta[result.primaryMood] || moodMeta.warm;
    const secondary = moodMeta[result.secondaryMood] || moodMeta.dreamy;
    const primaryPalette = primary.palette || [primary.color, mixHex(primary.color, '#ffffff', 0.2), primary.color, '#ffffff'];
    const secondaryPalette = secondary.palette || primaryPalette;
    const lightMix = result.primaryMood === 'sparse' || result.primaryMood === 'airy' ? 0.1 : 0.03;
    const blendAmount = result.mixedMood ? 0.22 : 0.08;
    return {
      colors: [
        mixHex(primaryPalette[0], '#ffffff', lightMix),
        mixHex(primaryPalette[1] || primaryPalette[0], secondaryPalette[0] || primaryPalette[0], blendAmount),
        primaryPalette[2] || secondaryPalette[1] || primary.color,
        mixHex(primaryPalette[3] || secondaryPalette[2] || primary.color, primary.color, 0.14)
      ],
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
        ? '블록을 조금 더 놓아보세요. 곡의 흐름이 보이면 어떤 분위기인지 알려드릴게요.'
        : 'Add a few more notes. Once the flow takes shape, I will describe the mood it suggests.';
    }

    const f = result.features;
    const values = { ...f, brightness: result.brightness, energy: result.energy, tension: result.tension };

    const moodKo = {
      bright: [
        '햇빛이 들어오는 낮처럼 밝고 가벼운 분위기가 느껴져요.',
        '기분 좋게 하루를 시작하는 순간처럼 산뜻하게 느껴져요.',
        '맑은 날 밖으로 나갈 때처럼 밝고 생기 있는 느낌이에요.',
        '환한 공간에 들어선 것처럼 기분이 자연스럽게 밝아져요.'
      ],
      playful: [
        '가볍게 뛰어다니는 장면처럼 통통 튀는 분위기가 느껴져요.',
        '친구와 장난치며 걷는 순간처럼 발랄하고 즐거운 느낌이에요.',
        '작은 움직임이 계속 이어지는 것처럼 경쾌하게 느껴져요.',
        '발걸음이 저절로 빨라지는 것처럼 가볍고 신나는 분위기예요.'
      ],
      ascending: [
        '조금씩 시야가 트이는 것처럼 위로 올라가는 느낌이 들어요.',
        '계단을 한 칸씩 올라가는 장면처럼 점점 힘이 생겨요.',
        '앞으로 나아갈수록 기분이 열리는 듯한 분위기가 느껴져요.',
        '천천히 고개를 들어 하늘을 보는 것처럼 상승하는 흐름이 느껴져요.'
      ],
      airy: [
        '바람이 잘 드는 창가에 있는 것처럼 가볍고 탁 트인 느낌이에요.',
        '넓은 공간에 혼자 서 있는 것처럼 여유롭고 맑게 느껴져요.',
        '구름 사이로 바람이 지나가는 것처럼 가볍고 시원한 분위기예요.',
        '조용한 공간에 빛이 들어오는 것처럼 여백이 편안하게 느껴져요.'
      ],
      warm: [
        '익숙한 공간에서 쉬고 있는 것처럼 편안하고 따뜻하게 느껴져요.',
        '늦은 오후의 햇빛처럼 부드럽고 포근한 분위기가 느껴져요.',
        '천천히 이야기를 나누는 시간처럼 차분하고 다정한 느낌이에요.',
        '집에 돌아와 긴장이 풀리는 순간처럼 편안한 분위기예요.'
      ],
      sparse: [
        '사람이 적은 조용한 공간처럼 여백이 크게 느껴져요.',
        '잠시 멈춰 생각하는 순간처럼 차분하고 담백한 분위기예요.',
        '넓은 공간에 작은 움직임이 하나씩 나타나는 것처럼 조용하고 단정하게 느껴져요.',
        '말수가 적은 대화처럼 필요한 만큼만 남겨둔 느낌이에요.'
      ],
      dreamy: [
        '잠들기 직전 떠오르는 장면처럼 몽글하고 몽환적으로 느껴져요.',
        '창밖 풍경을 멍하니 바라볼 때처럼 생각이 천천히 흐르는 느낌이에요.',
        '기억 속 장면이 조금 흐릿하게 떠오르는 것처럼 몽환적인 분위기예요.',
        '늦은 밤 천천히 걷는 순간처럼 현실에서 살짝 멀어진 느낌이에요.'
      ],
      moon: [
        '늦은 밤 혼자 걷는 길처럼 조용하고 서늘한 분위기가 느껴져요.',
        '불이 거의 꺼진 방처럼 차분하고 고요하게 느껴져요.',
        '밤공기를 천천히 마시는 순간처럼 조용하고 맑은 느낌이에요.',
        '사람이 없는 새벽 거리처럼 고요한 분위기가 길게 남아요.'
      ],
      deep: [
        '생각이 많아지는 늦은 밤처럼 묵직하고 깊은 분위기가 느껴져요.',
        '조용히 혼자 생각에 잠긴 순간처럼 무게감 있게 느껴져요.',
        '어두운 공간에서 낮은 빛만 남아 있는 것처럼 깊고 차분한 느낌이에요.',
        '천천히 가라앉는 생각처럼 무게가 아래쪽에 머무는 분위기예요.'
      ],
      layered: [
        '여러 사람이 한 공간에서 이야기하는 것처럼 풍성한 느낌이 들어요.',
        '여러 장면이 한꺼번에 겹쳐 보이는 것처럼 입체적인 분위기가 느껴져요.',
        '여러 움직임이 겹쳐 주변을 채우는 것처럼 꽉 차고 풍성하게 느껴져요.',
        '서로 다른 움직임이 함께 이어지는 것처럼 다채로운 분위기예요.'
      ]
    };

    const scenes = [];

    if (result.energy > 0.68) {
      scenes.push(pick([
        '빠르게 걷다 어느새 뛰기 시작하는 순간이 떠올라요.',
        '사람들이 분주하게 오가는 거리의 움직임이 떠올라요.',
        '기분 좋은 약속을 향해 서둘러 가는 발걸음이 떠올라요.'
      ], values, 'scene-energy-high'));
    } else if (result.energy < 0.34) {
      scenes.push(pick([
        '잠시 멈춰 창밖을 바라보는 시간이 떠올라요.',
        '늦은 시간 조용한 방에 혼자 있는 장면이 떠올라요.',
        '천천히 산책하며 주변을 둘러보는 순간이 떠올라요.'
      ], values, 'scene-energy-low'));
    }

    if (f.restRatio > 0.48) {
      scenes.push(pick([
        '움직임과 움직임 사이에 잠깐씩 쉬어가는 것처럼 여유가 있어요.',
        '넓은 공간에 작은 움직임만 남아 있는 장면이 떠올라요.',
        '한적한 길을 천천히 걷는 것처럼 공간이 넓게 느껴져요.'
      ], values, 'scene-space'));
    }

    if (f.ascendingRatio > f.descendingRatio + 0.18) {
      scenes.push(pick([
        '점점 멀리까지 보이는 높은 곳으로 올라가는 장면이 떠올라요.',
        '아침이 밝아오듯 분위기가 조금씩 열리는 느낌이에요.',
        '기대하던 일을 앞두고 마음이 조금씩 들뜨는 순간이 떠올라요.'
      ], values, 'scene-up'));
    } else if (f.descendingRatio > f.ascendingRatio + 0.18) {
      scenes.push(pick([
        '하루를 마치고 천천히 집으로 돌아가는 길이 떠올라요.',
        '해가 지면서 주변이 조금씩 조용해지는 장면이 떠올라요.',
        '긴 하루 끝에 몸의 힘을 천천히 빼는 순간이 떠올라요.'
      ], values, 'scene-down'));
    }

    if (result.tension > 0.55) {
      scenes.push(pick([
        '무언가를 기다리며 결과를 확인하기 직전의 긴장감도 살짝 느껴져요.',
        '익숙한 길에서 갑자기 방향이 달라지는 것 같은 긴장감이 있어요.',
        '조용한 순간에도 다음 장면을 기다리게 되는 느낌이 있어요.'
      ], values, 'scene-tension'));
    }

    const firstSentence = pick(
      moodKo[result.primaryMood] || moodKo.warm,
      values,
      `mood-${result.primaryMood}`
    );

    const neutralScenes = [
      '익숙한 길을 천천히 걸으며 주변을 바라보는 장면이 떠올라요.',
      '잠깐 쉬면서 생각을 정리하는 순간과 잘 어울리는 느낌이에요.',
      '일상의 한 장면을 편하게 바라보는 듯한 느낌이 들어요.'
    ];

    const secondSentence = scenes.length
      ? scenes[createStablePhraseIndex(values, scenes.length, 'scene-final')]
      : pick(neutralScenes, values, 'scene-neutral');

    if (language === 'en') {
      const moodEn = {
        bright: 'It feels bright and light, like sunlight filling a room.',
        playful: 'It feels playful and lively, like light footsteps on a busy day.',
        ascending: 'It feels as if the view is gradually opening upward.',
        airy: 'It feels open and airy, like standing beside a breezy window.',
        warm: 'It feels warm and comfortable, like resting in a familiar place.',
        sparse: 'It feels quiet and spacious, like being alone in an uncluttered room.',
        dreamy: 'It feels dreamy, like a scene drifting through your mind before sleep.',
        moon: 'It feels calm and cool, like walking alone late at night.',
        deep: 'It feels deep and weighty, like being lost in thought at night.',
        layered: 'It feels full and layered, like several conversations sharing one space.'
      };
      return moodEn[result.primaryMood] || moodEn.warm;
    }

    return `${firstSentence} ${secondSentence}`;
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
        primaryMood: 'sparse',
        secondaryMood: 'airy',
        primaryScore: 0,
        secondaryScore: 0,
        energy: 0,
        tension: 0,
        brightness: 0.5,
        reasons: ['not-enough-notes'],
        visualState: createMoodVisualState({ primaryMood: 'sparse', secondaryMood: 'airy', mixedMood: true, energy: 0, tension: 0, brightness: 0.5 })
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
