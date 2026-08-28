import { Form, Head } from '@inertiajs/react';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';
import { useI18n } from '@/lib/i18n';

export default function ConfirmPassword() {
    const { tr } = useI18n();

    return (
        <>
            <Head title={tr('Confirmer le mot de passe avant de continuer')} />

            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label={tr('Confirmer avec une clé d’accès')}
                loadingLabel={tr('Confirmation…')}
                separator={tr('Ou confirmer avec le mot de passe')}
            />

            <Form {...store.form()} resetOnSuccess={['password']}>
                {({ processing, errors }) => (
                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">{tr('Mot de passe')}</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder={tr('Mot de passe')}
                                autoComplete="current-password"
                                autoFocus
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center">
                            <Button
                                className="w-full"
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                {tr('Confirmer le mot de passe avant de continuer')}
                            </Button>
                        </div>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirmer le mot de passe avant de continuer',
    description:
        'Cette zone est sécurisée. Veuillez confirmer votre mot de passe avant de continuer.',
};
