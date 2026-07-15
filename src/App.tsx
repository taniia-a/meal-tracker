import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { authClient } from './lib/auth';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DiaryPage from './pages/DiaryPage';
import RecipesPage from './pages/RecipesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  if (!authClient) {
    return <div className="grid min-h-screen place-items-center bg-cream p-5"><div className="card max-w-lg p-8 text-center"><h1 className="text-2xl font-extrabold">Falta configurar o Neon Auth</h1><p className="mt-3 text-stone-400">Adiciona o URL de autenticação à variável <code className="rounded bg-white/5 px-2 py-1 text-leaf-700">VITE_NEON_AUTH_URL</code> no ficheiro <code>.env.local</code> e reinicia o servidor.</p></div></div>;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const client = authClient!;
  const session = client.useSession();

  if (session.isPending) {
    return <div className="grid min-h-screen place-items-center bg-cream"><div className="text-center"><Loader2 className="mx-auto animate-spin text-leaf-500" size={38} /><p className="mt-4 text-sm font-semibold text-stone-400">A carregar a tua sessão...</p></div></div>;
  }

  if (!session.data?.user) return <AuthPage />;

  return <Layout><Routes><Route path="/" element={<DashboardPage />} /><Route path="/receitas" element={<RecipesPage />} /><Route path="/diario" element={<DiaryPage />} /><Route path="/definicoes" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout>;
}
