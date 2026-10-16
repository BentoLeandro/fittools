/* ============================================================
   FITTOOLS — REGISTRO DE FORMULÁRIOS E OFERTAS
   ============================================================ */
(function () {
  const S = window.FitScience;
  const C = window.FIT_CONFIG;
  const money = (k) => (C.affiliates[k] || '#');

  const ACTIVITY = [
    { v: '1.2',   l: 'Sedentário — pouco ou nenhum exercício' },
    { v: '1.375', l: 'Leve — 1 a 3 treinos por semana' },
    { v: '1.55',  l: 'Moderado — 3 a 5 treinos por semana' },
    { v: '1.725', l: 'Intenso — 6 a 7 treinos por semana' },
    { v: '1.9',   l: 'Muito intenso — trabalho físico + treino pesado' }
  ];
  const SEX = [{ v: 'male', l: 'Masculino' }, { v: 'female', l: 'Feminino' }];

  window.FitCalculators = {

    /* 1. IMC */
    imc: {
      button: 'Calcular meu IMC',
      fields: [
        { n: 'kg', l: 'Peso', t: 'number', unit: 'kg', ph: '75', min: 25, max: 350, step: '0.1' },
        { n: 'cm', l: 'Altura', t: 'number', unit: 'cm', ph: '175', min: 100, max: 250 }
      ],
      compute(v) {
        const b = S.bmi(v.kg, v.cm), c = S.bmiClass(b);
        const ideal = { min: 18.5 * Math.pow(v.cm / 100, 2), max: 24.9 * Math.pow(v.cm / 100, 2) };
        return {
          headline: { label: 'Seu IMC', value: S.round(b, 1), status: c.label, tone: c.tone },
          cards: [
            { l: 'Faixa de peso saudável', v: `${S.round(ideal.min, 1)}–${S.round(ideal.max, 1)}`, u: 'kg' },
            { l: 'Diferença para a faixa', v: b > 24.9 ? '+' + S.round(v.kg - ideal.max, 1) : (b < 18.5 ? '-' + S.round(ideal.min - v.kg, 1) : '0'), u: 'kg' }
          ],
          note: 'O IMC não distingue massa muscular de gordura. Use junto com a calculadora de percentual de gordura.',
          offer: { title: 'Descubra sua composição real', text: 'Calcule seu percentual de gordura com a fórmula oficial da Marinha dos EUA.', cta: 'Calcular % de gordura', href: '/calculadora-de-gordura-corporal' },
          aff: { em: '⚖️', title: 'Balança de Alta Precisão', text: 'Para acompanhar peso e composição corporal em casa.', href: money('balanca') }
        };
      }
    },

    /* 2. CALORIAS & TMB */
    calorias: {
      button: 'Calcular minhas calorias',
      fields: [
        { n: 'sex', l: 'Sexo biológico', t: 'select', o: SEX },
        { n: 'age', l: 'Idade', t: 'number', unit: 'anos', ph: '28', min: 14, max: 100 },
        { n: 'kg', l: 'Peso', t: 'number', unit: 'kg', ph: '75', min: 30, max: 300, step: '0.1' },
        { n: 'cm', l: 'Altura', t: 'number', unit: 'cm', ph: '175', min: 120, max: 230 },
        { n: 'act', l: 'Nível de atividade', t: 'select', o: ACTIVITY, full: true, def: '1.55' }
      ],
      compute(v) {
        const bmr = S.bmr(v.sex, v.kg, v.cm, v.age);
        const tdee = S.tdee(bmr, parseFloat(v.act));
        return {
          headline: { label: 'Gasto calórico diário estimado', value: S.round(tdee), unit: 'kcal', status: 'Manutenção de peso', tone: 'good' },
          cards: [
            { l: 'TMB (repouso)', v: S.round(bmr), u: 'kcal', tone: 'info' },
            { l: 'Déficit moderado', v: S.round(tdee - 500), u: 'kcal', tone: 'good' },
            { l: 'Superávit leve', v: S.round(tdee + 300), u: 'kcal', tone: 'info' },
            { l: 'Proteína sugerida', v: S.round(v.kg * 1.8), u: 'g', tone: 'info' }
          ],
          note: 'Um déficit de 500 kcal/dia equivale a ~0,4 kg de perda por semana. Ajuste conforme sua evolução de 2 a 3 semanas.',
          offer: { title: 'Transforme esse número em um plano', text: 'Protocolo completo com divisão de treino e planejamento de macronutrientes.', cta: `Ver protocolo — ${C.prices.ebook}`, href: C.checkout.ebook },
          aff: { em: '🥤', title: 'Bater proteína é o mais difícil', text: 'Opções de whey protein com o melhor custo por dose.', href: money('whey') }
        };
      }
    },

    /* 3. PROTEÍNA */
    proteina: {
      button: 'Calcular minha proteína',
      fields: [
        { n: 'kg', l: 'Peso corporal', t: 'number', unit: 'kg', ph: '75', min: 30, max: 300, step: '0.1' },
        { n: 'goal', l: 'Objetivo principal', t: 'select', o: [
          { v: 'hypertrophy', l: 'Ganho de massa muscular (Hipertrofia)' },
          { v: 'fatloss', l: 'Emagrecimento (Preservar músculo)' },
          { v: 'maintenance', l: 'Manutenção e saúde' },
          { v: 'endurance', l: 'Endurance e corrida' }
        ] }
      ],
      compute(v) {
        const p = S.proteinRange(v.kg, v.goal);
        const mid = (p.min + p.max) / 2;
        return {
          headline: { label: 'Sua meta diária de proteína', value: `${S.round(p.min)}–${S.round(p.max)}`, unit: 'g', status: `${p.perKgMin}–${p.perKgMax} g por kg`, tone: 'good' },
          cards: [
            { l: 'Alvo prático', v: S.round(mid), u: 'g/dia' },
            { l: 'Por refeição (4x)', v: S.round(mid / 4), u: 'g' },
            { l: 'Equivalente em frango', v: S.round(mid / 0.31), u: 'g cru' },
            { l: 'Equivalente em ovos', v: S.round(mid / 6.3), u: 'un' }
          ],
          note: 'Distribua a ingestão em 3 a 5 refeições ao longo do dia para manter a síntese proteica elevada.',
          offer: { title: 'Cardápios prontos por faixa calórica', text: 'Combinações de refeições fáceis para bater sua meta sem complicação.', cta: `Ver protocolo — ${C.prices.ebook}`, href: C.checkout.ebook },
          aff: { em: '🥤', title: 'Suplementação Estratégica', text: 'Whey concentrado e isolado com laudos aprovados.', href: money('whey') }
        };
      }
    },

    /* 4. PERCENTUAL DE GORDURA */
    gordura: {
      button: 'Calcular meu percentual de gordura',
      fields: [
        { n: 'sex', l: 'Sexo biológico', t: 'select', o: SEX },
        { n: 'cm', l: 'Altura', t: 'number', unit: 'cm', ph: '175', min: 120, max: 230 },
        { n: 'neck', l: 'Pescoço', t: 'number', unit: 'cm', ph: '38', min: 20, max: 70, step: '0.5', help: 'Abaixo da laringe, fita levemente inclinada.' },
        { n: 'waist', l: 'Cintura', t: 'number', unit: 'cm', ph: '84', min: 40, max: 200, step: '0.5', help: 'Na linha horizontal do umbigo.' },
        { n: 'hip', l: 'Quadril (Mulheres)', t: 'number', unit: 'cm', ph: '96', min: 50, max: 200, step: '0.5', showIf: (v) => v.sex === 'female', help: 'Maior circunferência dos glúteos.' },
        { n: 'kg', l: 'Peso (opcional)', t: 'number', unit: 'kg', ph: '75', min: 30, max: 300, step: '0.1', required: false }
      ],
      compute(v) {
        const bf = S.bodyFatNavy(v.sex, v.cm, v.neck, v.waist, v.hip || 0);
        if (isNaN(bf) || !isFinite(bf) || bf <= 0) {
          return { error: 'Medidas inválidas. Confira se a cintura é maior que o pescoço e se as medidas estão em centímetros.' };
        }
        const c = S.bodyFatClass(bf, v.sex);
        const cards = [{ l: 'Classificação', v: c.label, u: '', tone: c.tone }];
        if (v.kg) {
          cards.push({ l: 'Massa gorda', v: S.round(v.kg * bf / 100, 1), u: 'kg', tone: 'warn' });
          cards.push({ l: 'Massa magra', v: S.round(v.kg * (1 - bf / 100), 1), u: 'kg', tone: 'good' });
        }
        return {
          headline: { label: 'Percentual de gordura estimado', value: S.round(bf, 1), unit: '%', status: c.label, tone: c.tone },
          cards,
          note: 'Método antropométrico oficial da Marinha dos EUA. Meça sempre em jejum pela manhã.',
          offer: { title: 'Reduza gordura mantendo músculos', text: 'Protocolo de treinamento resistido com déficit calórico controlado.', cta: `Ver protocolo — ${C.prices.ebook}`, href: C.checkout.ebook },
          aff: { em: '📏', title: 'Fita Métrica Retrátil', text: 'Fita ergonômica com trava para medição precisa.', href: money('fitaMetrica') }
        };
      }
    },

    /* 5. 1RM */
    rm: {
      button: 'Calcular meu 1RM',
      fields: [
        { n: 'w', l: 'Carga levantada', t: 'number', unit: 'kg', ph: '80', min: 1, max: 600, step: '0.5' },
        { n: 'reps', l: 'Repetições até a falha', t: 'number', unit: 'reps', ph: '8', min: 1, max: 20, help: 'Mais preciso entre 1 e 10 repetições.' }
      ],
      compute(v) {
        const rm = S.oneRM(v.w, v.reps);
        const t = S.rmTable(rm);
        return {
          headline: { label: '1RM estimado', value: S.round(rm, 1), unit: 'kg', status: v.reps <= 10 ? 'Fórmula de Brzycki' : 'Fórmula de Epley', tone: 'good' },
          cards: [
            { l: 'Força (85%)', v: S.round(t[3].load, 1), u: 'kg ≈ 6 reps' },
            { l: 'Hipertrofia (75%)', v: S.round(t[5].load, 1), u: 'kg ≈ 10 reps' },
            { l: 'Resistência (65%)', v: S.round(t[7].load, 1), u: 'kg ≈ 15 reps' },
            { l: 'Aquecimento (60%)', v: S.round(t[8].load, 1), u: 'kg' }
          ],
          table: { head: ['% do 1RM', 'Carga', 'Reps Estimadas'], rows: t.map(x => [x.pct + '%', S.round(x.load, 1) + ' kg', '~' + x.reps]) },
          note: 'Estimativa para exercícios multiarticulares. Nunca teste 1RM máxima sem auxílio de um parceiro de treino.',
          offer: { title: 'Acompanhe suas cargas na Arena', text: 'Registre seus treinos e desbloqueie novas conquistas.', cta: 'Abrir a Arena', href: '/arena' },
          aff: { em: '🎽', title: 'Cinto de Levantamento', text: 'Proteção intra-abdominal para agachamento e levantamento terra.', href: money('cinto') }
        };
      }
    },

    /* 6. FREQUÊNCIA CARDÍACA */
    fc: {
      button: 'Calcular minhas zonas',
      fields: [
        { n: 'age', l: 'Idade', t: 'number', unit: 'anos', ph: '30', min: 14, max: 100 },
        { n: 'rest', l: 'FC de repouso', t: 'number', unit: 'bpm', ph: '60', min: 30, max: 110, help: 'Meça ao acordar por 60 segundos.' }
      ],
      compute(v) {
        const z = S.hrZones(v.age, v.rest);
        return {
          headline: { label: 'Frequência cardíaca máxima estimada', value: S.round(z.max), unit: 'bpm', status: 'Equação de Tanaka', tone: 'good' },
          cards: z.zones.map(x => ({ l: x.name, v: `${x.min}–${x.max}`, u: 'bpm', tone: x.tone })),
          note: 'Zonas calculadas pelo método Karvonen (FC de Reserva). A Zona 2 é a ideal para base aeróbica.',
          offer: { title: 'Treine no ritmo exato', text: 'Combine suas zonas com o cronômetro Tabata para treinos intervalados.', cta: 'Abrir cronômetro Tabata', href: '/cronometro-tabata' },
          aff: { em: '⌚', title: 'Smartwatch com Sensor Cardíaco', text: 'Para monitorar suas zonas de esforço em tempo real.', href: money('relogio') }
        };
      }
    },

    /* 7. HIDRATAÇÃO */
    agua: {
      button: 'Calcular minha hidratação',
      fields: [
        { n: 'kg', l: 'Peso corporal', t: 'number', unit: 'kg', ph: '75', min: 30, max: 300, step: '0.1' },
        { n: 'min', l: 'Minutos de treino por dia', t: 'number', unit: 'min', ph: '60', min: 0, max: 300, required: false }
      ],
      compute(v) {
        const w = S.water(v.kg, v.min || 0);
        return {
          headline: { label: 'Meta diária de água', value: (w.total / 1000).toFixed(1), unit: 'L', status: 'Base 35ml/kg + Reposição de Treino', tone: 'good' },
          cards: [
            { l: 'Consumo base', v: (w.base / 1000).toFixed(1), u: 'L' },
            { l: 'Reposição de suor', v: (w.exercise / 1000).toFixed(1), u: 'L', tone: 'info' },
            { l: 'Copos de 250 ml', v: Math.ceil(w.total / 250), u: 'copos' },
            { l: 'Garrafas de 500 ml', v: Math.ceil(w.total / 500), u: 'un' }
          ],
          note: 'Consumo adequado previne quedas de até 15% na força muscular por desidratação.',
          offer: { title: 'Transforme hidratação em hábito', text: 'Faça check-in diário na Arena e acumule cristais.', cta: 'Abrir a Arena', href: '/arena' },
          aff: { em: '💧', title: 'Garrafa Motivacional 2L', text: 'Com marcação de horários para facilitar a rotina.', href: money('garrafa') }
        };
      }
    },

    /* 8. PACE DE CORRIDA */
    pace: {
      button: 'Calcular meu pace',
      fields: [
        { n: 'km', l: 'Distância', t: 'number', unit: 'km', ph: '10', min: 0.4, max: 300, step: '0.01' },
        { n: 'h', l: 'Horas', t: 'number', unit: 'h', ph: '0', min: 0, max: 24, required: false },
        { n: 'm', l: 'Minutos', t: 'number', unit: 'min', ph: '50', min: 0, max: 59, required: false },
        { n: 's', l: 'Segundos', t: 'number', unit: 's', ph: '0', min: 0, max: 59, required: false }
      ],
      compute(v) {
        const total = (v.h || 0) * 60 + (v.m || 0) + (v.s || 0) / 60;
        if (!total) return { error: 'Informe o tempo total gasto na corrida.' };
        const p = S.pace(v.km, total);
        const pred = (d) => S.fmtTime(S.riegel(total, v.km, d));
        return {
          headline: { label: 'Seu pace médio', value: S.fmtPace(p), unit: 'min/km', status: `Velocidade média de ${S.round(60 / p, 1)} km/h`, tone: 'good' },
          cards: [
            { l: 'Projeção 5 km', v: pred(5), u: '' },
            { l: 'Projeção 10 km', v: pred(10), u: '' },
            { l: 'Projeção 21 km', v: pred(21.0975), u: '' },
            { l: 'Projeção 42 km', v: pred(42.195), u: '' }
          ],
          note: 'Projeções baseadas na equação de fadiga de Peter Riegel.',
          offer: { title: 'Combine corrida com musculação', text: 'Estruture sua semana de treinos para máxima performance.', cta: 'Gerador de Treino', href: '/gerador-de-treino' },
          aff: { em: '👟', title: 'Tênis com Placa de Carbono', text: 'Amortecimento e retorno de energia para provas.', href: money('tenisCorrida') }
        };
      }
    }
  };
})();