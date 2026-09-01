import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

type ActionFlash = {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
};
type ActionProps = {
    flash?: ActionFlash;
    errors?: Record<string, string | string[]>;
};

type InitialPage = {
    props?: ActionProps;
};

const mutationMethods = new Set(['post', 'put', 'patch', 'delete']);

function readInitialProps(): ActionProps | undefined {
    const serializedPage = document.getElementById('app')?.dataset.page;

    if (!serializedPage) {
        return undefined;
    }

    try {
        return (JSON.parse(serializedPage) as InitialPage).props;
    } catch {
        return undefined;
    }
}

function showFlash(flash?: ActionFlash): boolean {
    if (!flash) {
        return false;
    }

    let displayed = false;

    if (flash.success) {
        toast.success(flash.success, {
            id: `action-success:${flash.success}`,
            description: 'Opération terminée avec succès.',
        });
        displayed = true;
    }

    if (flash.error) {
        toast.error(flash.error, {
            id: `action-error:${flash.error}`,
            description: "L'action n'a pas pu être finalisée.",
        });
        displayed = true;
    }

    if (flash.warning) {
        toast.warning(flash.warning, {
            id: `action-warning:${flash.warning}`,
        });
        displayed = true;
    }

    if (flash.info) {
        toast.info(flash.info, {
            id: `action-info:${flash.info}`,
        });
        displayed = true;
    }

    return displayed;
}

function showErrors(errors?: Record<string, string | string[]>): boolean {
    if (!errors) {
        return false;
    }

    const messages = Object.values(errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean);

    if (messages.length === 0) {
        return false;
    }

    toast.error(messages[0], {
        id: `action-validation:${messages.join('|')}`,
        description:
            messages.length > 1
                ? `${messages.length - 1} autre(s) erreur(s) doivent être corrigées.`
                : 'Vérifiez les informations saisies puis réessayez.',
    });

    return true;
}

export function useFlashToast(): void {
    const initialFeedbackShown = useRef(false);
    const currentMethod = useRef('get');

    useEffect(() => {
        if (initialFeedbackShown.current) {
            return;
        }

        initialFeedbackShown.current = true;
        const initialProps = readInitialProps();
        showFlash(initialProps?.flash);
        showErrors(initialProps?.errors);
    }, []);

    useEffect(() => {
        const removeBefore = router.on('before', (event) => {
            currentMethod.current = event.detail.visit.method.toLowerCase();
        });
        const removeSuccess = router.on('success', (event) => {
            const props = event.detail.page.props as ActionProps;
            const hasExplicitFeedback = showFlash(props.flash);

            if (
                !hasExplicitFeedback &&
                mutationMethods.has(currentMethod.current)
            ) {
                toast.success('Action réalisée avec succès.', {
                    id: `action-generic:${Date.now()}`,
                    description: 'Les modifications ont bien été enregistrées.',
                });
            }
        });
        const removeError = router.on('error', (event) => {
            showErrors(event.detail.errors);
        });
        const removeHttpException = router.on('httpException', (event) => {
            toast.error('La demande a échoué.', {
                id: `action-http:${event.detail.response.status}`,
                description: `Le serveur a répondu avec le statut ${event.detail.response.status}.`,
            });
        });
        const removeNetworkError = router.on('networkError', () => {
            toast.error('Connexion au serveur impossible.', {
                id: 'action-network-error',
                description:
                    'Vérifiez votre connexion puis relancez votre action.',
            });
        });
        const removeFlash = router.on('flash', (event) => {
            const data = event.detail.flash?.toast as FlashToast | undefined;

            if (data) {
                toast[data.type](data.message, {
                    id: `inertia-flash:${data.type}:${data.message}`,
                });
            }
        });

        return () => {
            removeBefore();
            removeSuccess();
            removeError();
            removeHttpException();
            removeNetworkError();
            removeFlash();
        };
    }, []);
}
