import { Clock, Eye, Loader2, Pencil, Plus, Search, Trash2, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AddMealModal from '../components/AddMealModal';
import { useMeals } from '../store/MealContext';
import { Recipe } from '../types';
import { useTranslation } from 'react-i18next';
import { recipeIngredients, recipeName } from '../lib/recipe-language';

export default function RecipesPage() {
  const { recipes, isRecipesLoading, profile, deleteRecipe } = useMeals();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const categories = ['Todas', ...new Set(recipes.map((recipe) => recipe.category))];
  const filteredRaw = useMemo(() => recipes.filter((recipe) => {
    const term = query.toLowerCase();
    const matchesText = [recipe.name, recipe.nameEn, ...recipe.ingredients, ...recipe.ingredientsEn].some((item) => item.toLowerCase().includes(term));
    return matchesText && (category === 'Todas' || recipe.category === category);
  }), [recipes, query, category]);
  const filtered = filteredRaw.map((recipe) => ({ ...recipe, name: recipeName(recipe, i18n.language), ingredients: recipeIngredients(recipe, i18n.language) }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-semibold text-leaf-600">{t('Biblioteca')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Encontra a próxima refeição')}</h1><p className="mt-2 text-stone-500">{t('Pesquisa pelo nome da receita ou por um ingrediente.')}</p></div><Link to="/receitas/nova" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white"><Plus size={18} /> {t('Nova receita')}</Link></div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-3.5 text-stone-400" size={20} /><input className="input pl-12" placeholder={t('Ex.: frango, aveia, salmão...')} value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></div>
      {error && <p className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
      <p className="mt-6 text-sm font-semibold text-stone-500">{t('{{count}} receita(s) encontrada(s)', { count: filtered.length })}</p>
      {isRecipesLoading && <div className="mt-10 text-center text-stone-400"><Loader2 className="mx-auto animate-spin text-leaf-500" /><p className="mt-3 text-sm">{t('A carregar receitas...')}</p></div>}
      {!isRecipesLoading && filtered.length === 0 && <div className="card mt-5 p-10 text-center"><Utensils className="mx-auto text-leaf-500" size={38} /><h2 className="mt-4 text-xl font-bold">{t('Ainda não existem receitas')}</h2><p className="mt-2 text-sm text-stone-400">{t('Cria a primeira receita para começares.')}</p></div>}
      <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => <article key={recipe.id} className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"><div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${recipe.imageColor}`}><Link to={`/receitas/${recipe.id}`} className="absolute inset-0" aria-label={`Ver receita ${recipe.name}`}>{recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><Utensils size={45} className="text-white/80" /></span>}</Link>{recipe.ownerId === profile.userId && <div className="absolute right-3 top-3 flex gap-2"><Link to={`/receitas/${recipe.id}/editar`} className="rounded-xl bg-black/30 p-2 text-white backdrop-blur hover:bg-black/50" aria-label="Editar receita"><Pencil size={16} /></Link><button onClick={async () => { if (!window.confirm(`Apagar “${recipe.name}”?`)) return; setError(''); try { await deleteRecipe(recipe.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível apagar.'); } }} className="rounded-xl bg-black/30 p-2 text-white backdrop-blur hover:bg-rose-500/70" aria-label="Apagar receita"><Trash2 size={16} /></button></div>}</div><div className="p-5"><div className="flex items-center justify-between"><span className="pill bg-leaf-50 text-leaf-700">{recipe.category}</span><span className="flex items-center gap-1 text-xs font-semibold text-stone-400"><Clock size={14} />{recipe.prepMinutes} min</span></div><Link to={`/receitas/${recipe.id}`} className="mt-4 block text-lg font-bold hover:text-leaf-700">{recipe.name}</Link><div className="mt-5 grid grid-cols-4 gap-2 text-center"><Macro value={recipe.calories} label="kcal" /><Macro value={recipe.protein} label="prot." /><Macro value={recipe.carbs} label="hidr." /><Macro value={recipe.fat} label="gord." /></div><div className="mt-5 grid grid-cols-2 gap-2"><Link to={`/receitas/${recipe.id}`} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/5"><Eye size={18} /> Ver</Link><button onClick={() => setSelected(recipe)} className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700"><Plus size={18} /> Registar</button></div></div></article>)}
      </section>
      {selected && <AddMealModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Macro({ value, label }: { value: number; label: string }) { return <div className="rounded-xl bg-white/5 px-1 py-2"><p className="text-sm font-bold">{value}</p><p className="text-[10px] uppercase text-stone-400">{label}</p></div>; }
