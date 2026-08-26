import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <img
                src="/brand-logo.png"
                alt="Logo Ferme Kabanda Naweza"
                className="size-9 rounded-lg bg-white object-contain p-0.5 shadow-sm"
            />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
