<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th'] as $year => $ordinal) {
            DB::table('students')
                ->whereIn(DB::raw('LOWER(TRIM(year_level))'), [
                    (string) $year,
                    $ordinal,
                    $ordinal.' year',
                    $year.' year',
                    'year '.$year,
                    'year'.$year,
                ])
                ->update(['section' => $year.'D']);
        }
    }

    public function down(): void
    {
        // Previous imported section values cannot be inferred from the year level.
    }
};
