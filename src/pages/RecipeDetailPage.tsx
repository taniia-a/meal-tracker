import { ArrowLeft, Clock, Pencil, Plus, Trash2, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import AddMealModal from '../components/AddMealModal';
import { useMeals } from '../store/MealContext';
import { useTranslation } from 'react-i18next';
import { recipeIngredients, recipeInstructions, recipeName } from '../lib/recipe-language';

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const { recipes, isRecipesLoading, profile, deleteRecipe } = useMeals();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const recipe = recipes.find((item) => item.id === recipeId);

  if (isRecipesLoading) return <div className="card p-10 text-center text-stone-400">{t('A carregar receita...')}</div>;
  if (!recipe) return <Navigate to="/receitas" replace />;

  const remove = async () => {
    if (!window.confirm(t('Apagar “{{name}}”?', { name: recipeName(recipe, i18n.language) }))) return;
    setDeleting(true);
    setError('');
    try {
      await deleteRecipe(recipe.id);
      navigate('/receitas');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('Não foi possível apagar.'));
      setDeleting(false);
    }
  };

  return <div className="mx-auto max-w-5xl">
    <div className="flex items-center justify-between gap-4"><Link to="/receitas" className="inline-flex items-center gap-2 text-sm font-bold text-leaf-700"><ArrowLeft size={17} /> {t('Voltar às receitas')}</Link>{recipe.ownerId === profile.userId && <div className="flex items-center gap-2"><Link to={`/receitas/${recipe.id}/editar`} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"><Pencil size={16} /> {t('Editar')}</Link><button type="button" disabled={deleting} onClick={remove} className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 px-4 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"><Trash2 size={16} /> {t(deleting ? 'A apagar...' : 'Apagar')}</button></div>}</div>
    {error && <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}
    <article className="card mt-5 overflow-hidden">
      <div className={`flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-96 ${recipe.imageColor}`}>{recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipeName(recipe, i18n.language)} className="h-full w-full object-cover" /> : <Utensils size={70} className="text-white/80" />}</div>
      <div className="p-6 sm:p-9"><div className="flex flex-wrap items-center gap-3"><span className="pill bg-leaf-50 text-leaf-700">{t(recipe.category)}</span><span className="flex items-center gap-1 text-sm text-stone-400"><Clock size={16} /> {recipe.prepMinutes} min</span><span className="text-sm text-stone-400">{t('{{count}} porção(ões)', { count: recipe.servings })}</span></div><h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">{recipeName(recipe, i18n.language)}</h1>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><Macro value={recipe.calories} label={t('Calorias')} unit="kcal" /><Macro value={recipe.protein} label={t('Proteína')} unit="g" /><Macro value={recipe.carbs} label={t('Hidratos')} unit="g" /><Macro value={recipe.fat} label={t('Gordura')} unit="g" /></div>
        <div className="mt-9 grid gap-9 md:grid-cols-2"><section><h2 className="text-xl font-bold">{t('Ingredientes')}</h2><ul className="mt-4 space-y-3">{recipeIngredients(recipe, i18n.language).map((ingredient, index) => <li key={`${ingredient}-${index}`} className="flex gap-3 text-stone-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />{ingredient}</li>)}</ul></section><section><h2 className="text-xl font-bold">{t('Preparação')}</h2><p className="mt-4 whitespace-pre-wrap leading-relaxed text-stone-300">{recipeInstructions(recipe, i18n.language) || t('Ainda não foram adicionadas instruções de preparação.')}</p></section></div>
        <button onClick={() => setRegistering(true)} className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white sm:w-auto"><Plus size={18} /> {t('Registar refeição')}</button>
      </div>
    </article>
    {registering && <AddMealModal recipe={recipe} onClose={() => setRegistering(false)} />}
  </div>;
}

function Macro({ value, label, unit }: { value: number; label: string; unit: string }) {
  return <div className="rounded-2xl bg-white/5 p-4 text-center"><p className="text-xl font-extrabold">{value}<span className="ml-1 text-xs font-semibold text-stone-400">{unit}</span></p><p className="mt-1 text-xs uppercase text-stone-400">{label}</p></div>;
}
