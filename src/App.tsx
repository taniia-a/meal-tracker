import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { authClient } from './lib/auth';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DiaryPage from './pages/DiaryPage';
import RecipesPage from './pages/RecipesPage';
import RecipeEditorPage from './pages/RecipeEditorPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import SettingsPage from './pages/SettingsPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProgressPage from './pages/ProgressPage';
import DailyFactPage from './pages/DailyFactPage';
import PantryPage from './pages/PantryPage';
import { MealProvider } from './store/MealContext';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t } = useTranslation();
  if (!authClient) {
    return <div className="grid min-h-screen place-items-center bg-cream p-5"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-extrabold">{t('Falta configurar o Neon')}</h1><p className="mt-3 text-stone-400">Adiciona <code className="rounded bg-white/5 px-2 py-1 text-leaf-700">VITE_NEON_AUTH_URL</code> e <code className="rounded bg-white/5 px-2 py-1 text-leaf-700">VITE_NEON_DATA_API_URL</code> ao ficheiro <code>.env.local</code> e reinicia o servidor.</p></div></div>;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { t } = useTranslation();
  const client = authClient!;
  const session = client.useSession();

  if (session.isPending) {
    return <div className="grid min-h-screen place-items-center bg-cream"><div className="text-center"><Loader2 className="mx-auto animate-spin text-leaf-500" size={38} /><p className="mt-4 text-sm font-semibold text-stone-400">{t('A carregar a tua sessão...')}</p></div></div>;
  }

  if (!session.data?.user) return <AuthPage />;

  return <MealProvider userId={session.data.user.id}><Layout><Routes><Route path="/" element={<DashboardPage />} /><Route path="/receitas" element={<RecipesPage />} /><Route path="/receitas/nova" element={<RecipeEditorPage />} /><Route path="/receitas/:recipeId" element={<RecipeDetailPage />} /><Route path="/receitas/:recipeId/editar" element={<RecipeEditorPage />} /><Route path="/diario" element={<DiaryPage />} /><Route path="/compras" element={<ShoppingListPage />} /><Route path="/despensa" element={<PantryPage />} /><Route path="/progresso" element={<ProgressPage />} /><Route path="/curiosidade" element={<DailyFactPage />} /><Route path="/definicoes" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout></MealProvider>;
}
