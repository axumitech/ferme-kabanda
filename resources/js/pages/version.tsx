import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeCheck,
    CalendarDays,
    GitBranch,
    History,
    Sparkles,
} from 'lucide-react';

type VersionEntry = {
    version: string;
    date: string;
    summary: string;
};

type Props = {
    version: string;
    date: string;
    name: string;
    pendingDecisions: Array<{ key: string; label: string }>;
    history: VersionEntry[];
};

const formatDate = (value: string): string => {
    if (!value) {
        return 'Date non renseignée';
    }

    const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
    );

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          }).format(date);
};

export default function Version({
    version,
    date,
    name,
    pendingDecisions,
    history,
}: Props) {
    return (
        <>
            <Head title={`Version ${version}`} />

            <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(221,168,78,.16),_transparent_34%),linear-gradient(135deg,#f8f5ec_0%,#f2f7f1_55%,#edf4ef_100%)] px-4 py-8 text-[#17352a] sm:px-6 lg:px-8">
                <div className="w-full space-y-7">
                    <section className="relative overflow-hidden rounded-[28px] bg-[#153f2c] p-7 text-white shadow-[0_24px_70px_rgba(21,63,44,.24)] sm:p-10">
                        <div className="absolute -top-24 -right-16 size-64 rounded-full border border-white/10 bg-white/5" />
                        <div className="absolute -right-8 -bottom-24 size-52 rounded-full bg-[#d8a84e]/15 blur-2xl" />
                        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#dfbd78]/35 bg-[#d8a84e]/10 px-3 py-1.5 text-xs font-bold tracking-[.16em] text-[#f1cf8a] uppercase">
                                    <Sparkles size={14} /> Socle applicatif FKN
                                </div>
                                <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                                    {name}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#cfddd5] sm:text-base">
                                    Référence fonctionnelle et historique des
                                    lots déployés pour la Ferme Kabanda Naweza.
                                </p>
                            </div>

                            <div className="min-w-56 rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="grid size-11 place-items-center rounded-xl bg-[#d8a84e] text-[#17352a]">
                                        <GitBranch size={21} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold tracking-[.12em] text-[#b9cec2] uppercase">
                                            Version courante
                                        </p>
                                        <p className="text-2xl font-black">
                                            v{version}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-[#cfddd5]">
                                    <CalendarDays size={16} />{' '}
                                    {formatDate(date)}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-7 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
                        <article className="rounded-[24px] border border-[#e4ddce] bg-white/85 p-6 shadow-[0_18px_48px_rgba(66,80,71,.08)] backdrop-blur sm:p-7">
                            <div className="flex items-start gap-4">
                                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                                    <AlertTriangle size={21} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold tracking-[.14em] text-[#a16f26] uppercase">
                                        Gouvernance
                                    </p>
                                    <h2 className="mt-1 text-xl font-bold">
                                        Valeurs présumées — à trancher par la
                                        Direction
                                    </h2>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {pendingDecisions.length > 0 ? (
                                    pendingDecisions.map((decision, index) => (
                                        <div
                                            key={decision.key}
                                            className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/75 p-4"
                                        >
                                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-600 text-xs font-bold text-white">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm leading-6 text-amber-950">
                                                {decision.label}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                                        <BadgeCheck size={19} /> Aucune décision
                                        en attente pour cette version.
                                    </div>
                                )}
                            </div>
                        </article>

                        <article className="rounded-[24px] border border-[#dce6df] bg-white/85 p-6 shadow-[0_18px_48px_rgba(66,80,71,.08)] backdrop-blur sm:p-7">
                            <div className="flex items-center gap-4">
                                <div className="grid size-11 place-items-center rounded-xl bg-[#e8f1eb] text-[#174a31]">
                                    <History size={21} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold tracking-[.14em] text-[#557365] uppercase">
                                        Traçabilité
                                    </p>
                                    <h2 className="mt-1 text-xl font-bold">
                                        Historique des versions
                                    </h2>
                                </div>
                            </div>

                            <ol className="mt-7 space-y-1">
                                {history.map((entry, index) => (
                                    <li
                                        key={`${entry.version}-${entry.date}`}
                                        className="relative grid grid-cols-[32px_1fr] gap-3 pb-6 last:pb-0"
                                    >
                                        {index < history.length - 1 && (
                                            <span className="absolute top-8 bottom-0 left-[15px] w-px bg-[#d9e5dd]" />
                                        )}
                                        <span className="relative z-10 mt-1 grid size-8 place-items-center rounded-full border-4 border-white bg-[#174a31] text-[10px] font-bold text-white shadow-sm">
                                            {index + 1}
                                        </span>
                                        <div className="rounded-2xl border border-[#e6ebe7] bg-[#fbfcfa] px-4 py-3.5">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <h3 className="font-bold text-[#17352a]">
                                                    Version {entry.version}
                                                </h3>
                                                <time className="text-xs font-semibold text-[#7a877f]">
                                                    {formatDate(entry.date)}
                                                </time>
                                            </div>
                                            <p className="mt-1.5 text-sm leading-6 text-[#5d6b63]">
                                                {entry.summary}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </article>
                    </section>
                </div>
            </main>
        </>
    );
}
