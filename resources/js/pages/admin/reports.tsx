import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    Check,
    Clipboard,
    FileText,
    Printer,
    Search,
    Sprout,
    Tractor,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';

type Entry = Record<string, unknown>;
type Report = {
    id: number;
    office: 'AGRI' | 'ANI';
    date: string;
    user: { id: number; name: string; email: string };
    entry_count: number;
    problem_count: number;
    harvest_total: number;
    updated_at: string;
    data: Record<string, unknown>;
};

const SECTIONS = [
    ['travaux', 'Travaux réalisés'],
    ['produits', 'Produits et traitements'],
    ['eau', 'Irrigation'],
    ['recoltes', 'Récoltes'],
    ['cheptel', 'Cheptel'],
    ['alim', 'Alimentation'],
    ['sante', 'Santé animale'],
    ['problemes', 'Problèmes signalés'],
    ['formFreq', 'Formulaires périodiques'],
] as const;

const list = (value: unknown): Entry[] => (Array.isArray(value) ? value : []);

const describe = (section: string, item: Entry) => {
    const persons = Array.isArray(item.qui) ? item.qui.join(', ') : '';

    if (section === 'travaux') {
        return `${item.lieu || '—'} — ${item.tache || 'Travail'}${item.qte ? ` — ${item.qte} ${item.unite || ''}` : ''}${persons ? ` — ${persons}` : ''}`;
    }

    if (section === 'produits') {
        return `${item.lieu || '—'} — ${Array.isArray(item.prods) ? item.prods.join(' + ') : 'Traitement'}${item.dar ? ` — récolte dès le ${item.dar}` : ''}`;
    }

    if (section === 'eau') {
        return `${item.lieu || '—'} — ${item.minutes || 0} min${item.doigt ? ` — contrôle : ${item.doigt}` : ''}${item.souci ? ` — ${item.souci}` : ''}`;
    }

    if (section === 'recoltes') {
        return `${item.lieu || '—'} — ${item.kg || 0} kg${item.qualite ? ` — ${item.qualite}` : ''}${item.dest ? ` → ${item.dest}` : ''}`;
    }

    if (section === 'cheptel') {
        return `${item.lieu || '—'} — effectif ${item.effectif || 0}${item.naissances ? ` — naissances ${item.naissances}` : ''}${item.mortalites ? ` — mortalités ${item.mortalites}` : ''}`;
    }

    if (section === 'alim') {
        return `${item.lieu || '—'} — ${item.aliment || 'Aliment'} — ${item.kg || 0} kg`;
    }

    if (section === 'sante') {
        return `${item.lieu || '—'} — ${item.soin || 'Soin'}${item.produit ? ` — ${item.produit}` : ''}${item.nb ? ` — ${item.nb} animaux` : ''}`;
    }

    if (section === 'problemes') {
        return `${item.lieu || '—'} — ${item.quoi || 'Problème non détaillé'}`;
    }

    if (section === 'formFreq') {
        return `${item.freq || 'Période'} — ${item.faits || 0}/${item.total || 0} points réalisés`;
    }

    return JSON.stringify(item);
};

const reportText = (report: Report) => {
    const data = report.data;
    const lines = [
        `RAPPORT ${report.office === 'AGRI' ? 'BT AGRI' : 'BT ANIMAL'} — ${report.date}`,
        `Saisi par : ${report.user.name}`,
    ];

    if (data.meteo) {
        lines.push(
            `Météo : ${data.meteo}${data.pluie ? ` · pluie ${data.pluie} mm` : ''}`,
        );
    }

    if (data.presents) {
        lines.push(
            `Présents : ${data.presents}${data.absents ? ` · Absents : ${data.absents}` : ''}`,
        );
    }

    if (data.redacteur) {
        lines.push(`Rédigé par : ${data.redacteur}`);
    }

    SECTIONS.forEach(([key, label]) => {
        const entries = list(data[key]);

        if (entries.length) {
            lines.push(
                '',
                label.toUpperCase(),
                ...entries.map(
                    (entry, index) => `  ${index + 1}. ${describe(key, entry)}`,
                ),
            );
        }
    });

    return lines.join('\n');
};

