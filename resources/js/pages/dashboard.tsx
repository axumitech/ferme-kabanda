import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CircleX } from 'lucide-react';

type Task = {
    id: number;
    reference: string;
    titre: string;
    date_due: string;
    escalade_niveau?: number | null;
    responsable?: { id: number; name: string } | null;
    departement?: { id: number; code: string; nom: string } | null;
};

type Decision = {
    id: number;
    reference: string;
    title: string;
    description?: string | null;
    responsible?: string | null;
    nature: string;
    estimatedCost?: number | null;
};

type Activity = {
    heure: string;
    categorie: string;
    titre: string;
    par: string;
    lien: string;
};

type Performance = {
    id: number;
    name: string;
    department?: string | null;
    dues: number;
    done: number;
    justified: number;
    unjustified: number;
    open: number;
    rate: number | null;
};

type CommercialChannel = {
    channel: string;
    amount: number;
    share: number;
    count: number;
};

type Props = {
    stats: {
        tasksToday: number;
        openTasks: number;
        lateTasks: number;
        doneToday: number;
        dueTasks: number;
        pendingApprovals: number;
        ddeToValidate: number;
        requisitionsInCircuit: number;
        openIncidents: number;
    };
    overdueTasks: Task[];
    decisions: Decision[];
    latestActivity: Activity[];
    hierarchyLevel: number;
    commercial: {
        total: number;
        count: number;
        outstanding: number;
        channels: CommercialChannel[];
    };
    equipment: {
        maintenanceDue: number;
        unavailable: number;
        active: number;
        thirdPartyRevenue: number;
        operatingCosts: number;
    };
    performance: Performance[];
    maintenance: {
        openOrders: number;
        urgentOrders: number;
        overThirtyDays: number;
        preventiveShare: number | null;
        averageRepairHours: number | null;
        downtimeHours: number;
        recurringFailures: number;
    };
};

const money = (value: number): string =>
    `${new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)} USD`;

const shortDate = (value: string): string => {
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('fr-FR', {
              day: '2-digit',
              month: '2-digit',
          }).format(date);
};

