import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { AlertTriangle, CheckCircle2, Info, OctagonX } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="fkn-toaster group"
            position="top-right"
            expand
            richColors
            closeButton
            visibleToasts={5}
            duration={5200}
            gap={12}
            offset="1.25rem"
            icons={{
                success: <CheckCircle2 className="size-5" />,
                error: <OctagonX className="size-5" />,
                warning: <AlertTriangle className="size-5" />,
                info: <Info className="size-5" />,
            }}
            toastOptions={{
                classNames: {
                    toast: '!w-[min(420px,calc(100vw-2rem))] !rounded-2xl !border !px-4 !py-4 !shadow-[0_18px_55px_rgba(15,23,42,.2)] backdrop-blur-xl',
                    success:
                        '!border-emerald-200 !bg-white/95 !text-emerald-950 dark:!border-emerald-800 dark:!bg-emerald-950/95 dark:!text-emerald-50',
                    error: '!border-red-200 !bg-white/95 !text-red-950 dark:!border-red-800 dark:!bg-red-950/95 dark:!text-red-50',
                    warning:
                        '!border-amber-200 !bg-white/95 !text-amber-950 dark:!border-amber-800 dark:!bg-amber-950/95 dark:!text-amber-50',
                    info: '!border-blue-200 !bg-white/95 !text-blue-950 dark:!border-blue-800 dark:!bg-blue-950/95 dark:!text-blue-50',
                    title: '!text-sm !font-black !tracking-tight',
                    description: '!mt-1 !text-xs !leading-5 !opacity-70',
                    icon: '!mr-2',
                    closeButton:
                        '!border-slate-200 !bg-white !text-slate-500 !shadow-sm hover:!text-slate-900 dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-300',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