export default function ReportsAdmin({ reports }: { reports: Report[] }) {
    const [selectedId, setSelectedId] = useState<number | null>(
        reports[0]?.id || null,
    );
    const [office, setOffice] = useState('ALL');
    const [date, setDate] = useState('');
    const [userId, setUserId] = useState('ALL');
    const [query, setQuery] = useState('');
    const [copied, setCopied] = useState(false);
    const selected = reports.find((report) => report.id === selectedId) || null;
    const users = useMemo(
        () =>
            Array.from(
                new Map(
                    reports.map((report) => [report.user.id, report.user]),
                ).values(),
            ),
        [reports],
    );
    const filtered = useMemo(
        () =>
            reports.filter(
                (report) =>
                    (office === 'ALL' || report.office === office) &&
                    (!date || report.date === date) &&
                    (userId === 'ALL' || String(report.user.id) === userId) &&
                    (!query ||
                        `${report.user.name} ${report.user.email} ${report.date}`
                            .toLowerCase()
                            .includes(query.toLowerCase())),
            ),
        [reports, office, date, userId, query],
    );
    const totals = {
        agri: reports.filter((report) => report.office === 'AGRI').length,
        animal: reports.filter((report) => report.office === 'ANI').length,
        harvest: reports.reduce(
            (sum, report) => sum + Number(report.harvest_total),
            0,
        ),
        problems: reports.reduce(
            (sum, report) => sum + report.problem_count,
            0,
        ),
    };
    const statCards = [
        { icon: FileText, label: 'Total rapports', value: reports.length },
        { icon: Sprout, label: 'BT Agri', value: totals.agri },
        { icon: Tractor, label: 'BT Animal', value: totals.animal },
        {
            icon: CalendarDays,
            label: 'Récoltes cumulées',
            value: `${totals.harvest.toFixed(1)} kg`,
        },
        {
            icon: AlertTriangle,
            label: 'Problèmes signalés',
            value: totals.problems,
        },
    ];

    const copy = async () => {
        if (!selected) {
            return;
        }

        await navigator.clipboard.writeText(reportText(selected));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    return (
        <AdminLayout
            title="Centre des rapports"
            subtitle="Consultez toutes les saisies journalières produites par les équipes."
        >
            <Head title="Rapports de la ferme" />
            <style>{`@media print { body * { visibility: hidden } .report-print, .report-print * { visibility: visible } .report-print { position:absolute; inset:0; width:100%; box-shadow:none!important; border:0!important } }`}</style>

            <div className="admin-animate-in">
                <div className="admin-stats-grid mb-6 print:hidden">
                    {statCards.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="admin-stat-card">
                            <div className="admin-stat-header">
                                <span className="admin-stat-label">{label}</span>
                                <div className="admin-stat-icon"><Icon size={16} /></div>
                            </div>
                            <div className="admin-stat-value">{value}</div>
                        </div>
                    ))}
                </div>

                <div className="admin-filters-bar mb-5 print:hidden">
                    <div className="admin-search mb-0 flex-1">
                        <Search size={16} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Nom, e-mail ou date…"
                        />
                    </div>
                    <div className="admin-field mb-0">
                        <select
                            value={office}
                            onChange={(e) => setOffice(e.target.value)}
                        >
                            <option value="ALL">Tous les bureaux</option>
                            <option value="AGRI">BT Agri</option>
                            <option value="ANI">BT Animal</option>
                        </select>
                    </div>
                    <div className="admin-field mb-0">
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        >
                            <option value="ALL">Tous les utilisateurs</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="admin-field mb-0">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
                    <aside className="admin-sidebar-nav max-h-80 lg:max-h-[760px] print:hidden">
                        <div className="admin-sidebar-section-label">
                            {filtered.length} RAPPORT(S)
                        </div>
                        <div className="admin-sidebar-nav-inner">
                            {filtered.map((report) => (
                                <button
                                    key={report.id}
                                    onClick={() => setSelectedId(report.id)}
                                    className={`mb-1.5 w-full rounded-xl border p-3.5 text-left transition-all ${selectedId === report.id ? 'border-[#7cac8a] bg-[#eaf2eb]' : 'border-transparent bg-[#f8f6f0] hover:border-[#ddd7c9] hover:bg-[#f3f1ea]'}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`admin-badge ${report.office === 'AGRI' ? 'admin-badge--green' : 'admin-badge--gold'}`}>
                                            {report.office === 'AGRI' ? 'BT AGRI' : 'BT ANIMAL'}
                                        </span>
                                        <span className="text-[12px] text-[#758078] font-medium">
                                            {report.date}
                                        </span>
                                    </div>
                                    <div className="mt-2.5 flex items-center gap-2 text-[13.5px] font-semibold text-[#17352a]">
                                        <UserRound size={14} className="text-[#b16a2f]" />
                                        {report.user.name}
                                    </div>
                                    <div className="mt-1.5 text-[12px] text-[#79837d]">
                                        {report.entry_count} saisie(s)
                                        {report.problem_count ? ` · ${report.problem_count} problème(s)` : ''}
                                    </div>
                                </button>
                            ))}
                            {!filtered.length && (
                                <div className="admin-empty">
                                    Aucun rapport ne correspond aux filtres.
                                </div>
                            )}
                        </div>
                    </aside>

                    {selected ? (
                        <article className="report-print overflow-hidden rounded-2xl border border-[#d8d2c4] bg-white shadow-sm">
                            <div
                                className={`p-6 text-white ${selected.office === 'AGRI' ? 'bg-[#174a31]' : 'bg-[#76502b]'}`}
                            >
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                    <div>
                                        <div className="text-xs font-semibold tracking-[.18em] text-white/65">
                                            FERME KABANDA NAWEZA
                                        </div>
                                        <h3 className="mt-2 text-2xl font-semibold">
                                            Rapport{' '}
                                            {selected.office === 'AGRI'
                                                ? 'BT Agri'
                                                : 'BT Animal'}
                                        </h3>
                                        <div className="mt-2 text-white/75">
                                            Journée du {selected.date}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 print:hidden">
                                        <button
                                            onClick={copy}
                                            className="flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-xs font-semibold hover:bg-white/20"
                                        >
                                            {copied ? (
                                                <Check className="size-4" />
                                            ) : (
                                                <Clipboard className="size-4" />
                                            )}
                                            {copied ? 'Copié' : 'Copier'}
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#17352a]"
                                        >
                                            <Printer className="size-4" />{' '}
                                            Imprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3 border-b border-[#ece7de] bg-[#faf9f5] px-6 py-4 text-sm sm:grid-cols-3">
                                <div>
                                    <span className="text-[#7a857e]">
                                        Saisi par
                                    </span>
                                    <div className="font-semibold">
                                        {selected.user.name}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#7a857e]">
                                        Rédacteur terrain
                                    </span>
                                    <div className="font-semibold">
                                        {String(
                                            selected.data.redacteur ||
                                                'Non renseigné',
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#7a857e]">
                                        Dernière mise à jour
                                    </span>
                                    <div className="font-semibold">
                                        {new Date(
                                            selected.updated_at,
                                        ).toLocaleString('fr-FR')}
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3 border-b border-[#ece7de] px-6 py-4 text-sm sm:grid-cols-4">
                                <div>
                                    <span className="text-[#7a857e]">
                                        Météo
                                    </span>
                                    <div className="font-semibold">
                                        {String(selected.data.meteo || '—')}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#7a857e]">
                                        Pluie
                                    </span>
                                    <div className="font-semibold">
                                        {selected.data.pluie
                                            ? `${selected.data.pluie} mm`
                                            : '—'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#7a857e]">
                                        Présents
                                    </span>
                                    <div className="font-semibold">
                                        {String(selected.data.presents || '—')}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[#7a857e]">
                                        Absents
                                    </span>
                                    <div className="font-semibold">
                                        {String(selected.data.absents || '—')}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-7 p-6">
                                {SECTIONS.map(([key, label]) => {
                                    const entries = list(selected.data[key]);

                                    if (!entries.length) {
                                        return null;
                                    }

                                    return (
                                        <section key={key}>
                                            <div className="mb-3 flex items-center justify-between border-b-2 border-[#e7e2d8] pb-2">
                                                <h4 className="font-semibold">
                                                    {label}
                                                </h4>
                                                <span className="rounded-full bg-[#edf3ed] px-2 py-1 text-xs font-semibold text-[#27633f]">
                                                    {entries.length}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {entries.map((entry, index) => (
                                                    <div
                                                        key={index}
                                                        className={`rounded-xl border px-4 py-3 text-sm leading-6 ${key === 'problemes' ? 'border-[#efd1ca] bg-[#fff7f4]' : 'border-[#e5e1d8] bg-[#fbfaf7]'}`}
                                                    >
                                                        <span className="mr-2 font-semibold text-[#b16a2f]">
                                                            {index + 1}.
                                                        </span>
                                                        {describe(key, entry)}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                                {!SECTIONS.some(
                                    ([key]) => list(selected.data[key]).length,
                                ) && (
                                    <div className="py-14 text-center text-sm text-[#7b857e]">
                                        Ce rapport ne contient encore aucune
                                        saisie détaillée.
                                    </div>
                                )}
                            </div>
                        </article>
                    ) : (
                        <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-[#cfc8ba] bg-white/50 text-center text-sm text-[#7c867f]">
                            <div>
                                <FileText className="mx-auto mb-3 size-10 opacity-40" />
                                Sélectionnez un rapport pour consulter son
                                contenu.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
