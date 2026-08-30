import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type Entry = {
    horodatage: string;
    heure: string;
    type: string;
    categorie: string;
    titre: string;
    detail?: string | null;
    par: string;
    lien: string;
};
type Props = {
    jour: string;
    entries: Entry[];
    dailyCounts: Array<{ date: string; count: number }>;
};

export default function FarmJournal({ jour, entries, dailyCounts }: Props) {
    const tone: Record<string, string> = {
        tache: 'bg-emerald-100 text-emerald-800',
        recolte: 'bg-lime-100 text-lime-800',
        plantation: 'bg-green-100 text-green-800',
        magasin: 'bg-slate-200 text-slate-800',
        alerte: 'bg-red-100 text-red-800',
        requisition: 'bg-amber-100 text-amber-800',
    };
    const changeDay = (days: number) => {
        const date = new Date(`${jour}T12:00:00`);
        date.setDate(date.getDate() + days);
        router.get(
            '/journal-ferme',
            { jour: date.toISOString().slice(0, 10) },
            { preserveState: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Journal de la ferme" />
            <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <section className="rounded-2xl bg-[#174a31] p-6 text-white shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold tracking-widest text-emerald-200 uppercase">
                                    Registre partagé
                                </p>
                                <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold">
                                    <Newspaper /> Journal de la ferme
                                </h1>
                                <p className="mt-2 text-sm text-emerald-100">
                                    Ce que chacun a consigné - visible par toute
                                    l’équipe.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => changeDay(-1)}
                                    className="rounded-lg bg-white/15 p-2"
                                >
                                    <ChevronLeft />
                                </button>
                                <span className="rounded-lg bg-white/10 px-4 py-2 font-semibold">
                                    {jour}
                                </span>
                                <button
                                    onClick={() => changeDay(1)}
                                    className="rounded-lg bg-white/15 p-2"
                                >
                                    <ChevronRight />
                                </button>
                            </div>
                        </div>
                    </section>
                    <section className="flex gap-2 overflow-x-auto pb-1">
                        {dailyCounts.map((day) => (
                            <button
                                key={day.date}
                                onClick={() =>
                                    router.get('/journal-ferme', {
                                        jour: day.date,
                                    })
                                }
                                className={`min-w-28 rounded-xl border px-3 py-3 text-left ${day.date === jour ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                            >
                                <div className="text-xs text-slate-500">
                                    {day.date}
                                </div>
                                <div className="mt-1 font-bold">
                                    {day.count} écritures
                                </div>
                            </button>
                        ))}
                    </section>
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {entries.map((entry, index) => (
                            <Link
                                key={`${entry.type}-${index}`}
                                href={entry.lien}
                                className="flex gap-4 border-b border-slate-100 p-5 last:border-0 hover:bg-emerald-50/40"
                            >
                                <span className="w-12 shrink-0 font-mono text-sm text-slate-400">
                                    {entry.heure}
                                </span>
                                <span
                                    className={`w-24 shrink-0 self-start rounded px-2 py-1 text-center text-xs font-bold tracking-wide uppercase ${tone[entry.type] ?? 'bg-slate-100 text-slate-700'}`}
                                >
                                    {entry.categorie}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">
                                        {entry.titre}
                                    </div>
                                    {entry.detail && (
                                        <div className="mt-1 text-sm text-slate-500">
                                            {entry.detail}
                                        </div>
                                    )}
                                    <div className="mt-1 text-xs text-slate-400 sm:hidden">
                                        Consigné par {entry.par}
                                    </div>
                                </div>
                                <span className="hidden text-xs text-slate-400 sm:block">
                                    {entry.par}
                                </span>
                            </Link>
                        ))}
                        {entries.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                Aucune écriture pour cette journée.
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </AppLayout>
    );
}
