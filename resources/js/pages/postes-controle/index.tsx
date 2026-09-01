import { Head, Link } from '@inertiajs/react';
import { Flag, MapPin, Pencil, Plus, Route } from 'lucide-react';

type ControlPost = {
    id: number;
    code: string;
    nom: string;
    ordre: number;
    latitude?: string | null;
    longitude?: string | null;
    actif: boolean;
    passages_count: number;
    site?: { code: string; nom: string } | null;
};

export default function ControlPostsIndex({ posts }: { posts: ControlPost[] }) {
    const activeCount = posts.filter((post) => post.actif).length;

    return (
        <>
            <Head title="Postes de contrôle" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                                Sécurité &amp; QHSE
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                Postes de contrôle
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                {activeCount} poste(s) actif(s), ordonnés selon
                                le parcours de ronde.
                            </p>
                        </div>
                        <Link
                            href="/postes-controle/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                            <Plus size={18} /> Nouveau poste
                        </Link>
                    </header>
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">#</th>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Poste</th>
                                        <th className="px-4 py-3">Site</th>
                                        <th className="px-4 py-3">
                                            Coordonnées
                                        </th>
                                        <th className="px-4 py-3">Passages</th>
                                        <th className="px-4 py-3">Statut</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {posts.map((post) => (
                                        <tr
                                            key={post.id}
                                            className="hover:bg-slate-50/80"
                                        >
                                            <td className="px-5 py-4">
                                                <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                                                    {post.ordre}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold">
                                                {post.code}
                                            </td>
                                            <td className="px-4 py-4 font-semibold">
                                                {post.nom}
                                            </td>
                                            <td className="px-4 py-4">
                                                {post.site
                                                    ? `${post.site.code} — ${post.site.nom}`
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-slate-500">
                                                {post.latitude &&
                                                post.longitude ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <MapPin size={14} />{' '}
                                                        {post.latitude},{' '}
                                                        {post.longitude}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                                                    <Route size={13} />{' '}
                                                    {post.passages_count}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${post.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                                                >
                                                    {post.actif
                                                        ? 'Actif'
                                                        : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/postes-controle/${post.id}/edit`}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Pencil size={14} />{' '}
                                                    Modifier
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {posts.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <Flag
                                                    size={38}
                                                    className="mx-auto mb-3 text-slate-300"
                                                />
                                                Aucun poste de contrôle.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
