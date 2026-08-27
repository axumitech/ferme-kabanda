import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Mail,
    Pencil,
    Phone,
    Search,
    ShieldCheck,
    Unlink,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { AdminLayout } from './AdminLayout';

type Member = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    reference_item_id: number | null;
    team_member: TeamMember | null;
    is_admin: boolean;
    created_at: string;
};

type TeamMember = {
    id: number;
    category: 'agents_agri' | 'agents_ani';
    label: string;
    active: boolean;
    member_account?: { id: number; name: string } | null;
};

type Props = {
    members: Member[];
    teamMembers: TeamMember[];
    initialReferenceItemId: number | null;
};

const emptyMember = {
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    reference_item_id: '',
    is_admin: false,
};

export default function MembersAdmin({
    members,
    teamMembers,
    initialReferenceItemId,
}: Props) {
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const { auth } = usePage().props;
    const currentUser = auth.user as { id: number };
    const [editing, setEditing] = useState<Member | null>(null);
    const [query, setQuery] = useState('');
    const form = useForm({
        ...emptyMember,
        reference_item_id: initialReferenceItemId?.toString() ?? '',
    });

    const visibleMembers = useMemo(() => {
        const search = query.toLowerCase().trim();

        return members.filter((member) =>
            [
                member.name,
                member.email ?? '',
                member.phone ?? '',
                member.team_member?.label ?? '',
            ].some((value) => value.toLowerCase().includes(search)),
        );
    }, [members, query]);

    // ADD TEST TO SEA IF IT'S WORK

    const reset = () => {
        setEditing(null);
        form.setData({ ...emptyMember, reference_item_id: '' });
        form.clearErrors();
    };

    const edit = (member: Member) => {
        setEditing(member);
        form.setData({
            name: member.name,
            email: member.email ?? '',
            phone: member.phone ?? '',
            password: '',
            password_confirmation: '',
            reference_item_id: member.reference_item_id?.toString() ?? '',
            is_admin: member.is_admin,
        });
        form.clearErrors();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (editing) {
            form.put(`/admin/members/${editing.id}`, {
                preserveScroll: true,
                onSuccess: reset,
            });
        } else {
            form.post('/admin/members', {
                preserveScroll: true,
                onSuccess: reset,
            });
        }
    };

    const remove = async (member: Member) => {
        if (member.id === currentUser.id) return;
        
        if (
            await confirm({
                title: 'Confirmation de suppression',
                description: `Supprimer le compte de ${member.name} ?`,
                confirmText: 'Supprimer',
                variant: 'destructive',
            })
        ) {
            router.delete(`/admin/members/${member.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout
            title="Gestion des membres"
            subtitle="Gérez l'accès à l'application"
        >
            <ConfirmDialog />
            <Head title="Gestion des membres" />

            <div className="admin-animate-in mx-auto grid min-w-0 max-w-7xl gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                <section className="h-fit admin-form-panel lg:sticky lg:top-5">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-[#e7f1e9] p-2.5 text-[#276644]">
                            <UserPlus className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-[15px] text-[#17352a]">
                                {editing
                                    ? 'Modifier le membre'
                                    : 'Nouveau membre'}
                            </h2>
                            <p className="text-[13px] text-[#637069]">
                                Le téléphone servira aussi d’identifiant.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="grid gap-4">
                        <Field
                            label="Personne dans l’équipe (facultatif)"
                            error={form.errors.reference_item_id}
                        >
                            <select
                                value={form.data.reference_item_id}
                                onChange={(event) =>
                                    form.setData(
                                        'reference_item_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Aucun rattachement</option>
                                <TeamOptions
                                    label="Équipe agricole"
                                    category="agents_agri"
                                    teamMembers={teamMembers}
                                    editingId={editing?.id}
                                />
                                <TeamOptions
                                    label="Équipe élevage"
                                    category="agents_ani"
                                    teamMembers={teamMembers}
                                    editingId={editing?.id}
                                />
                            </select>
                            <span className="text-[11px] font-normal text-[#637069]">
                                Cette liaison permet d’identifier les données
                                saisies par cette personne.
                            </span>
                        </Field>
                        <Field label="Nom complet" error={form.errors.name}>
                            <input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Ex. Jean Kabeya"
                                required
                            />
                        </Field>
                        <p className="admin-form-hint -mt-2">
                            Utilisez le nom que l’équipe reconnaît sur les feuilles terrain.
                        </p>
                        <Field
                            label="Numéro de téléphone"
                            error={form.errors.phone}
                        >
                            <input
                                type="tel"
                                value={form.data.phone}
                                onChange={(event) =>
                                    form.setData('phone', event.target.value)
                                }
                                placeholder="Ex. +243 812 345 678"
                                autoComplete="tel"
                                required
                            />
                        </Field>
                        <p className="admin-form-hint -mt-2">
                            Le téléphone devient l’identifiant simple pour les agents sans e-mail.
                        </p>
                        <Field
                            label="Adresse e-mail (facultative)"
                            error={form.errors.email}
                        >
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                placeholder="membre@fermekabanda.cd"
                                autoComplete="email"
                            />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            <Field
                                label={
                                    editing
                                        ? 'Nouveau mot de passe'
                                        : 'Mot de passe'
                                }
                                error={form.errors.password}
                            >
                                <input
                                    type="password"
                                    value={form.data.password}
                                    onChange={(event) =>
                                        form.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    placeholder={
                                        editing
                                            ? 'Laisser inchangé'
                                            : '8 caractères minimum'
                                    }
                                    required={!editing}
                                />
                                {!editing && (
                                    <span className="admin-form-hint">Minimum 8 caractères.</span>
                                )}
                            </Field>
                            <Field
                                label="Confirmation"
                                error={form.errors.password_confirmation}
                            >
                                <input
                                    type="password"
                                    value={form.data.password_confirmation}
                                    onChange={(event) =>
                                        form.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Répéter le mot de passe"
                                    required={
                                        !editing || form.data.password !== ''
                                    }
                                />
                            </Field>
                        </div>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e1d8] bg-[#faf9f5] p-3">
                            <input
                                type="checkbox"
                                checked={form.data.is_admin}
                                onChange={(event) =>
                                    form.setData(
                                        'is_admin',
                                        event.target.checked,
                                    )
                                }
                                className="mt-0.5 size-4 rounded text-[#174a31] focus:ring-[#174a31]/20 cursor-pointer"
                            />
                            <span>
                                <span className="block text-[13.5px] font-semibold text-[#17352a]">
                                    Accès administrateur
                                </span>
                                <span className="block text-[12px] text-[#637069] mt-0.5">
                                    Autorise la gestion des membres et des
                                    données.
                                </span>
                            </span>
                        </label>
                        {form.errors.is_admin && (
                            <p className="text-[11px] font-medium text-[#c0392b]">
                                {form.errors.is_admin}
                            </p>
                        )}

                        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                            {editing && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="admin-btn-secondary flex-1"
                                >
                                    Annuler
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="admin-btn-submit flex-1"
                            >
                                {form.processing
                                    ? 'Enregistrement…'
                                    : editing
                                      ? 'Mettre à jour'
                                      : 'Ajouter le membre'}
                            </button>
                        </div>
                    </form>
                </section>

                <section>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11.5px] font-bold tracking-[.15em] text-[#b16a2f]">
                                ÉQUIPE
                            </p>
                            <h2 className="text-2xl font-semibold text-[#17352a]">
                                {members.length} membre{members.length > 1 ? 's' : ''}
                            </h2>
                            <p className="mt-1 text-[13px] text-[#637069]">
                                {
                                    members.filter(
                                        (member) => member.team_member,
                                    ).length
                                }{' '}
                                rattaché(s) à une équipe
                            </p>
                        </div>
                        <div className="admin-search mb-0 sm:max-w-xs w-full">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Rechercher un membre…"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {visibleMembers.map((member) => (
                            <article
                                key={member.id}
                                className="admin-card p-4 transition-colors hover:bg-[#f9f8f5]"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e7f1e9] font-bold text-[#276644] text-lg shadow-sm">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-[15px] text-[#17352a]">
                                                    {member.name}
                                                </h3>
                                                {member.is_admin && (
                                                    <span className="admin-badge admin-badge--gold">
                                                        <ShieldCheck size={12} />
                                                        Admin
                                                    </span>
                                                )}
                                                {member.team_member ? (
                                                    <span className="admin-badge admin-badge--green">
                                                        <Users size={12} />
                                                        Compte rattaché
                                                    </span>
                                                ) : (
                                                    <span className="admin-badge admin-badge--gray" style={{ background: '#eeeae2', color: '#77766f' }}>
                                                        <Unlink size={12} />
                                                        Non rattaché
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 grid gap-1.5 text-[13px] text-[#4a5750] sm:flex sm:flex-wrap sm:gap-x-4">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Phone size={14} className="text-[#9aaa9f]" />
                                                    {member.phone ??
                                                        'Téléphone non renseigné'}
                                                </span>
                                                {member.email && (
                                                    <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                                                        <Mail size={14} className="text-[#9aaa9f] shrink-0" />
                                                        {member.email}
                                                    </span>
                                                )}
                                            </div>
                                            {member.team_member && (
                                                <div className="mt-2.5 rounded-lg bg-[#f4f8f4] px-3 py-1.5 text-[12.5px] text-[#267049] inline-block border border-[#e2efe6]">
                                                    <span className="font-semibold">
                                                        {member.team_member
                                                            .category ===
                                                        'agents_agri'
                                                            ? 'Équipe agricole'
                                                            : 'Équipe élevage'}
                                                    </span>{' '}
                                                    · {member.team_member.label}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 sm:shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => edit(member)}
                                            className="admin-btn-secondary"
                                        >
                                            <Pencil size={15} /> Modifier
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(member)}
                                            disabled={
                                                member.id === currentUser.id
                                            }
                                            title={
                                                member.id === currentUser.id
                                                    ? 'Votre compte ne peut pas être supprimé ici'
                                                    : 'Supprimer ce membre'
                                            }
                                            className="admin-btn-icon hover:!bg-[#fdf2f1] hover:!text-[#c0392b] hover:!border-[#f5c6c2] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}

                        {visibleMembers.length === 0 && (
                            <div className="admin-empty py-12">
                                <Users className="mx-auto mb-3 size-8 opacity-50" />
                                Aucun membre ne correspond à cette recherche.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

function TeamOptions({
    label,
    category,
    teamMembers,
    editingId,
}: {
    label: string;
    category: TeamMember['category'];
    teamMembers: TeamMember[];
    editingId?: number;
}) {
    return (
        <optgroup label={label}>
            {teamMembers
                .filter((member) => member.category === category)
                .map((member) => {
                    const unavailable =
                        member.member_account &&
                        member.member_account.id !== editingId;

                    return (
                        <option
                            key={member.id}
                            value={member.id}
                            disabled={Boolean(unavailable)}
                        >
                            {member.label}
                            {unavailable
                                ? ` — lié à ${member.member_account?.name}`
                                : ''}
                        </option>
                    );
                })}
        </optgroup>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="admin-field">
            <label>{label}</label>
            {children}
            {error && <span className="text-[11px] font-medium text-[#c0392b]">{error}</span>}
        </div>
    );
}
