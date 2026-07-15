import { Clock, Plus, Search, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import AddMealModal from '../components/AddMealModal';
import { useMeals } from '../store/MealContext';
import { Recipe } from '../types';

export default function RecipesPage() {
  const { recipes } = useMeals();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const categories = ['Todas', ...new Set(recipes.map((recipe) => recipe.category))];
  const filtered = useMemo(() => recipes.filter((recipe) => {
    const term = query.toLowerCase();
    const matchesText = recipe.name.toLowerCase().includes(term) || recipe.ingredients.some((item) => item.toLowerCase().includes(term));
    return matchesText && (category === 'Todas' || recipe.category === category);
  }), [recipes, query, category]);

  return (
    <div className="mx-auto max-w-6xl">
      <div><p className="font-semibold text-leaf-600">Biblioteca</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Encontra a próxima refeição</h1><p className="mt-2 text-stone-500">Pesquisa pelo nome da receita ou por um ingrediente.</p></div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-3.5 text-stone-400" size={20} /><input className="input pl-12" placeholder="Ex.: frango, aveia, salmão..." value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <p className="mt-6 text-sm font-semibold text-stone-500">{filtered.length} receita(s) encontrada(s)</p>
      <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => <article key={recipe.id} className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"><div className={`flex h-36 items-center justify-center bg-gradient-to-br ${recipe.imageColor}`}><Utensils size={45} className="text-white/80" /></div><div className="p-5"><div className="flex items-center justify-between"><span className="pill bg-leaf-50 text-leaf-700">{recipe.category}</span><span className="flex items-center gap-1 text-xs font-semibold text-stone-400"><Clock size={14} />{recipe.prepMinutes} min</span></div><h2 className="mt-4 text-lg font-bold">{recipe.name}</h2><p className="mt-2 min-h-10 text-sm leading-relaxed text-stone-500">{recipe.description}</p><div className="mt-5 grid grid-cols-4 gap-2 text-center"><Macro value={recipe.calories} label="kcal" /><Macro value={recipe.protein} label="prot." /><Macro value={recipe.carbs} label="hidr." /><Macro value={recipe.fat} label="gord." /></div><button onClick={() => setSelected(recipe)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700"><Plus size={18} /> Registar</button></div></article>)}
      </section>
      {selected && <AddMealModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Macro({ value, label }: { value: number; label: string }) { return <div className="rounded-xl bg-white/5 px-1 py-2"><p className="text-sm font-bold">{value}</p><p className="text-[10px] uppercase text-stone-400">{label}</p></div>; }
