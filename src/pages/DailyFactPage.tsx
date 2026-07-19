import { BookOpen, Lightbulb, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocalDate, nutritionDay } from '../lib/nutrition-day';
import { useMeals } from '../store/MealContext';
import { neonClient } from '../lib/auth';

type Fact = { title: string; body: string; takeaway: string };
type FactView = { fact_id: string; seen_on: string };
const factsPt: Fact[] = [
  { title: 'O que é um défice calórico?', body: 'Existe défice calórico quando, ao longo do tempo, consumes menos energia do que a que o teu corpo utiliza. É esse balanço energético que permite a perda de peso.', takeaway: 'Pequenas escolhas consistentes contam mais do que um dia “perfeito”.' },
  { title: 'A proteína não serve só para quem treina', body: 'A proteína contribui para a manutenção da massa muscular e também tende a aumentar a saciedade. Distribuí-la pelas refeições pode tornar o plano mais fácil de manter.', takeaway: 'Experimenta incluir uma fonte de proteína em cada refeição principal.' },
  { title: 'Hidratos não são inimigos', body: 'Os hidratos são uma fonte importante de energia, especialmente para o cérebro e para o treino. A quantidade adequada depende do teu objetivo, atividade e preferências.', takeaway: 'O contexto e a quantidade importam mais do que eliminar grupos alimentares.' },
  { title: 'O peso pode variar de um dia para o outro', body: 'Água, sal, hidratos, digestão e ciclo hormonal podem alterar o peso na balança sem significarem uma alteração de gordura corporal.', takeaway: 'Olha para a tendência de várias semanas, não apenas para um único valor.' },
  { title: 'Planeamento reduz decisões', body: 'Ter algumas refeições planeadas diminui a necessidade de decidir o que comer quando tens menos tempo ou energia.', takeaway: 'Não precisas de planear tudo: começar por uma refeição por dia já ajuda.' },
  { title: 'Fibra também conta', body: 'A fibra, presente em alimentos como legumes, fruta, aveia e leguminosas, apoia a saciedade e o funcionamento intestinal.', takeaway: 'Aumenta a fibra gradualmente e acompanha com água suficiente.' },
  { title: 'Dormir também influencia a alimentação', body: 'Pouco sono pode tornar mais difícil regular a fome, a saciedade e as escolhas alimentares no dia seguinte.', takeaway: 'Nutrição, descanso e movimento funcionam melhor em conjunto.' },
];
const factsEn: Fact[] = [
  { title: 'What is a calorie deficit?', body: 'A calorie deficit happens when, over time, you consume less energy than your body uses. This energy balance is what enables weight loss.', takeaway: 'Small, consistent choices matter more than one “perfect” day.' },
  { title: 'Protein is not only for training', body: 'Protein supports muscle maintenance and can also help with fullness. Spreading it across meals can make a plan easier to sustain.', takeaway: 'Try to include a protein source at each main meal.' },
  { title: 'Carbs are not the enemy', body: 'Carbohydrates are an important energy source, particularly for your brain and exercise. The right amount depends on your goal, activity and preferences.', takeaway: 'Context and quantity matter more than removing whole food groups.' },
  { title: 'Weight can fluctuate from day to day', body: 'Water, salt, carbohydrates, digestion and hormonal cycles can change the number on the scale without representing a change in body fat.', takeaway: 'Look at trends over several weeks, not a single number.' },
  { title: 'Planning reduces decisions', body: 'Having a few meals planned reduces the need to decide what to eat when you have less time or energy.', takeaway: 'You do not need to plan everything: one meal a day is a useful start.' },
  { title: 'Fibre matters too', body: 'Fibre from foods such as vegetables, fruit, oats and legumes supports fullness and digestive health.', takeaway: 'Increase fibre gradually and pair it with enough water.' },
  { title: 'Sleep also affects eating', body: 'Too little sleep can make it harder to regulate hunger, fullness and food choices the next day.', takeaway: 'Nutrition, rest and movement work best together.' },
];
const dayIndex = (day: string, length: number) => [...day].reduce((total, character) => total + character.charCodeAt(0), 0) % length;

