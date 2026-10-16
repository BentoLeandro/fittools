/* ============================================================
   FITTOOLS — MOTOR CIENTÍFICO E FÓRMULAS
   ============================================================ */
(function () {
  const S = {};
  const r = (n, d = 0) => { const f = Math.pow(10, d); return Math.round(n * f) / f; };
  S.round = r;

  /* 1. IMC — Organização Mundial da Saúde */
  S.bmi = (kg, cm) => kg / Math.pow(cm / 100, 2);
  S.bmiClass = (b) => {
    if (b < 18.5) return { label: 'Abaixo do peso', tone: 'warn' };
    if (b < 25)   return { label: 'Peso normal', tone: 'good' };
    if (b < 30)   return { label: 'Sobrepeso', tone: 'warn' };
    if (b < 35)   return { label: 'Obesidade grau I', tone: 'bad' };
    if (b < 40)   return { label: 'Obesidade grau II', tone: 'bad' };
    return { label: 'Obesidade grau III', tone: 'bad' };
  };

  /* 2. TMB — Mifflin-St Jeor (1990) */
  S.bmr = (sex, kg, cm, age) =>
    sex === 'male'
      ? 10 * kg + 6.25 * cm - 5 * age + 5
      : 10 * kg + 6.25 * cm - 5 * age - 161;

  S.tdee = (bmr, factor) => bmr * factor;

  /* 3. Proteína — Posição Oficial da ISSN (2017) */
  S.proteinRange = (kg, goal) => {
    const map = {
      maintenance: [1.4, 1.8],
      hypertrophy: [1.6, 2.2],
      fatloss:     [1.8, 2.4],
      endurance:   [1.2, 1.6]
    };
    const [a, b] = map[goal] || map.maintenance;
    return { min: kg * a, max: kg * b, perKgMin: a, perKgMax: b };
  };

  /* 4. % Gordura — Método US Navy (Hodgdon & Beckett, 1984) */
  S.bodyFatNavy = (sex, cm, neck, waist, hip) => {
    const L = Math.log10;
    if (sex === 'male') {
      if (waist - neck <= 0) return NaN;
      return 495 / (1.0324 - 0.19077 * L(waist - neck) + 0.15456 * L(cm)) - 450;
    }
    if (waist + hip - neck <= 0) return NaN;
    return 495 / (1.29579 - 0.35004 * L(waist + hip - neck) + 0.22100 * L(cm)) - 450;
  };
  S.bodyFatClass = (bf, sex) => {
    const t = sex === 'male' ? [6, 14, 18, 25] : [14, 21, 25, 32];
    if (bf < t[0]) return { label: 'Muito baixo (atenção)', tone: 'warn' };
    if (bf < t[1]) return { label: 'Atlético', tone: 'good' };
    if (bf < t[2]) return { label: 'Bom / fitness', tone: 'good' };
    if (bf < t[3]) return { label: 'Médio', tone: 'warn' };
    return { label: 'Acima do recomendado', tone: 'bad' };
  };

  /* 5. 1RM — Brzycki (1993) e Epley (1985) */
  S.oneRM = (weight, reps) => {
    if (reps <= 1) return weight;
    if (reps <= 10) return weight * (36 / (37 - reps));
    return weight * (1 + reps / 30);
  };
  S.rmTable = (rm) => [100, 95, 90, 85, 80, 75, 70, 65, 60].map(p => ({
    pct: p,
    load: rm * p / 100,
    reps: { 100:'1', 95:'2', 90:'4', 85:'6', 80:'8', 75:'10', 70:'12', 65:'15', 60:'18' }[p]
  }));

  /* 6. FC Máxima — Tanaka (2001) / Zonas — Karvonen (1957) */
  S.maxHR = (age) => 208 - 0.7 * age;
  S.karvonen = (max, rest, pct) => (max - rest) * pct + rest;
  S.hrZones = (age, rest) => {
    const max = S.maxHR(age);
    const z = [
      ['Z1 — Recuperação', .50, .60, 'info'],
      ['Z2 — Base aeróbica', .60, .70, 'good'],
      ['Z3 — Aeróbico', .70, .80, 'good'],
      ['Z4 — Limiar', .80, .90, 'warn'],
      ['Z5 — Máximo', .90, 1.0, 'bad']
    ];
    return {
      max,
      zones: z.map(([n, a, b, t]) => ({
        name: n,
        tone: t,
        min: Math.round(S.karvonen(max, rest, a)),
        max: Math.round(S.karvonen(max, rest, b))
      }))
    };
  };

  /* 7. Hidratação — Base 35ml/kg + Reposição de Exercício (ACSM, 2007) */
  S.water = (kg, minutes) => ({
    base: kg * 35,
    exercise: (minutes / 60) * 700,
    total: kg * 35 + (minutes / 60) * 700
  });

  /* 8. Pace e Projeções de Corrida — Riegel (1981) */
  S.pace = (km, totalMin) => totalMin / km;
  S.fmtPace = (min) => {
    const m = Math.floor(min), s = Math.round((min - m) * 60);
    return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`;
  };
  S.fmtTime = (min) => {
    const h = Math.floor(min / 60), m = Math.floor(min % 60), s = Math.round((min % 1) * 60);
    return (h ? h + 'h ' : '') + m + 'min ' + String(s).padStart(2, '0') + 's';
  };
  S.riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);

  /* Citações Acadêmicas Oficiais */
  S.refs = {
    bmi: 'World Health Organization. <b>Obesity: preventing and managing the global epidemic.</b> WHO Technical Report Series 894, 2000.',
    mifflin: 'Mifflin MD, St Jeor ST, Hill LA, et al. <b>A new predictive equation for resting energy expenditure in healthy individuals.</b> The American Journal of Clinical Nutrition, 1990;51(2):241-247.',
    issn: 'Jäger R, Kerksick CM, Campbell BI, et al. <b>International Society of Sports Nutrition Position Stand: protein and exercise.</b> Journal of the International Society of Sports Nutrition, 2017;14:20.',
    helms: 'Helms ER, Zinn C, Rowlands DS, Brown SR. <b>A systematic review of dietary protein during caloric restriction in resistance trained lean athletes.</b> International Journal of Sport Nutrition and Exercise Metabolism, 2014;24(2):127-138.',
    navy: 'Hodgdon JA, Beckett MB. <b>Prediction of percent body fat for U.S. Navy men and women from body circumferences and height.</b> Naval Health Research Center, Report No. 84-29, 1984.',
    brzycki: 'Brzycki M. <b>Strength testing: predicting a one-rep max from reps-to-fatigue.</b> Journal of Physical Education, Recreation & Dance, 1993;64(1):88-90.',
    epley: 'Epley B. <b>Poundage chart.</b> Boyd Epley Workout. Lincoln, NE: Body Enterprises, 1985.',
    tanaka: 'Tanaka H, Monahan KD, Seals DR. <b>Age-predicted maximal heart rate revisited.</b> Journal of the American College of Cardiology, 2001;37(1):153-156.',
    karvonen: 'Karvonen MJ, Kentala E, Mustala O. <b>The effects of training on heart rate: a longitudinal study.</b> Annales Medicinae Experimentalis et Biologiae Fenniae, 1957;35(3):307-315.',
    acsm: 'Sawka MN, Burke LM, Eichner ER, et al. <b>American College of Sports Medicine position stand: exercise and fluid replacement.</b> Medicine & Science in Sports & Exercise, 2007;39(2):377-390.',
    riegel: 'Riegel PS. <b>Athletic records and human endurance.</b> American Scientist, 1981;69(3):285-290.',
    tabata: 'Tabata I, Nishimura K, Kouzaki M, et al. <b>Effects of moderate-intensity endurance and high-intensity intermittent training on anaerobic capacity and VO2max.</b> Medicine & Science in Sports & Exercise, 1996;28(10):1327-1330.',
    schoenfeld: 'Schoenfeld BJ, Ogborn D, Krieger JW. <b>Dose-response relationship between weekly resistance training volume and increases in muscle mass.</b> Journal of Sports Sciences, 2017;35(11):1073-1082.'
  };

  window.FitScience = S;
})();
