import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    Download,
    FileText,
} from 'lucide-react';

type Section = {
    id: number;
    ancre: string;
    titre: string;
    texte: string | null;
    page: number | null;
};
type Document = {
    id: number;
    code: string;
    titre: string;
    type: string;
    version: string | null;
    date_version: string | null;
    fichier: string | null;
    actif: boolean;
    sections_count: number;
    created_at: string;
    sections: Section[];
};
export default function DocumentReferenceShow({
    document,
    types,
}: {
    document: Document;
    types: Record<string, string>;
}) {
    return (
        <>
            <Head title={document.code} />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/documents-reference"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                        >
                            <ArrowLeft size={16} /> Politiques &amp; procédures
                        </Link>
                        {document.fichier && (
                            <a
                                href={`/documents-reference/${document.id}/pdf`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                            >
                                <Download size={16} /> Ouvrir le PDF
                            </a>
                        )}
                    </div>
                    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-7 text-white shadow-lg sm:p-9">
                        <span className="rounded-lg bg-emerald-400/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                            {document.code}
                        </span>
                        <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                            {document.titre}
                        </h1>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Badge
                                text={types[document.type] ?? document.type}
                            />
                            <Badge
                                text={
                                    document.version
                                        ? `Version ${document.version}`
                                        : 'Version non renseignée'
                                }
                            />
                            <Badge
                                text={document.actif ? 'Actif' : 'Inactif'}
                                green={document.actif}
                            />
                        </div>
                    </header>
                    <section className="grid gap-4 md:grid-cols-3">
                        <Info
                            icon={<FileText size={18} />}
                            label="Type"
                            value={types[document.type] ?? document.type}
                        />
                        <Info
                            icon={<CalendarDays size={18} />}
                            label="Date de version"
                            value={formatDate(document.date_version)}
                        />
                        <Info
                            icon={<BookOpen size={18} />}
                            label="Paragraphes"
                            value={String(document.sections_count)}
                        />
                    </section>
                    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <p className="text-xs font-bold tracking-[.14em] text-emerald-700 uppercase">
                                Contenu adressable
                            </p>
                            <h2 className="mt-1 text-xl font-bold">
                                Paragraphes du document
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Chaque paragraphe pourra être cité directement
                                depuis un plan ou une tâche.
                            </p>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {document.sections.map((section) => (
                                <section
                                    key={section.id}
                                    className="grid gap-3 px-5 py-5 sm:grid-cols-[100px_minmax(0,1fr)_90px]"
                                >
                                    <b className="font-mono text-emerald-800">
                                        § {section.ancre}
                                    </b>
                                    <div>
                                        <h3 className="font-bold">
                                            {section.titre}
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                            {section.texte ||
                                                'Aucun texte recopié.'}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {section.page
                                            ? `Page ${section.page}`
                                            : '—'}
                                    </span>
                                </section>
                            ))}
                            {document.sections.length === 0 && (
                                <div className="px-5 py-16 text-center text-slate-500">
                                    <BookOpen
                                        size={40}
                                        className="mx-auto mb-3 text-slate-300"
                                    />
                                    Aucun paragraphe adressable n’a encore été
                                    ajouté.
                                </div>
                            )}
                        </div>
                    </article>
                </div>
            </main>
        </>
    );
}
function Badge({ text, green = false }: { text: string; green?: boolean }) {
    return (
        <span
            className={`rounded-xl px-3 py-2 text-xs font-bold ${green ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30' : 'bg-white/10 text-white ring-1 ring-white/15'}`}
        >
            {text}
        </span>
    );
}
function Info({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-emerald-700 uppercase">
                {icon}
                {label}
            </div>
            <p className="mt-3 text-lg font-black">{value}</p>
        </article>
    );
}
function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`))
        : '—';
}
