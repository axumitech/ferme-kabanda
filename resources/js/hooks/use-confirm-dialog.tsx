import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useCallback, useState } from 'react';

type ConfirmOptions = {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
};

export function useConfirmDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({});
    const [resolver, setResolver] = useState<(value: boolean) => void>();

    const confirm = useCallback((newOptions: ConfirmOptions): Promise<boolean> => {
        setOptions(newOptions);
        setIsOpen(true);
        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        resolver?.(true);
    }, [resolver]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        resolver?.(false);
    }, [resolver]);

    const ConfirmDialog = useCallback(() => {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{options.title ?? 'Confirmer'}</DialogTitle>
                        {options.description && (
                            <DialogDescription>{options.description}</DialogDescription>
                        )}
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            {options.cancelText ?? 'Annuler'}
                        </Button>
                        <Button
                            variant={options.variant ?? 'default'}
                            onClick={handleConfirm}
                        >
                            {options.confirmText ?? 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }, [isOpen, options, handleCancel, handleConfirm]);

    return { confirm, ConfirmDialog };
}
