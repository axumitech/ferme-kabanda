<?php

namespace App\Http\Controllers\Admin;

use App\Actions\DeactivateUser;
use App\Http\Controllers\Controller;
use App\Models\Departement;
use App\Models\ReferenceItem;
use App\Models\Site;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        return Inertia::render('admin/members', [
            'members' => User::query()
                ->select('id', 'name', 'email', 'phone', 'reference_item_id', 'site_id', 'departement_id', 'is_admin', 'niveau_hierarchie', 'created_at')
                ->with(['teamMember:id,category,label', 'site:id,code,nom', 'departement:id,code,nom'])
                ->orderByDesc('is_admin')
                ->orderBy('name')
                ->get(),
            'teamMembers' => ReferenceItem::query()
                ->whereIn('category', ['agents_agri', 'agents_ani'])
                ->with('memberAccount:id,name,reference_item_id')
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get(['id', 'category', 'label', 'active']),
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'departements' => Departement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'initialReferenceItemId' => $request->integer('reference_item_id') ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $this->validated($request);

        User::create([
            ...$data,
            'phone' => User::normalizePhone($data['phone']),
            'email' => $data['email'] ?: null,
            'email_verified_at' => $data['email'] ? now() : null,
        ]);

        return back()->with('success', 'Membre ajouté. Il peut maintenant se connecter.');
    }

    public function update(Request $request, User $member): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $this->validated($request, $member);

        if ($member->is($request->user()) && ! $data['is_admin']) {
            return back()->withErrors(['is_admin' => 'Vous ne pouvez pas retirer votre propre accès administrateur.']);
        }

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $data['phone'] = User::normalizePhone($data['phone']);
        $data['email'] = $data['email'] ?: null;
        $member->fill($data);

        if ($member->isDirty('email')) {
            $member->email_verified_at = $data['email'] ? Carbon::now() : null;
        }

        $member->save();

        return back()->with('success', 'Membre mis à jour.');
    }

    public function destroy(Request $request, User $member, DeactivateUser $deactivateUser): RedirectResponse
    {
        $this->ensureAdmin($request);

        if ($member->is($request->user())) {
            return back()->withErrors(['member' => 'Vous ne pouvez pas supprimer votre propre compte.']);
        }

        $deactivateUser->handle($member);

        return back()->with('success', 'Membre supprimé.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?User $member = null): array
    {
        $niveauParDefaut = $member !== null ? $member->niveau_hierarchie : 4;

        $request->merge([
            'name' => trim((string) $request->input('name')),
            'phone' => User::normalizePhone($request->input('phone')),
            'email' => filled($request->input('email'))
                ? mb_strtolower(trim((string) $request->input('email')))
                : null,
            'reference_item_id' => filled($request->input('reference_item_id'))
                ? $request->integer('reference_item_id')
                : null,
            'site_id' => filled($request->input('site_id')) ? $request->integer('site_id') : null,
            'departement_id' => filled($request->input('departement_id')) ? $request->integer('departement_id') : null,
            'niveau_hierarchie' => filled($request->input('niveau_hierarchie'))
                ? $request->integer('niveau_hierarchie')
                : $niveauParDefaut,
        ]);

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'min:8', 'max:30', Rule::unique(User::class)->withoutTrashed()->ignore($member)],
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique(User::class)->withoutTrashed()->ignore($member)],
            'reference_item_id' => [
                'nullable',
                'integer',
                Rule::exists(ReferenceItem::class, 'id')->where(
                    fn ($query) => $query->whereIn('category', ['agents_agri', 'agents_ani']),
                ),
                Rule::unique(User::class, 'reference_item_id')->withoutTrashed()->ignore($member),
            ],
            'site_id' => ['nullable', 'integer', Rule::exists(Site::class, 'id')->where('actif', true)],
            'departement_id' => ['nullable', 'integer', Rule::exists(Departement::class, 'id')->where('actif', true)],
            'password' => [$member ? 'nullable' : 'required', 'confirmed', Password::defaults()],
            'is_admin' => ['required', 'boolean'],
            'niveau_hierarchie' => ['required', 'integer', 'between:1,4'],
        ]);
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
