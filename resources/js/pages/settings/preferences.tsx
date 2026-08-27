import { Head, useForm } from '@inertiajs/react';
import { Globe2, Languages, WifiOff } from 'lucide-react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type LocaleOption = {
    value: 'fr' | 'en';
    label: string;
};

type Props = {
    locale: 'fr' | 'en';
    locales: LocaleOption[];
};

export default function Preferences({ locale, locales }: Props) {
    const form = useForm({
        locale,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.put('/settings/preferences', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Préférences" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Préférences"
                    description="Choisissez la langue de l’interface et les réglages de confort."
                />

                <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Languages className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">Langue de l’application</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Ce réglage est enregistré sur votre compte. Les textes traduits progressivement utiliseront cette langue.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {locales.map((option) => (
                            <label
                                key={option.value}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                                    form.data.locale === option.value
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                                        : 'border-border bg-background hover:bg-muted/60'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="locale"
                                    value={option.value}
                                    checked={form.data.locale === option.value}
                                    onChange={() => form.setData('locale', option.value)}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="flex items-center gap-2 font-semibold">
                                        <Globe2 className="size-4" />
                                        {option.label}
                                    </span>
                                    <span className="mt-1 block text-sm text-muted-foreground">
                                        {option.value === 'fr'
                                            ? 'Interface principale en français.'
                                            : 'Main interface in English.'}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <InputError message={form.errors.locale} />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Enregistrement…' : 'Enregistrer les préférences'}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Certaines anciennes sections terrain seront traduites au fur et à mesure de leur refonte.
                        </p>
                    </div>
                </form>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                            <WifiOff className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">Mode hors ligne</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Installez l’application depuis le navigateur pour l’ouvrir comme une app mobile.
                                Les pages déjà visitées restent disponibles et certaines opérations terrain sont mises en attente si le réseau tombe.
                            </p>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                <li>Marquer une tâche faite ou justifiée depuis “Ma journée”.</li>
                                <li>Sauvegarder les données terrain synchronisées.</li>
                                <li>Rejouer automatiquement la file dès que la connexion revient.</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

Preferences.layout = {
    breadcrumbs: [
        {
            title: 'Préférences',
            href: '/settings/preferences',
        },
    ],
};
