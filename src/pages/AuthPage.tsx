import { ChefHat, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { authClient } from '../lib/auth';

type AuthMode = 'sign-in' | 'sign-up';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!authClient) return;
      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        setError(translateAuthError(result.error.message));
      }
    } catch {
      setError('Não foi possível contactar o serviço de autenticação. Tenta novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-5 py-10">
      <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-leaf-600/15 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <section className="card relative w-full max-w-md p-7 sm:p-9">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-600 text-white shadow-lg shadow-leaf-600/20">
            <ChefHat size={26} />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold">Meal Tracker</p>
            <p className="text-xs text-stone-400">Nutrição sem complicações</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="font-semibold text-leaf-700">{mode === 'sign-in' ? 'Bem-vinda de volta' : 'Cria a tua conta'}</p>
          <h1 className="mt-1 text-3xl font-extrabold">{mode === 'sign-in' ? 'Iniciar sessão' : 'Começar agora'}</h1>
          <p className="mt-2 text-sm text-stone-400">
            {mode === 'sign-in' ? 'Acede às tuas receitas e ao diário de refeições.' : 'Guarda os teus objetivos e acompanha cada refeição.'}
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'sign-up' && (
            <label className="block text-sm font-semibold">Nome
              <input className="input mt-2" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="O teu nome" />
            </label>
          )}
          <label className="block text-sm font-semibold">Email
            <input className="input mt-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.pt" />
          </label>
          <label className="block text-sm font-semibold">Palavra-passe
            <span className="relative mt-2 block">
              <input className="input pr-12" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" />
              <button type="button" className="absolute right-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-white" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>

          {error && <p role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

          <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-leaf-600/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {mode === 'sign-in' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-400">
          {mode === 'sign-in' ? 'Ainda não tens conta?' : 'Já tens uma conta?'}{' '}
          <button className="font-bold text-leaf-700 hover:underline" onClick={() => changeMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
            {mode === 'sign-in' ? 'Regista-te' : 'Inicia sessão'}
          </button>
        </p>
      </section>
    </main>
  );
}

function translateAuthError(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('invalid') || normalized.includes('password')) return 'Email ou palavra-passe incorretos.';
  if (normalized.includes('already') || normalized.includes('exist')) return 'Já existe uma conta com este email.';
  if (normalized.includes('email')) return 'Confirma que o endereço de email está correto.';
  return message || 'Não foi possível concluir a operação. Tenta novamente.';
}
