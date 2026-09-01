import { Link } from '@inertiajs/react';
import { useI18n } from '@/lib/i18n';

type Props = {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
};

export function AdminLayout({ children, title, subtitle }: Props) {
    const { tr } = useI18n();

    return (
        <div className="admin-screen min-h-[calc(100svh-4rem)] bg-zinc-50 text-[#17352a]">
            <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <Link
                            href="/admin"
                            className="transition hover:text-[#1A5632]"
                        >
                            Administration
                        </Link>
                        <span aria-hidden="true">›</span>
                        <span>{tr(title)}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                        {tr(title)}
                    </h1>
                    {subtitle && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                            {tr(subtitle)}
                        </p>
                    )}
                </div>

                <main className="admin-premium">{children}</main>
            </div>
        </div>
    );
}
