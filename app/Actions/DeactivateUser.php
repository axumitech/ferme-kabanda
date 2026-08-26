<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeactivateUser
{
    public function handle(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $user->forceFill([
                'email' => null,
                'phone' => null,
                'reference_item_id' => null,
                'remember_token' => Str::random(60),
            ])->save();

            $user->delete();
        }, attempts: 3);
    }
}
