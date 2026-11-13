// Fórmulas científicas das 8 calculadoras do FitTools (Task 7.1).
// Migradas de assets/js/science.js (site antigo) para TypeScript.
//
// São funções PURAS: sem Vue, Nuxt, DOM, estado reativo ou efeitos colaterais. Por isso rodam
// em Node (Vitest) e podem ser movidas para um pacote compartilhado ou para o backend depois
// do MVP sem reescrever nem divergir resultados. `useScience()` apenas as expõe ao Vue.
//
// Convenção de unidades: kg, cm, anos, minutos, km, mL. Entradas inválidas NÃO são validadas
// aqui (as faixas plausíveis são checadas nos formulários, Requisito 1.9); onde o resultado
// seria indefinido, a função devolve NaN em vez de um número enganoso.

import type {
  BMIClassification,
  BodyFatClassification,
  HeartRateZones,
  ProteinGoal,
  ProteinRange,
  ReferenceKey,
  RMTableRow,
  ScientificReference,
  Sex,
  WaterIntake
} from '../types/calculators'

/** Arredonda `n` para `decimals` casas decimais (padrão: 0). */
export function round(n: number, decimals = 0): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/* ------------------------------------------------------------------ 1. IMC */

/**
 * IMC (Índice de Massa Corporal) = peso(kg) / altura(m)².
 * Referência: World Health Organization, Technical Report Series 894 (2000).
 */
export function computeBMI(weight_kg: number, height_cm: number): number {
  return weight_kg / Math.pow(height_cm / 100, 2)
}

/**
 * Classificação do IMC segundo a OMS: <18,5 abaixo do peso; <25 normal; <30 sobrepeso;
 * <35 obesidade I; <40 obesidade II; ≥40 obesidade III. Limites inferiores são inclusivos
 * (18,5 já é "Peso normal"). NaN cai em "Obesidade grau III": valide a entrada antes.
 */
export function classifyBMI(bmi: number): BMIClassification {
  if (bmi < 18.5) return { label: 'Abaixo do peso', tone: 'warn' }
  if (bmi < 25) return { label: 'Peso normal', tone: 'good' }
  if (bmi < 30) return { label: 'Sobrepeso', tone: 'warn' }
  if (bmi < 35) return { label: 'Obesidade grau I', tone: 'bad' }
  if (bmi < 40) return { label: 'Obesidade grau II', tone: 'bad' }
  return { label: 'Obesidade grau III', tone: 'bad' }
}

/* --------------------------------------------------------- 2. TMB / TDEE */

/**
 * TMB (taxa metabólica basal) pela equação de Mifflin-St Jeor (1990), em kcal/dia.
 *   Homem:  10·peso + 6,25·altura − 5·idade + 5
 *   Mulher: 10·peso + 6,25·altura − 5·idade − 161
 */
export function computeBMR(sex: Sex, weight_kg: number, height_cm: number, age: number): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** TDEE (gasto energético diário total) = TMB × fator de atividade (tipicamente 1,2 a 1,9). */
export function computeTDEE(bmr: number, activityFactor: number): number {
  return bmr * activityFactor
}

/* -------------------------------------------------------------- 3. Proteína */

/** g/kg por objetivo. ISSN (2017); déficit calórico: Helms et al. (2014). */
const PROTEIN_PER_KG: Record<ProteinGoal, readonly [number, number]> = {
  maintenance: [1.4, 1.8],
  hypertrophy: [1.6, 2.2],
  fatloss: [1.8, 2.4],
  endurance: [1.2, 1.6]
}

/**
 * Faixa diária de proteína (g) = peso × g/kg do objetivo.
 * Objetivo desconhecido (ex.: vindo da URL) usa a faixa de manutenção.
 * Referência: ISSN Position Stand on protein and exercise (2017).
 */
export function proteinRange(weight_kg: number, goal: ProteinGoal): ProteinRange {
  // hasOwn: um objetivo como "constructor" ou "toString" nao pode pegar membros herdados do Object.
  const [perKgMin, perKgMax] = Object.hasOwn(PROTEIN_PER_KG, goal) ? PROTEIN_PER_KG[goal] : PROTEIN_PER_KG.maintenance
  return { min: weight_kg * perKgMin, max: weight_kg * perKgMax, perKgMin, perKgMax }
}

/* ------------------------------------------------------ 4. % de gordura */

/**
 * % de gordura corporal pelo método US Navy (Hodgdon & Beckett, 1984). Medidas em cm.
 *   Homem:  495 / (1,0324 − 0,19077·log10(cintura − pescoço) + 0,15456·log10(altura)) − 450
 *   Mulher: 495 / (1,29579 − 0,35004·log10(cintura + quadril − pescoço) + 0,22100·log10(altura)) − 450
 * Devolve NaN quando o logaritmo é indefinido (cintura ≤ pescoço no homem; cintura + quadril ≤
 * pescoço na mulher) ou quando falta o quadril (mulher). O resultado pode sair fora de 0–100
 * para medidas incoerentes: valide as faixas antes de exibir.
 */
