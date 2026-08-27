<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PreferenceController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/preferences', [
            'locale' => $request->user()->locale ?? app()->getLocale(),
            'locales' => [
                ['value' => 'fr', 'label' => 'Français'],
                ['value' => 'en', 'label' => 'English'],
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'locale' => ['required', 'string', Rule::in(['fr', 'en'])],
        ]);

        $request->user()->forceFill(['locale' => $data['locale']])->save();
        $request->session()->put('locale', $data['locale']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $data['locale'] === 'fr' ? 'Préférences enregistrées.' : 'Preferences saved.',
        ]);

        return to_route('preferences.edit');
    }
}
