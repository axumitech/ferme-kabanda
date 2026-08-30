<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/** FKN — Coque Inertia du carnet terrain partagé. */
class CarnetController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('terrain/carnet');
    }
}
