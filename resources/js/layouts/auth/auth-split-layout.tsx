import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="auth-screen relative grid min-h-dvh bg-[#f5f1e8] lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative hidden min-h-dvh overflow-hidden bg-[#123f29] p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute inset-0 [background-image:radial-gradient(circle_at_20%_15%,#d9a441_0,transparent_28%),radial-gradient(circle_at_85%_80%,#80a56b_0,transparent_32%)] opacity-20" />
                <div className="absolute top-1/2 -right-28 h-96 w-96 -translate-y-1/2 rounded-full border border-white/10" />
                <div className="absolute top-1/2 -right-8 h-64 w-64 -translate-y-1/2 rounded-full border border-white/10" />
                <Link
                    href={home()}
                    className="relative z-20 flex items-center gap-3 text-lg font-semibold tracking-wide"
                >
                    <img
                        src="/brand-logo.png"
                        className="size-12 rounded-xl bg-white p-1"
                        alt="Logo Ferme Kabanda Naweza"
                    />
                    <span>
                        FERME KABANDA{' '}
                        <span className="text-[#d8b36a]">NAWEZA</span>
                    </span>
                </Link>
                <div className="relative z-10 max-w-xl pb-14">
                    <div className="mb-6 h-px w-16 bg-[#d8b36a]" />
                    <p className="text-sm font-semibold tracking-[.24em] text-[#d8b36a]">
                        PILOTAGE AGRICOLE
                    </p>
                    <h2 className="mt-4 text-5xl leading-[1.08] font-semibold tracking-tight">
                        Cultiver avec précision.
                        <br />
                        Décider avec confiance.
                    </h2>
                    <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
                        Suivez les parcelles, l’élevage, les stocks et les
                        équipes depuis un espace sécurisé, pensé pour le
                        terrain.
                    </p>
                </div>
                <div className="relative z-10 flex gap-8 border-t border-white/10 pt-7 text-sm text-white/60">
                    <span>19,57 ha suivis</span>
                    <span>Deux bureaux techniques</span>
                    <span>Données sécurisées</span>
                </div>
            </div>
            <div className="flex min-h-dvh w-full items-center px-6 py-12 sm:px-10 lg:px-16">
                <div className="mx-auto flex w-full max-w-[430px] flex-col justify-center rounded-2xl border border-[#ded7c8] bg-white p-7 shadow-[0_24px_80px_rgba(34,54,41,.10)] sm:p-10">
                    <Link
                        href={home()}
                        className="mb-8 flex items-center gap-3 font-semibold text-[#16462f] lg:hidden"
                    >
                        <img
                            src="/brand-logo.png"
                            className="size-11 rounded-xl bg-white p-1 shadow-sm"
                            alt="Logo Ferme Kabanda Naweza"
                        />
                        FERME KABANDA NAWEZA
                    </Link>
                    <div className="mb-8 flex flex-col items-start gap-2 text-left">
                        <span className="rounded-full bg-[#edf4ee] px-3 py-1 text-xs font-semibold tracking-wide text-[#27633f]">
                            ESPACE SÉCURISÉ
                        </span>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#18372b]">
                            {title}
                        </h1>
                        <p className="text-sm leading-6 text-[#6e756f]">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
