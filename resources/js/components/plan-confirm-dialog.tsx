import { AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function PlanConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    processing = false,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    processing?: boolean;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-xl">
                <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-6 text-white">
                    <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                            <AlertCircle size={22} />
                        </span>
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-xl text-white">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="mt-1 leading-6 text-slate-300">
                                {description}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                </div>
                <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4">
                    <button
                        type="button"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                        className="min-h-10 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={processing}
                        onClick={onConfirm}
                        className="min-h-10 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                    >
                        {processing ? 'Traitement…' : confirmLabel}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