const overdueDays = (value: string): number => {
    const due = new Date(`${value.slice(0, 10)}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return Math.max(
        0,
        Math.floor((today.getTime() - due.getTime()) / 86_400_000),
    );
};

const escalation = (level?: number | null): string => {
    if (level === 1) {
        return 'J+2 Superviseur';
    }

    if (level === 2) {
        return 'J+5 Direction';
    }

    if (level && level >= 3) {
        return 'J+10 Disciplinaire';
    }

    return '—';
};

export default function Dashboard({
    stats,
    overdueTasks,
    decisions,
    latestActivity,
    hierarchyLevel,
    commercial,
    equipment,
    performance,
    maintenance,
}: Props) {
    const canManage = hierarchyLevel <= 3;
    const canDirect = hierarchyLevel <= 2;
    const overdueScope =
        hierarchyLevel === 3
            ? ' — mon département'
            : hierarchyLevel >= 4
              ? ' — les miennes'
              : ' — toute la ferme';

    return (
        <>
            <Head title="Ferme Kabanda Naweza — Tableau de bord" />
            <main className="min-h-[calc(100svh-4rem)] bg-[#f9fafb] px-4 py-6 text-[#111827] sm:px-6 lg:px-8 dark:bg-[#111113] dark:text-white">
                <div className="w-full space-y-6">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Ferme Kabanda Naweza — Tableau de bord
                    </h1>

                    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <StatCard
                            label="Tâches dues aujourd’hui"
                            value={stats.dueTasks}
                            description={
                                stats.lateTasks > 0
                                    ? `${stats.lateTasks} en retard`
                                    : 'Aucun retard'
                            }
                            tone={stats.lateTasks > 0 ? 'danger' : 'success'}
                        />
                        {canManage && (
                            <>
                                <StatCard
                                    label="Approbations en attente"
                                    value={stats.pendingApprovals}
                                    description="Actions proposées par les équipes"
                                    tone="warning"
                                />
                                <StatCard
                                    label="Dossiers DDE à valider"
                                    value={stats.ddeToValidate}
                                    description="La machine propose, vous confirmez"
                                    tone="danger"
                                />
                            </>
                        )}
                        {canDirect && (
                            <>
                                <StatCard
                                    label="Réquisitions en circuit"
                                    value={stats.requisitionsInCircuit}
                                    description="À vérifier ou approuver (DoA)"
                                    tone="info"
                                />
                                <StatCard
                                    label="Incidents ouverts"
                                    value={stats.openIncidents}
                                    description="Échéances 1 h / 4 h / 48 h / 72 h"
                                    tone="danger"
                                />
                            </>
                        )}
                    </section>

                    {canManage && (
                        <TablePanel title="En attente de votre décision">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr>
                                        <Th>Référence</Th>
                                        <Th>Objet</Th>
                                        <Th>Demandeur / responsable</Th>
                                        <Th>Nature</Th>
                                        <Th>Coût est.</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {decisions.map((decision) => (
                                        <tr
                                            key={decision.id}
                                            className="border-t border-[#e5e7eb] dark:border-white/10"
                                        >
                                            <Td>
                                                <Link
                                                    href="/admin/operations"
                                                    className="font-semibold text-[#1a5632] hover:underline dark:text-[#62c487]"
                                                >
                                                    {decision.reference}
                                                </Link>
                                            </Td>
                                            <Td>
                                                <div className="font-medium">
                                                    {decision.title}
                                                </div>
                                                {decision.description && (
                                                    <div className="mt-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                                                        {decision.description}
                                                    </div>
                                                )}
                                            </Td>
                                            <Td>
                                                {decision.responsible ?? '—'}
                                            </Td>
                                            <Td>
                                                <Badge tone="danger">
                                                    {decision.nature}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                {decision.estimatedCost == null
                                                    ? '—'
                                                    : money(
                                                          decision.estimatedCost,
                                                      )}
                                            </Td>
                                        </tr>
                                    ))}
                                    {decisions.length === 0 && (
                                        <EmptyRow
                                            colSpan={5}
                                            label="Aucune tâche"
                                        />
                                    )}
                                </tbody>
                            </table>
                        </TablePanel>
                    )}

                    <TablePanel title={`Tâches en retard${overdueScope}`}>
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead>
                                <tr>
                                    <Th>Due le</Th>
                                    <Th>Référence</Th>
                                    <Th>Tâche</Th>
                                    <Th>Responsable</Th>
                                    <Th>Dépt.</Th>
                                    <Th>Escalade</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="border-t border-[#e5e7eb] dark:border-white/10"
                                    >
                                        <Td>
                                            <div className="font-semibold text-red-600 dark:text-red-400">
                                                {shortDate(task.date_due)}
                                            </div>
                                            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                                Retard{' '}
                                                {overdueDays(task.date_due)} j
                                            </div>
                                        </Td>
                                        <Td>{task.reference}</Td>
                                        <Td>
                                            <Link
                                                href="/admin/operations"
                                                className="font-medium text-[#1a5632] hover:underline dark:text-[#62c487]"
                                            >
                                                {task.titre}
                                            </Link>
                                        </Td>
                                        <Td>{task.responsable?.name ?? '—'}</Td>
                                        <Td>
                                            <Badge>
                                                {task.departement?.code ?? '—'}
                                            </Badge>
                                        </Td>
                                        <Td>
                                            <Badge
                                                tone={
                                                    (task.escalade_niveau ??
                                                        0) >= 2
                                                        ? 'danger'
                                                        : (task.escalade_niveau ??
                                                                0) === 1
                                                          ? 'warning'
                                                          : 'gray'
                                                }
                                            >
                                                {escalation(
                                                    task.escalade_niveau,
                                                )}
                                            </Badge>
                                        </Td>
                                    </tr>
                                ))}
                                {overdueTasks.length === 0 && (
                                    <EmptyRow
                                        colSpan={6}
                                        label="Aucune tâche"
                                    />
                                )}
                            </tbody>
                        </table>
                    </TablePanel>

                    {canManage && (
                        <TablePanel title="Portées en maternité — effectif théorique">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead>
                                    <tr>
                                        <Th>Truie</Th>
                                        <Th>Mise bas</Th>
                                        <Th>Nés vivants</Th>
                                        <Th>Morts</Th>
                                        <Th>Confiés / reçus</Th>
                                        <Th>Vivants attendus</Th>
                                        <Th>Mortalité maternité</Th>
                                        <Th>Sevrage prévu</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <EmptyRow
                                        colSpan={8}
                                        label="Aucun cycle de reproduction"
                                    />
                                </tbody>
                            </table>
                        </TablePanel>
                    )}

                    {canDirect && (
                        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Ventes 30 jours"
                                value={money(commercial.total)}
                                description={`${commercial.count} bon(s) de livraison`}
                                tone="success"
                            />
                            <StatCard
                                label="Reste à recouvrer"
                                value={money(commercial.outstanding)}
                                description={
                                    commercial.outstanding > 0
                                        ? 'Crédits clients ouverts'
                                        : 'Tout est soldé'
                                }
                                tone={
                                    commercial.outstanding > 0
                                        ? 'danger'
                                        : 'success'
                                }
                            />
                            {commercial.channels.map((channel) => (
                                <StatCard
                                    key={channel.channel}
                                    label={channel.channel}
                                    value={money(channel.amount)}
                                    description={`${channel.share} % du chiffre · ${channel.count} bon(s)`}
                                    tone={
                                        channel.channel
                                            .toLowerCase()
                                            .includes('ezhl')
                                            ? 'success'
                                            : 'gray'
                                    }
                                />
                            ))}
                        </section>
                    )}

                    {canManage && (
                        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Entretiens dus"
                                value={equipment.maintenanceDue}
                                description={
                                    equipment.maintenanceDue > 0
                                        ? 'Échéances atteintes ou proches'
                                        : 'Parc à jour'
                                }
                                tone={
                                    equipment.maintenanceDue > 0
                                        ? 'danger'
                                        : 'success'
                                }
                            />
                            <StatCard
                                label="Machines immobilisées"
                                value={equipment.unavailable}
                                description={`${equipment.active} équipements actifs`}
                                tone={
                                    equipment.unavailable > 0
                                        ? 'warning'
                                        : 'success'
                                }
                            />
                            <StatCard
                                label="Prestations tiers — 30 j"
                                value={money(equipment.thirdPartyRevenue)}
                                description="Travaux facturés à l’extérieur"
                                tone="success"
                            />
                            <StatCard
                                label="Coûts d’exploitation — 30 j"
                                value={money(equipment.operatingCosts)}
                                description="Carburant et maintenance"
                                tone="gray"
                            />
                        </section>
                    )}

                    {canManage && (
                        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Ordres ouverts"
                                value={maintenance.openOrders}
                                description={`${maintenance.urgentOrders} urgent(s) · ${maintenance.overThirtyDays} de plus de 30 jours`}
                                tone={
                                    maintenance.urgentOrders > 0 ||
                                    maintenance.overThirtyDays > 0
                                        ? 'danger'
                                        : 'success'
                                }
                            />
                            <StatCard
                                label="Part du préventif"
                                value={
                                    maintenance.preventiveShare === null
                                        ? '—'
                                        : `${maintenance.preventiveShare} %`
                                }
                                description={
                                    maintenance.preventiveShare !== null &&
                                    maintenance.preventiveShare < 50
                                        ? 'Sous 50 % : on subit les pannes'
                                        : 'Les pannes sont devancées'
                                }
                                tone={
                                    maintenance.preventiveShare === null
                                        ? 'gray'
                                        : maintenance.preventiveShare >= 50
                                          ? 'success'
                                          : 'danger'
                                }
                            />
                            <StatCard
                                label="Temps moyen de réparation"
                                value={
                                    maintenance.averageRepairHours === null
                                        ? '—'
                                        : `${maintenance.averageRepairHours} h`
                                }
                                description={`${maintenance.downtimeHours} h d’immobilisation sur 90 jours`}
                                tone="info"
                            />
                            <StatCard
                                label="Pannes récurrentes"
                                value={maintenance.recurringFailures}
                                description={
                                    maintenance.recurringFailures > 0
                                        ? 'Même cible réparée deux fois — cause racine à traiter'
                                        : 'Aucune répétition constatée'
                                }
                                tone={
                                    maintenance.recurringFailures > 0
                                        ? 'warning'
                                        : 'success'
                                }
                            />
                        </section>
                    )}

                    {canDirect && (
                        <TablePanel title="Performance par personne — 30 derniers jours">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead>
                                    <tr>
                                        <Th>Personne</Th>
                                        <Th>Dues</Th>
                                        <Th>Faites</Th>
                                        <Th>Justifiées</Th>
                                        <Th>Non justifiées</Th>
                                        <Th>Ouvertes</Th>
                                        <Th>Taux</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performance.map((person) => (
                                        <tr
                                            key={person.id}
                                            className="border-t border-[#e5e7eb] dark:border-white/10"
                                        >
                                            <Td>
                                                <div className="font-medium">
                                                    {person.name}
                                                </div>
                                                {person.department && (
                                                    <div className="mt-1 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                                                        {person.department}
                                                    </div>
                                                )}
                                            </Td>
                                            <Td>{person.dues}</Td>
                                            <Td>
                                                <span className="text-emerald-700 dark:text-emerald-400">
                                                    {person.done}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-amber-700 dark:text-amber-400">
                                                    {person.justified}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span
                                                    className={
                                                        person.unjustified > 0
                                                            ? 'font-bold text-red-600 dark:text-red-400'
                                                            : ''
                                                    }
                                                >
                                                    {person.unjustified}
                                                </span>
                                            </Td>
                                            <Td>{person.open}</Td>
                                            <Td>
                                                <Badge
                                                    tone={
                                                        person.rate === null
                                                            ? 'gray'
                                                            : person.rate >= 90
                                                              ? 'success'
                                                              : person.rate >=
                                                                  60
                                                                ? 'warning'
                                                                : 'danger'
                                                    }
                                                >
                                                    {person.rate === null
                                                        ? '—'
                                                        : `${person.rate} %`}
                                                </Badge>
                                            </Td>
                                        </tr>
                                    ))}
                                    {performance.length === 0 && (
                                        <EmptyRow
                                            colSpan={7}
                                            label="Aucune performance à afficher"
                                        />
                                    )}
                                </tbody>
                            </table>
                        </TablePanel>
                    )}

                    <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm dark:border-white/10 dark:bg-[#1f1f22]">
                        <div className="border-b border-[#e5e7eb] px-6 py-5 dark:border-white/10">
                            <h2 className="text-base font-semibold">
                                Dernières écritures de la ferme
                            </h2>
                            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                                Ce que vos collègues ont consigné aujourd’hui
                            </p>
                        </div>
                        <ul className="divide-y divide-[#e5e7eb] px-6 dark:divide-white/10">
                            {latestActivity.map((entry, index) => (
                                <li
                                    key={`${entry.heure}-${index}`}
                                    className="flex flex-wrap items-baseline gap-3 py-3 text-sm"
                                >
                                    <span className="w-12 shrink-0 text-[#9ca3af]">
                                        {entry.heure}
                                    </span>
                                    <Badge>{entry.categorie}</Badge>
                                    {entry.lien ? (
                                        <Link
                                            href={entry.lien}
                                            className="min-w-0 flex-1 font-medium text-[#1a5632] hover:underline dark:text-[#62c487]"
                                        >
                                            {entry.titre}
                                        </Link>
                                    ) : (
                                        <span className="min-w-0 flex-1">
                                            {entry.titre}
                                        </span>
                                    )}
                                    <span className="shrink-0 text-xs text-[#9ca3af]">
                                        {entry.par}
                                    </span>
                                </li>
                            ))}
                            {latestActivity.length === 0 && (
                                <li className="py-5 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                                    Aucune écriture aujourd’hui pour l’instant.
                                </li>
                            )}
                        </ul>
                        <div className="border-t border-[#e5e7eb] px-6 py-4 dark:border-white/10">
                            <Link
                                href="/journal-ferme"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a5632] hover:underline dark:text-[#62c487]"
                            >
                                Voir le journal complet <ArrowRight size={16} />
                            </Link>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

type Tone = 'gray' | 'success' | 'warning' | 'danger' | 'info';

const toneText: Record<Tone, string> = {
    gray: 'text-[#6b7280] dark:text-[#9ca3af]',
    success: 'text-emerald-700 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
};

function StatCard({
    label,
    value,
    description,
    tone = 'gray',
}: {
    label: string;
    value: string | number;
    description: string;
    tone?: Tone;
}) {
    return (
        <article className="min-h-40 rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1f1f22]">
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                {label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
                {value}
            </p>
            <p className={`mt-3 text-sm ${toneText[tone]}`}>{description}</p>
        </article>
    );
}

function TablePanel({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm dark:border-white/10 dark:bg-[#1f1f22]">
            <div className="border-b border-[#e5e7eb] px-6 py-5 dark:border-white/10">
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <div className="overflow-x-auto">{children}</div>
        </section>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="bg-[#f3f4f6] px-6 py-3 text-xs font-semibold text-[#374151] dark:bg-white/[0.06] dark:text-[#e5e7eb]">
            {children}
        </th>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-6 py-4 align-top">{children}</td>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="h-40 text-center">
                <div className="inline-flex flex-col items-center gap-3 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    <span className="grid size-10 place-items-center rounded-full bg-[#f3f4f6] dark:bg-white/[0.08]">
                        <CircleX size={20} />
                    </span>
                    <span className="font-medium">{label}</span>
                </div>
            </td>
        </tr>
    );
}

function Badge({
    children,
    tone = 'gray',
}: {
    children: React.ReactNode;
    tone?: Tone;
}) {
    const classes: Record<Tone, string> = {
        gray: 'bg-[#f3f4f6] text-[#4b5563] dark:bg-white/10 dark:text-[#d1d5db]',
        success:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning:
            'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    };

    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${classes[tone]}`}
        >
            {children}
        </span>
    );
}
