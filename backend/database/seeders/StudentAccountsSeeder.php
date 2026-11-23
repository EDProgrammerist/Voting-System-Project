<?php

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StudentAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['20240100', '2024-0100', 'Ian Kurt Ardena', 'BSIT', 'enrolled'],
            ['20240101', '2024-0101', 'Bryan Amoin', 'BSHM', 'enrolled'],
            ['20240102', '2024-0102', 'Janvenedict Emeliano', 'BEED', 'enrolled'],
            ['20240103', '2024-0103', 'Demi Arnold', 'BSED', 'enrolled'],
            ['20209999', '2020-9999', 'Sheehan Voila', 'BSIT', 'graduated'],
            ['20238888', '2023-8888', 'John Doe', 'BSHM', 'stopped'],
        ];

        DB::transaction(function () use ($accounts): void {
            foreach ($accounts as [$oldId, $newId, $name, $course, $status]) {
                $old = Student::whereKey($oldId)->lockForUpdate()->first();
                $current = Student::whereKey($newId)->lockForUpdate()->first();

                if ($old && $current) {
                    throw new RuntimeException("Both {$oldId} and {$newId} exist. Resolve these duplicate student records before updating accounts.");
                }

                if ($old) {
                    // Copy parents first, move references, then remove the obsolete keys.
                    DB::table('students')->insert(array_merge($old->getAttributes(), [
                        'student_id' => $newId, 'full_name' => $name,
                        'academic_status' => $status, 'updated_at' => now(),
                    ]));
                    $profile = DB::table('candidate_profiles')->where('student_id', $oldId)->first();
                    if ($profile) {
                        DB::table('candidate_profiles')->insert(array_merge((array) $profile, [
                            'student_id' => $newId, 'full_name' => $name, 'updated_at' => now(),
                        ]));
                        DB::table('candidacies')->where('student_id', $oldId)->update(['student_id' => $newId]);
                        DB::table('votes')->where('candidate_student_id', $oldId)->update(['candidate_student_id' => $newId]);
                        DB::table('candidate_profiles')->where('student_id', $oldId)->delete();
                    }
                    DB::table('voter_participations')->where('student_id', $oldId)->update(['student_id' => $newId]);
                    DB::table('voter_ballot_ids')->where('student_id', $oldId)->update(['student_id' => $newId]);
                    $old->tokens()->delete();
                    $old->delete();
                } elseif ($current) {
                    $changed = $current->full_name !== $name || $current->academic_status !== $status;
                    $current->update(['full_name' => $name, 'academic_status' => $status]);
                    if ($changed) {
                        $current->tokens()->delete();
                    }
                    DB::table('candidate_profiles')->where('student_id', $newId)->update(['full_name' => $name]);
                } else {
                    Student::create(['student_id' => $newId, 'full_name' => $name, 'course' => $course, 'academic_status' => $status]);
                }
            }
        }, 3);
    }
}