export default function DailyFactPage() {
  const { t, i18n } = useTranslation();
  const { entries, goals, profile } = useMeals();
  const [day, setDay] = useState(() => nutritionDay());
  const [views, setViews] = useState<FactView[]>([]);
  const [isViewsLoaded, setIsViewsLoaded] = useState(false);
  useEffect(() => {
    let timeout: number;
    let active = true;
    const scheduleNextFact = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      timeout = window.setTimeout(() => { if (!active) return; setDay(nutritionDay()); scheduleNextFact(); }, next.getTime() - now.getTime() + 50);
    };
    scheduleNextFact();
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);
  useEffect(() => {
    if (!neonClient) return;
    let active = true;
    neonClient.from('daily_fact_views').select('fact_id, seen_on').eq('user_id', profile.userId).then(({ data }) => {
      if (!active) return;
      setViews((data ?? []) as FactView[]);
      setIsViewsLoaded(true);
    });
    return () => { active = false; };
  }, [profile.userId]);
  const previous = new Date(`${day}T12:00:00`); previous.setDate(previous.getDate() - 1);
  const previousDay = formatLocalDate(previous);
  const previousProtein = entries.filter((entry) => entry.isConsumed && entry.date === previousDay).reduce((sum, entry) => sum + entry.protein, 0);
  const hasLowProtein = previousProtein > 0 && previousProtein < goals.protein * 0.8;
  const factEntries = (i18n.language.startsWith('en') ? factsEn : factsPt).map((item, index) => ({ ...item, id: `fact-${index}` }));
  const factShownToday = views.find((view) => view.seen_on === day);
  const unreadFacts = factEntries.filter((item) => !views.some((view) => view.fact_id === item.id));
  const selectedFact = (factShownToday ? factEntries.find((item) => item.id === factShownToday.fact_id) : (unreadFacts.length ? unreadFacts[dayIndex(day, unreadFacts.length)] : factEntries[dayIndex(day, factEntries.length)])) ?? factEntries[0];
  const fact = hasLowProtein ? {
    title: t('Ontem ficaste abaixo da tua meta de proteína'),
    body: t('A proteína contribui para a manutenção e recuperação muscular, além de ajudar na saciedade. Uma distribuição mais equilibrada pelas refeições pode tornar a meta mais fácil de atingir.'),
    takeaway: t('Hoje, tenta incluir uma fonte de proteína em cada refeição principal.'),
  } : selectedFact;
  useEffect(() => {
    if (!neonClient || !isViewsLoaded || hasLowProtein || !selectedFact || factShownToday) return;
    neonClient.from('daily_fact_views').upsert({ user_id: profile.userId, fact_id: selectedFact.id, seen_on: day }, { onConflict: 'user_id,fact_id' }).then(({ error }) => {
      if (!error) setViews((current) => [...current.filter((view) => view.fact_id !== selectedFact.id), { fact_id: selectedFact.id, seen_on: day }]);
    });
  }, [day, factShownToday, hasLowProtein, isViewsLoaded, profile.userId, selectedFact]);
  const formattedDay = new Date(`${day}T12:00:00`).toLocaleDateString(i18n.language.startsWith('en') ? 'en-GB' : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  return <div className="mx-auto max-w-3xl"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300"><Lightbulb size={28} /></div><p className="mt-5 font-semibold text-leaf-600">{t('Aprender')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Sabias que…?')}</h1><p className="mt-2 text-stone-400">{hasLowProtein ? t('Uma dica baseada no teu dia anterior.') : t('Uma curiosidade de nutrição por dia.')}</p></div><article className="card mt-8 overflow-hidden"><div className="border-b border-amber-300/15 bg-amber-400/10 p-6"><div className="flex items-center gap-3 text-amber-200"><Sparkles size={20} /><p className="text-sm font-bold capitalize">{formattedDay}</p></div><h2 className="mt-4 text-2xl font-extrabold">{fact.title}</h2></div><div className="p-6 sm:p-8"><p className="text-lg leading-relaxed text-stone-200">{fact.body}</p><div className="mt-7 flex gap-3 rounded-2xl bg-leaf-500/10 p-5"><BookOpen className="mt-0.5 shrink-0 text-leaf-600" size={21} /><div><p className="font-bold text-leaf-600">{t('Em resumo')}</p><p className="mt-1 text-sm leading-relaxed text-stone-300">{fact.takeaway}</p></div></div></div></article></div>;
}
