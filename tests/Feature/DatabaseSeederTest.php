<?php

namespace Tests\Feature;

use App\Models\ReferenceItem;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_admin_and_reference_data_idempotently(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $admin = User::where('email', 'admin@fermekabanda.cd')->firstOrFail();

        $this->assertTrue($admin->is_admin);
        $this->assertTrue(Hash::check('password', $admin->password));
        $this->assertSame(1, User::where('email', 'admin@fermekabanda.cd')->count());
        $this->assertSame(1, ReferenceItem::where('category', 'parcelles')->where('label', 'Parc 1')->count());
        $this->assertGreaterThan(100, ReferenceItem::count());
    }
}
