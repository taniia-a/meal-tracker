import { ChefHat, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { authClient } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';
type RecoveryStep = 'request' | 'reset';
type RecoveryResult = { error?: { message?: string } | null };
type EmailOtpAuthClient = {
  emailOtp: {
    requestPasswordReset: (input: { email: string }) => Promise<RecoveryResult>;
    resetPassword: (input: { email: string; otp: string; password: string }) => Promise<RecoveryResult>;
  };
};

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('request');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      if (!authClient) return;

      if (mode === 'forgot-password') {
        const recoveryClient = authClient as unknown as EmailOtpAuthClient;
        const result = recoveryStep === 'request'
          ? await recoveryClient.emailOtp.requestPasswordReset({ email })
          : await recoveryClient.emailOtp.resetPassword({ email, otp: resetCode, password });

        if (result.error) {
          setError(t(translateAuthError(result.error.message)));
        } else if (recoveryStep === 'request') {
          setRecoveryStep('reset');
          setNotice(t('Enviámos um código de recuperação para o teu email.'));
        } else {
          setMode('sign-in');
          setRecoveryStep('request');
          setResetCode('');
          setPassword('');
          setNotice(t('Palavra-passe alterada com sucesso. Já podes iniciar sessão.'));
        }
        return;
      }

      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

      if (result.error) {
        setError(t(translateAuthError(result.error.message)));
      } else {
        const freshSession = await authClient.getSession();
        if (!freshSession.data?.user) {
          setError(t('A sessão foi criada, mas não foi possível confirmá-la. Tenta novamente.'));
          return;
        }
        window.location.replace('/');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      setError(t(translateAuthError(message)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setRecoveryStep('request');
    setResetCode('');
  };

  const title = mode === 'sign-in' ? 'Iniciar sessão' : mode === 'sign-up' ? 'Começar agora' : 'Recuperar palavra-passe';
  const eyebrow = mode === 'sign-in' ? 'Bem-vinda de volta' : mode === 'sign-up' ? 'Cria a tua conta' : 'Recuperar acesso';
  const description = mode === 'sign-in'
    ? 'Acede às tuas receitas e ao diário de refeições.'
    : mode === 'sign-up'
      ? 'Guarda os teus objetivos e acompanha cada refeição.'
      : recoveryStep === 'request'
        ? 'Vamos enviar um código para o teu email.'
        : 'Introduz o código que recebeste e escolhe uma nova palavra-passe.';

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-5 py-10">
      <div className="absolute right-5 top-5 z-10 flex rounded-xl bg-white/5 p-1"><button onClick={() => changeLanguage('pt')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${i18n.language === 'pt' ? 'bg-leaf-600' : 'text-stone-400'}`}>PT</button><button onClick={() => changeLanguage('en')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${i18n.language === 'en' ? 'bg-leaf-600' : 'text-stone-400'}`}>EN</button></div>
      <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-leaf-600/15 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <section className="card relative w-full max-w-md p-7 sm:p-9">
        <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-600 text-white shadow-lg shadow-leaf-600/20"><ChefHat size={26} /></div><div><p className="font-display text-xl font-extrabold">Meal Tracker</p><p className="text-xs text-stone-400">{t('Nutrição sem complicações')}</p></div></div>

        <div className="mt-8"><p className="font-semibold text-leaf-700">{t(eyebrow)}</p><h1 className="mt-1 text-3xl font-extrabold">{t(title)}</h1><p className="mt-2 text-sm text-stone-400">{t(description)}</p></div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === 'sign-up' && <label className="block text-sm font-semibold">{t('Nome')}<input className="input mt-2" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('O teu nome')} /></label>}

          <label className="block text-sm font-semibold">Email<input className="input mt-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.pt" /></label>

          {mode === 'forgot-password' && recoveryStep === 'reset' && <label className="block text-sm font-semibold">{t('Código de recuperação')}<input className="input mt-2" inputMode="numeric" autoComplete="one-time-code" required value={resetCode} onChange={(event) => setResetCode(event.target.value)} placeholder="123456" /></label>}

          {(mode !== 'forgot-password' || recoveryStep === 'reset') && <label className="block text-sm font-semibold">{t(mode === 'forgot-password' ? 'Nova palavra-passe' : 'Palavra-passe')}<span className="relative mt-2 block"><input className="input pr-12" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('Mínimo de 8 caracteres')} /><button type="button" className="absolute right-3 top-2.5 rounded-lg p-1 text-stone-400 hover:text-white" onClick={() => setShowPassword(!showPassword)} aria-label={t(showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe')}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>}

          {error && <p role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
          {notice && <p role="status" className="rounded-2xl border border-leaf-500/20 bg-leaf-500/10 px-4 py-3 text-sm text-leaf-200">{notice}</p>}

          <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-leaf-600/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{isSubmitting && <Loader2 className="animate-spin" size={18} />}{t(mode === 'sign-in' ? 'Entrar' : mode === 'sign-up' ? 'Criar conta' : recoveryStep === 'request' ? 'Enviar código' : 'Guardar nova palavra-passe')}</button>
        </form>

        {mode === 'sign-in' ? <><button className="mt-5 w-full text-center text-sm font-bold text-leaf-700 hover:underline" onClick={() => changeMode('forgot-password')}>{t('Esqueceste-te da palavra-passe?')}</button><p className="mt-3 text-center text-sm text-stone-400">{t('Ainda não tens conta?')}{' '}<button className="font-bold text-leaf-700 hover:underline" onClick={() => changeMode('sign-up')}>{t('Regista-te')}</button></p></> : <p className="mt-6 text-center text-sm text-stone-400">{t(mode === 'sign-up' ? 'Já tens uma conta?' : 'Já recuperaste o acesso?')}{' '}<button className="font-bold text-leaf-700 hover:underline" onClick={() => changeMode('sign-in')}>{t('Inicia sessão')}</button></p>}
      </section>
    </main>
  );
}

function translateAuthError(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('invalid') || normalized.includes('password')) return 'Email, código ou palavra-passe incorretos.';
  if (normalized.includes('already') || normalized.includes('exist')) return 'Já existe uma conta com este email.';
  if (normalized.includes('email')) return 'Confirma que o endereço de email está correto.';
  return message || 'Não foi possível concluir a operação. Tenta novamente.';
}