export function bodyFatNavy(
  sex: Sex,
  height_cm: number,
  neck_cm: number,
  waist_cm: number,
  hip_cm?: number
): number {
  const log = Math.log10
  if (sex === 'male') {
    if (waist_cm - neck_cm <= 0) return NaN
    return 495 / (1.0324 - 0.19077 * log(waist_cm - neck_cm) + 0.15456 * log(height_cm)) - 450
  }
  const hip = hip_cm ?? NaN
  if (waist_cm + hip - neck_cm <= 0) return NaN
  return 495 / (1.29579 - 0.35004 * log(waist_cm + hip - neck_cm) + 0.221 * log(height_cm)) - 450
}

/**
 * Classificação do % de gordura. Limites (homem / mulher): <6 / <14 muito baixo; <14 / <21
 * atlético; <18 / <25 bom; <25 / <32 médio; acima disso, acima do recomendado.
 * NaN cai em "Acima do recomendado": valide a entrada antes.
 */
export function classifyBodyFat(bodyFat: number, sex: Sex): BodyFatClassification {
  const [veryLow, athletic, good, average] = sex === 'male' ? [6, 14, 18, 25] : [14, 21, 25, 32]
  if (bodyFat < veryLow) return { label: 'Muito baixo (atenção)', tone: 'warn' }
  if (bodyFat < athletic) return { label: 'Atlético', tone: 'good' }
  if (bodyFat < good) return { label: 'Bom / fitness', tone: 'good' }
  if (bodyFat < average) return { label: 'Médio', tone: 'warn' }
  return { label: 'Acima do recomendado', tone: 'bad' }
}

/* ----------------------------------------------------------------- 5. 1RM */

/**
 * 1RM estimado a partir de uma carga submáxima.
 *   1 repetição ou menos: o próprio peso
 *   2 a 10 reps: Brzycki (1993)  peso × 36 / (37 − reps)
 *   11 ou mais:  Epley (1985)    peso × (1 + reps / 30)
 */
export function compute1RM(weight_kg: number, reps: number): number {
  if (reps <= 1) return weight_kg
  if (reps <= 10) return weight_kg * (36 / (37 - reps))
  return weight_kg * (1 + reps / 30)
}

const RM_PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60] as const
const RM_REPS: Record<(typeof RM_PERCENTAGES)[number], string> = {
  100: '1',
  95: '2',
  90: '4',
  85: '6',
  80: '8',
  75: '10',
  70: '12',
  65: '15',
  60: '18'
}

/** Tabela de cargas e repetições típicas por percentual do 1RM (100% a 60%). */
export function generate1RMTable(oneRM: number): RMTableRow[] {
  return RM_PERCENTAGES.map(pct => ({ pct, load: (oneRM * pct) / 100, reps: RM_REPS[pct] }))
}

/* ------------------------------------------------- 6. Frequência cardíaca */

/** FC máxima estimada: Tanaka, Monahan & Seals (2001) = 208 − 0,7 × idade. */
export function maxHeartRate(age: number): number {
  return 208 - 0.7 * age
}

/** FC alvo pelo método de Karvonen (1957) = (FCmáx − FCrepouso) × intensidade + FCrepouso. */
export function karvonen(maxHR: number, restingHR: number, intensity: number): number {
  return (maxHR - restingHR) * intensity + restingHR
}

const HR_ZONES = [
  { name: 'Z1 — Recuperação', from: 0.5, to: 0.6, tone: 'info' },
  { name: 'Z2 — Base aeróbica', from: 0.6, to: 0.7, tone: 'good' },
  { name: 'Z3 — Aeróbico', from: 0.7, to: 0.8, tone: 'good' },
  { name: 'Z4 — Limiar', from: 0.8, to: 0.9, tone: 'warn' },
  { name: 'Z5 — Máximo', from: 0.9, to: 1.0, tone: 'bad' }
] as const

/** As 5 zonas de treino (bpm arredondados) a partir da idade e da FC de repouso. */
export function hrZones(age: number, restingHR: number): HeartRateZones {
  const max = maxHeartRate(age)
  return {
    max,
    zones: HR_ZONES.map(z => ({
      name: z.name,
      tone: z.tone,
      min: Math.round(karvonen(max, restingHR, z.from)),
      max: Math.round(karvonen(max, restingHR, z.to))
    }))
  }
}

/* ------------------------------------------------------------ 7. Hidratação */

/**
 * Ingestão diária de água em mL: base de 35 mL/kg + reposição de exercício de 700 mL por hora
 * (ACSM, 2007).
 */
export function waterIntake(weight_kg: number, exerciseMinutes: number): WaterIntake {
  const base = weight_kg * 35
  const exercise = (exerciseMinutes / 60) * 700
  return { base, exercise, total: base + exercise }
}

/* ------------------------------------------------------------------ 8. Pace */

/** Pace em min/km = tempo total (min) / distância (km). */
export function pace(distance_km: number, totalMinutes: number): number {
  return totalMinutes / distance_km
}

/**
 * Projeção de tempo para outra distância (Riegel, 1981): t2 = t1 × (d2 / d1)^1,06.
 * `t1` em minutos; `d1` e `d2` na mesma unidade. Devolve minutos.
 */
