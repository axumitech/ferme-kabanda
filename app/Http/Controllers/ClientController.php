<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('clients/index', [
            'clients' => Client::query()->withCount('ventes')->orderBy('nom')->get(),
            'canaux' => Client::CANAUX,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->admin($request);

        return $this->form();
    }

    public function store(Request $request): RedirectResponse
    {
        $this->admin($request);
        $client = Client::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('clients.create')->with('success', 'Client créé. Vous pouvez en ajouter un autre.');
        }

        return redirect()->route('clients.edit', $client)->with('success', 'Client créé — il est disponible dans les nouveaux bons de vente.');
    }

    public function edit(Request $request, Client $client): Response
    {
        $this->admin($request);

        return $this->form($client);
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $this->admin($request);
        $client->update($this->validated($request, $client));

        return redirect()->route('clients.index')->with('success', 'Client modifié.');
    }

    private function form(?Client $client = null): Response
    {
        return Inertia::render('clients/form', [
            'mode' => $client ? 'edit' : 'create',
            'client' => $client,
            'canaux' => Client::CANAUX,
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Client $client = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('clients', 'code')->ignore($client)],
            'nom' => ['required', 'string', 'max:255'],
            'canal' => ['required', Rule::in(array_keys(Client::CANAUX))],
            'devise_preferee' => ['nullable', Rule::in(['USD', 'CDF'])],
            'prix_reference' => ['nullable', 'numeric', 'min:0'],
            'unite_reference' => ['nullable', 'string', 'max:24'],
            'contact' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:32'],
            'delai_paiement_jours' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'actif' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
