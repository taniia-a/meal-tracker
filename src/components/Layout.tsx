import { ArrowUp, CalendarDays, ChefHat, ChartNoAxesCombined, LayoutDashboard, Lightbulb, LogOut, Menu, Settings, ShoppingCart, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authClient } from '../lib/auth';
import { changeLanguage } from '../i18n';

const navigation = [
  { to: '/', label: 'Resumo', icon: LayoutDashboard }, { to: '/receitas', label: 'Receitas', icon: ChefHat },
  { to: '/diario', label: 'Diário', icon: CalendarDays }, { to: '/compras', label: 'Compras', icon: ShoppingCart }, { to: '/progresso', label: 'Progresso', icon: ChartNoAxesCombined }, { to: '/curiosidade', label: 'Sabias que…?', icon: Lightbulb }, { to: '/definicoes', label: 'Definições', icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { t, i18n } = useTranslation();
  const session = authClient!.useSession();
  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 500);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-cream/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Brand />
          <button onClick={() => setOpen(!open)} className="rounded-xl p-2 hover:bg-white/5" aria-label="Abrir menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#120e18] p-6 transition-transform lg:translate-x-0`}>
        <Brand />
        <nav className="mt-12 space-y-2">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${isActive ? 'bg-leaf-600 text-white shadow-lg shadow-leaf-600/20' : 'text-stone-400 hover:bg-leaf-50 hover:text-leaf-700'}`
            }>
              <Icon size={20} />{t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-6 bottom-6 rounded-3xl bg-ink p-4 text-white">
          <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold uppercase text-stone-400">{t('Idioma')}</span><div className="flex rounded-xl bg-white/5 p-1"><button onClick={() => changeLanguage('pt')} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${i18n.language === 'pt' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>PT</button><button onClick={() => changeLanguage('en')} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${i18n.language === 'en' ? 'bg-leaf-600 text-white' : 'text-stone-400'}`}>EN</button></div></div>
          <p className="truncate font-bold">{session.data?.user.name || 'Utilizador'}</p>
          <p className="truncate text-xs text-stone-400">{session.data?.user.email}</p>
          <button onClick={() => authClient!.signOut()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-stone-300 transition hover:bg-white/10 hover:text-white">
            <LogOut size={16} /> {t('Terminar sessão')}
          </button>
        </div>
      </aside>

      {open && <button aria-label="Fechar menu" className="fixed inset-0 z-10 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="px-5 py-8 lg:ml-72 lg:px-10 lg:py-10">{children}</main>
      {showBackToTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-2xl bg-leaf-600 text-white shadow-lg shadow-leaf-600/30 transition hover:bg-leaf-700 sm:bottom-7 sm:right-7" aria-label={t('Voltar ao topo')} title={t('Voltar ao topo')}><ArrowUp size={21} /></button>}
    </div>
  );
}

function Brand() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf-600 text-white"><ChefHat size={24} /></div>
      <div><p className="font-display text-lg font-extrabold leading-tight">Meal Tracker</p><p className="text-xs text-stone-400">{t('Nutrição sem complicações')}</p></div>
    </div>
  );
}