export function riegelProjection(t1: number, d1: number, d2: number): number {
  return t1 * Math.pow(d2 / d1, 1.06)
}

/**
 * Formata um pace (min/km) como "m:ss". Arredonda os SEGUNDOS TOTAIS, então 4,999 min vira
 * "5:00". (O science.js original devolvia "4:00" nesse caso: bug corrigido nesta migração.)
 * Valor inválido (NaN, infinito ou negativo) devolve "--:--".
 */
export function formatPace(minutesPerKm: number): string {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm < 0) return '--:--'
  const totalSeconds = Math.round(minutesPerKm * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Formata uma duração em minutos como "1h 05min 07s" (horas só quando houver). Arredonda os
 * segundos totais, então 12,999 min vira "13min 00s". (O original devolvia "12min 60s".)
 * Valor inválido devolve "--".
 */
export function formatTime(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '--'
  const totalSeconds = Math.round(totalMinutes * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours ? `${hours}h ` : ''}${minutes}min ${String(seconds).padStart(2, '0')}s`
}

/* ------------------------------------------------- Referências científicas */

/** Citações usadas nas páginas (mesmo texto do science.js, agora estruturado e sem HTML). */
export const SCIENCE_REFERENCES: Readonly<Record<ReferenceKey, ScientificReference>> = {
  bmi: {
    authors: 'World Health Organization.',
    title: 'Obesity: preventing and managing the global epidemic.',
    source: 'WHO Technical Report Series 894, 2000.'
  },
  mifflin: {
    authors: 'Mifflin MD, St Jeor ST, Hill LA, et al.',
    title: 'A new predictive equation for resting energy expenditure in healthy individuals.',
    source: 'The American Journal of Clinical Nutrition, 1990;51(2):241-247.'
  },
  issn: {
    authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
    title: 'International Society of Sports Nutrition Position Stand: protein and exercise.',
    source: 'Journal of the International Society of Sports Nutrition, 2017;14:20.'
  },
  helms: {
    authors: 'Helms ER, Zinn C, Rowlands DS, Brown SR.',
    title:
      'A systematic review of dietary protein during caloric restriction in resistance trained lean athletes.',
    source: 'International Journal of Sport Nutrition and Exercise Metabolism, 2014;24(2):127-138.'
  },
  navy: {
    authors: 'Hodgdon JA, Beckett MB.',
    title: 'Prediction of percent body fat for U.S. Navy men and women from body circumferences and height.',
    source: 'Naval Health Research Center, Report No. 84-29, 1984.'
  },
  brzycki: {
    authors: 'Brzycki M.',
    title: 'Strength testing: predicting a one-rep max from reps-to-fatigue.',
    source: 'Journal of Physical Education, Recreation & Dance, 1993;64(1):88-90.'
  },
  epley: {
    authors: 'Epley B.',
    title: 'Poundage chart.',
    source: 'Boyd Epley Workout. Lincoln, NE: Body Enterprises, 1985.'
  },
  tanaka: {
    authors: 'Tanaka H, Monahan KD, Seals DR.',
    title: 'Age-predicted maximal heart rate revisited.',
    source: 'Journal of the American College of Cardiology, 2001;37(1):153-156.'
  },
  karvonen: {
    authors: 'Karvonen MJ, Kentala E, Mustala O.',
    title: 'The effects of training on heart rate: a longitudinal study.',
    source: 'Annales Medicinae Experimentalis et Biologiae Fenniae, 1957;35(3):307-315.'
  },
  acsm: {
    authors: 'Sawka MN, Burke LM, Eichner ER, et al.',
    title: 'American College of Sports Medicine position stand: exercise and fluid replacement.',
    source: 'Medicine & Science in Sports & Exercise, 2007;39(2):377-390.'
  },
  riegel: {
    authors: 'Riegel PS.',
    title: 'Athletic records and human endurance.',
    source: 'American Scientist, 1981;69(3):285-290.'
  },
  tabata: {
    authors: 'Tabata I, Nishimura K, Kouzaki M, et al.',
    title:
      'Effects of moderate-intensity endurance and high-intensity intermittent training on anaerobic capacity and VO2max.',
    source: 'Medicine & Science in Sports & Exercise, 1996;28(10):1327-1330.'
  },
  schoenfeld: {
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW.',
    title:
      'Dose-response relationship between weekly resistance training volume and increases in muscle mass.',
    source: 'Journal of Sports Sciences, 2017;35(11):1073-1082.'
  }
}

/** Tudo reunido num objeto imutável: `useScience()` não cria estado, só entrega as funções. */
const science = Object.freeze({
  round,
  computeBMI,
  classifyBMI,
  computeBMR,
  computeTDEE,
  proteinRange,
  bodyFatNavy,
  classifyBodyFat,
  compute1RM,
  generate1RMTable,
  maxHeartRate,
  karvonen,
  hrZones,
  waterIntake,
  pace,
  riegelProjection,
  formatPace,
  formatTime,
  references: SCIENCE_REFERENCES
})

/** Composable que expõe as fórmulas ao Vue. Seguro em SSR/SSG (nenhum estado compartilhado). */
export function useScience() {
  return science
}