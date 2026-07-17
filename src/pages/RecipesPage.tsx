import { CheckCircle2, Clock, Copy, Eye, Languages, Loader2, Pencil, Plus, Search, Trash2, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AddMealModal from '../components/AddMealModal';
import { recipeIngredients, recipeName } from '../lib/recipe-language';
import { useMeals } from '../store/MealContext';
import { Recipe, RecipeInput } from '../types';

const categories = ['Todas', 'Pequeno Almoço', 'Almoço/Jantar', 'Snacks'];
type Scope = 'all' | 'mine' | 'public';

export default function RecipesPage() {
  const { recipes, isRecipesLoading, profile, deleteRecipe, saveRecipe } = useMeals();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [scope, setScope] = useState<Scope>('all');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const filtered = useMemo(() => recipes.filter((recipe) => {
    const term = query.trim().toLowerCase();
    const matchesText = !term || [recipe.name, recipe.nameEn, ...recipe.ingredients, ...recipe.ingredientsEn].some((item) => item.toLowerCase().includes(term));
    const matchesCategory = category === 'Todas' || recipe.category === category;
    const matchesScope = scope === 'all' || (scope === 'mine' ? recipe.ownerId === profile.userId : recipe.isPublic);
    return matchesText && matchesCategory && matchesScope;
  }).map((recipe) => ({ ...recipe, name: recipeName(recipe, i18n.language), ingredients: recipeIngredients(recipe, i18n.language) })), [recipes, query, category, scope, profile.userId, i18n.language]);

  const remove = async (recipe: Recipe) => {
    if (!window.confirm(t('Apagar “{{name}}”?', { name: recipe.name }))) return;
    setError(''); setSuccess('');
    try { await deleteRecipe(recipe.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível apagar.')); }
  };

  const duplicate = async (recipe: Recipe) => {
    setDuplicatingId(recipe.id); setError(''); setSuccess('');
    const source = recipes.find((item) => item.id === recipe.id) ?? recipe;
    const input: RecipeInput = {
      name: `${source.name}${source.name.endsWith('(cópia)') ? '' : ' (cópia)'}`,
      nameEn: source.nameEn ? `${source.nameEn}${source.nameEn.endsWith('(copy)') ? '' : ' (copy)'}` : '',
      category: source.category, prepMinutes: source.prepMinutes, servings: source.servings,
      imageUrl: source.imageUrl, calories: source.calories, protein: source.protein,
      carbs: source.carbs, fat: source.fat, ingredients: [...source.ingredients], ingredientsEn: [...source.ingredientsEn],
      ingredientQuantities: [...source.ingredientQuantities], ingredientUnits: [...source.ingredientUnits], ingredientOptional: [...source.ingredientOptional], instructions: source.instructions,
      instructionsEn: source.instructionsEn, notes: source.notes, notesEn: source.notesEn, isPublic: false,
    };
    try { await saveRecipe(input); setSuccess(t('Receita duplicada com sucesso. A cópia é privada.')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('Não foi possível duplicar a receita.')); }
    finally { setDuplicatingId(null); }
  };

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-semibold text-leaf-600">{t('Biblioteca')}</p><h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t('Encontra a próxima refeição')}</h1><p className="mt-2 text-stone-500">{t('Pesquisa pelo nome da receita ou por um ingrediente.')}</p></div><Link to="/receitas/nova" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3 font-bold text-white"><Plus size={18} /> {t('Nova receita')}</Link></div>

    <aside className="mt-7 rounded-3xl border border-leaf-500/20 bg-leaf-500/10 p-5 text-sm leading-relaxed text-stone-300"><p className="font-bold text-leaf-700">{t('Sobre as receitas')}</p><p className="mt-2 whitespace-pre-line">{t('As macros apresentadas em todas as receitas são por porção.\nEm cada receita está indicado o número de porções que os ingredientes rendem, assim como o tempo médio de preparação (apenas para referência).\nOs ingredientes assinalados como opcionais não estão incluídos nas macros — estão apenas sugeridos para dar mais sabor ou para usares como alternativa a algum ingrediente.\nOs toppings estão incluídos nas macros, excepto quando indicados como opcionais.')}</p></aside>
    <div className="mt-8 flex flex-col gap-3"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]"><label className="relative min-w-0"><Search className="absolute left-4 top-3.5 text-stone-400" size={20} /><input className="input !pl-12" placeholder={t('Ex.: frango, aveia, salmão...')} value={query} onChange={(event) => setQuery(event.target.value)} /></label><select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></div><div className="flex w-full rounded-2xl border border-white/10 bg-white/5 p-1 sm:w-fit">{(['all', 'mine', 'public'] as Scope[]).map((item) => <button key={item} onClick={() => setScope(item)} className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold sm:flex-none ${scope === item ? 'bg-leaf-600 text-white' : 'text-stone-400 hover:text-white'}`}>{t(item === 'all' ? 'Todas' : item === 'mine' ? 'As minhas' : 'Públicas')}</button>)}</div></div>

    {error && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
    {success && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 size={18} />{success}</p>}
    <p className="mt-6 text-sm font-semibold text-stone-500">{t('{{count}} receita(s) encontrada(s)', { count: filtered.length })}</p>
    {isRecipesLoading && <div className="mt-10 text-center text-stone-400"><Loader2 className="mx-auto animate-spin text-leaf-500" /><p className="mt-3 text-sm">{t('A carregar receitas...')}</p></div>}
    {!isRecipesLoading && filtered.length === 0 && <div className="card mt-5 p-10 text-center"><Utensils className="mx-auto text-leaf-500" size={38} /><h2 className="mt-4 text-xl font-bold">{t('Ainda não existem receitas')}</h2><p className="mt-2 text-sm text-stone-400">{t('Experimenta alterar os filtros ou criar uma receita.')}</p></div>}

    <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((recipe) => {
      const owner = recipe.ownerId === profile.userId;
      const translated = Boolean(recipe.nameEn.trim() && (!recipe.instructions.trim() || recipe.instructionsEn.trim()) && recipe.ingredientsEn.length === recipe.ingredients.length && recipe.ingredientsEn.every((item) => item.trim()));
      return <article key={recipe.id} className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"><div className={`relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-52 ${recipe.imageColor}`}><Link to={`/receitas/${recipe.id}`} className="absolute inset-0" aria-label={t('Ver receita {{name}}', { name: recipe.name })}>{recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><Utensils size={45} className="text-white/80" /></span>}</Link><div className="absolute right-3 top-3 flex gap-2"><button disabled={duplicatingId === recipe.id} onClick={() => duplicate(recipe)} className="rounded-xl bg-black/40 p-2 text-white backdrop-blur hover:bg-leaf-600 disabled:opacity-50" aria-label={t('Duplicar receita')} title={t('Duplicar receita')}><Copy size={16} /></button>{owner && <><Link to={`/receitas/${recipe.id}/editar`} className="rounded-xl bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60" aria-label={t('Editar receita')}><Pencil size={16} /></Link><button onClick={() => remove(recipe)} className="rounded-xl bg-black/40 p-2 text-white backdrop-blur hover:bg-rose-500/70" aria-label={t('Apagar receita')}><Trash2 size={16} /></button></>}</div></div><div className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="pill bg-leaf-50 text-leaf-700">{t(recipe.category)}</span><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${translated ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`} title={t(translated ? 'Tradução inglesa completa' : 'Tradução inglesa em falta')}><Languages size={13} /> EN</span><span className="flex items-center gap-1 text-xs font-semibold text-stone-400"><Clock size={14} />{recipe.prepMinutes} min</span></div><Link to={`/receitas/${recipe.id}`} className="mt-4 block text-lg font-bold hover:text-leaf-700">{recipe.name}</Link><div className="mt-5 grid grid-cols-4 gap-2 text-center"><Macro value={recipe.calories} label="kcal" /><Macro value={recipe.protein} label={t('prot.')} /><Macro value={recipe.carbs} label={t('hidr.')} /><Macro value={recipe.fat} label={t('gord.')} /></div><div className="mt-5 grid grid-cols-2 gap-2"><Link to={`/receitas/${recipe.id}`} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/5"><Eye size={18} /> {t('Ver')}</Link><button onClick={() => setSelected(recipe)} className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-bold text-white hover:bg-leaf-700"><Plus size={18} /> {t('Registar')}</button></div></div></article>;
    })}</section>
    {selected && <AddMealModal recipe={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function Macro({ value, label }: { value: number; label: string }) { return <div className="rounded-xl bg-white/5 px-1 py-2"><p className="text-sm font-bold">{value}</p><p className="text-[10px] uppercase text-stone-400">{label}</p></div>; }
