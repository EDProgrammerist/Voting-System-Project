<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ClassSection extends Model
{
    protected $fillable = ['course', 'year_level', 'name'];

    protected function casts(): array
    {
        return ['year_level' => 'integer'];
    }

    public static function year(?string $value): ?int
    {
        return preg_match('/^(?:year\s*)?([1-4])(?:st|nd|rd|th)?(?:\s*year)?$/i', trim($value ?? ''), $match) ? (int) $match[1] : null;
    }

    public function yearLabel(): string
    {
        return [1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 4 => '4th Year'][$this->year_level];
    }

    public function classFields(): array
    {
        return ['course' => $this->course, 'year_level' => $this->yearLabel(), 'section' => $this->name];
    }

    public function conflictsWith(array $fields): bool
    {
        foreach ($this->classFields() as $field => $expected) {
            $value = trim((string) ($fields[$field] ?? ''));
            if ($value !== '' && ($field === 'year_level' ? self::year($value) !== $this->year_level : mb_strtoupper($value) !== $expected)) {
                return true;
            }
        }

        return false;
    }

    public function students(?Election $election): Builder
    {
        $year = $this->year_level;
        $ordinal = [1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th'][$year];

        return Student::query()->forElection($election)
            ->whereRaw('UPPER(TRIM(course)) = ?', [$this->course])
            ->whereRaw('UPPER(TRIM(section)) = ?', [$this->name])
            ->whereIn(DB::raw("REPLACE(LOWER(TRIM(year_level)), ' ', '')"), [(string) $year, $ordinal, $ordinal.'year', $year.'year', 'year'.$year, 'year'.$ordinal, 'year'.$ordinal.'year', 'year'.$year.'year']);
    }

    public static function registerStudent(Student $student): void
    {
        $year = self::year($student->year_level);
        $course = mb_strtoupper(trim($student->course ?? ''));
        $name = mb_strtoupper(trim($student->section ?? ''));
        if ($year && $course !== '' && $name !== '') {
            self::firstOrCreate(['course' => $course, 'year_level' => $year, 'name' => $name]);
        }
    }
}
