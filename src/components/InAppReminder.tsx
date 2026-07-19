import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Reminder = { title: string; body: string };

export default function InAppReminder() {
  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    let timeout: number | undefined;
    const show = (event: Event) => {
      const next = (event as CustomEvent<Reminder>).detail;
      setReminder(next);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setReminder(null), 8000);
    };
    window.addEventListener('meal-tracker-notification', show);
    return () => { window.removeEventListener('meal-tracker-notification', show); window.clearTimeout(timeout); };
  }, []);

  if (!reminder) return null;
  return <div role="alert" className="fixed right-5 top-5 z-[70] flex w-[min(23rem,calc(100vw-2.5rem))] gap-3 rounded-2xl border border-leaf-400/30 bg-[#21172d] p-4 text-white shadow-2xl shadow-black/40"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-600 text-white"><Bell size={19} /></div><div className="min-w-0 flex-1"><p className="font-bold">{reminder.title}</p><p className="mt-1 text-sm text-stone-300">{reminder.body}</p></div><button type="button" onClick={() => setReminder(null)} className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={17} /></button></div>;
}
