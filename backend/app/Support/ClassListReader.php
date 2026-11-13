<?php

namespace App\Support;

use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\IReader;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use ZipArchive;

class ClassListReader
{
    public const HEADERS = ['Student ID', 'Full Name', 'Course', 'Year Level', 'Section', 'Academic Status'];

    public const MAX_ROWS = 5000;

    private const ALIASES = [
        'studentid' => 'student_id', 'studentidnumber' => 'student_id', 'studentno' => 'student_id', 'studentnumber' => 'student_id', 'idno' => 'student_id', 'idnumber' => 'student_id',
        'lastname' => 'last_name', 'surname' => 'last_name', 'familyname' => 'last_name',
        'firstname' => 'first_name', 'givenname' => 'first_name',
        'mi' => 'middle_initial', 'middleinitial' => 'middle_initial', 'middlename' => 'middle_initial',
        'no' => '_sequence', 'number' => '_sequence',
        'fullname' => 'full_name', 'name' => 'full_name', 'studentname' => 'full_name',
        'course' => 'course', 'program' => 'course', 'yearlevel' => 'year_level', 'year' => 'year_level',
        'section' => 'section', 'classsection' => 'section', 'academicstatus' => 'academic_status', 'enrollmentstatus' => 'academic_status', 'status' => 'academic_status',
    ];

    public function inspect(UploadedFile $file): array
    {
        $reader = $this->reader($file);
        try {
            $sheets = $reader->listWorksheetInfo($file->getRealPath());
        } catch (\Throwable) {
            $this->fail('This workbook cannot be read. Remove encryption and save it as an Excel .xlsx or .xls file.');
        }
        if (count($sheets) > 30) {
            $this->fail('The workbook has too many worksheets. Upload a class-list workbook with at most 30 sheets.');
        }

        return array_map(fn ($sheet) => ['name' => $sheet['worksheetName'], 'rows' => $sheet['totalRows'], 'columns' => $sheet['totalColumns']], $sheets);
    }

    public function detectLayout(UploadedFile $file, ?string $worksheet = null): array
    {
        $sheets = $this->inspect($file);
        if ($worksheet !== null && ! collect($sheets)->contains('name', $worksheet)) {
            $this->fail('Choose a worksheet from the uploaded file.');
        }
        $reader = $this->reader($file);
        $reader->setLoadSheetsOnly($worksheet !== null ? [$worksheet] : array_column($sheets, 'name'));
        $reader->setReadFilter($this->filter(1, 20, range('A', 'Z')));
        try {
            $book = $reader->load($file->getRealPath());
        } catch (\Throwable) {
            $this->fail('Unable to detect the class list. Check that the workbook is valid and unencrypted.');
        }
        $matches = [];
        foreach ($book->getWorksheetIterator() as $sheet) {
            for ($row = 1; $row <= 20; $row++) {
                $fields = [];
                for ($column = 1; $column <= 26; $column++) {
                    $cell = $sheet->getCell([$column, $row]);
                    if ($cell->getDataType() !== DataType::TYPE_FORMULA) {
                        $label = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string) $cell->getValue()));
                        $fields[] = self::ALIASES[$label] ?? null;
                    }
                }
                if (in_array('student_id', $fields, true) && (in_array('full_name', $fields, true) || (in_array('first_name', $fields, true) && in_array('last_name', $fields, true)))) {
                    $matches[] = ['worksheet' => $sheet->getTitle(), 'header_row' => $row];
                }
            }
        }
        $book->disconnectWorksheets();
        if (count($matches) !== 1) {
            $this->fail($matches ? 'More than one class list was found. Choose a worksheet containing one class list.' : 'Could not find the class-list headers in the first 20 rows. Include Student ID Number and either Full Name or Lastname and Firstname.');
        }

        return $matches[0];
    }

    public function preview(UploadedFile $file, string $worksheet, int $headerRow): array
    {
        $sheets = $this->inspect($file);
        $info = collect($sheets)->firstWhere('name', $worksheet);
        if (! $info) {
            $this->fail('Choose a worksheet from the uploaded file.');
        }
        if ($info['columns'] > 26) {
            $this->fail('This worksheet has more than 26 used columns. Remove unrelated columns and upload it again.');
        }
        if ($info['rows'] > $headerRow + self::MAX_ROWS) {
            $this->fail('A worksheet can contain at most 5,000 data rows. Remove unused trailing rows or split the file.');
        }
        $reader = $this->reader($file);
        $reader->setLoadSheetsOnly([$worksheet]);
        $reader->setReadDataOnly(false);
        $reader->setReadFilter($this->filter($headerRow, $headerRow, range('A', 'Z')));
        try {
            $book = $reader->load($file->getRealPath());
        } catch (\Throwable) {
            $this->fail('The worksheet could not be opened. Check that the file is a valid, unencrypted Excel workbook.');
        }
        $sheet = $book->getSheetByName($worksheet);
        $mapping = [];
        for ($col = 1; $col <= 26; $col++) {
            $cell = $sheet->getCell([$col, $headerRow]);
            $raw = $cell->getValue();
            if ($raw === null || trim((string) $raw) === '') {
                continue;
            }
            if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                $this->fail('Header cells must contain text, not formulas.');
            }
            $label = trim((string) $raw);
            $field = self::ALIASES[strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $label))] ?? null;
            if (! $field) {
                $this->fail('Unsupported column "'.$label.'". Include class-list fields only; login and password columns are not accepted.');
            }
            if (in_array($field, $mapping, true)) {
                $this->fail('Duplicate column "'.$label.'". Each field must appear only once.');
            }
            $mapping[Coordinate::stringFromColumnIndex($col)] = $field;
        }
        if (! in_array('student_id', $mapping, true) || (! in_array('full_name', $mapping, true) && (! in_array('first_name', $mapping, true) || ! in_array('last_name', $mapping, true)))) {
            $this->fail('Include Student ID Number and either Full Name or both Lastname and Firstname.');
        }
        if (in_array('full_name', $mapping, true) && (in_array('first_name', $mapping, true) || in_array('last_name', $mapping, true))) {
            $this->fail('Use either Full Name or separate Lastname and Firstname columns, so names are unambiguous.');
        }
        $mapping = array_filter($mapping, fn ($field) => $field !== '_sequence');
        $book->disconnectWorksheets();
        $reader->setReadFilter($this->filter($headerRow + 1, $headerRow + self::MAX_ROWS, array_keys($mapping)));
        try {
            $book = $reader->load($file->getRealPath());
        } catch (\Throwable) {
            $this->fail('Unable to read worksheet data. Check the workbook and try again.');
        }
        $sheet = $book->getSheetByName($worksheet);
        $rows = [];
        $issues = [];
        $warnings = [];
        $seen = [];
        for ($number = $headerRow + 1; $number <= $info['rows']; $number++) {
            $record = ['student_id' => '', 'full_name' => '', 'course' => null, 'year_level' => null, 'section' => null, 'academic_status' => 'enrolled'];
            $values = [];
            $rowIssues = [];
            foreach ($mapping as $column => $field) {
                $cell = $sheet->getCell($column.$number);
                $value = $cell->getValue();
                if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                    $rowIssues[] = ['row' => $number, 'field' => $field, 'message' => 'Formulas are not accepted. Paste the actual value as text.'];
                    $value = null;
                }
                if ($field === 'student_id' && is_numeric($value) && $cell->getDataType() === DataType::TYPE_NUMERIC) {
                    if (Date::isDateTime($cell) || ! is_finite((float) $value) || (float) $value != floor((float) $value) || strlen(sprintf('%.0f', $value)) > 15) {
                        $rowIssues[] = ['row' => $number, 'field' => $field, 'message' => 'Student ID must be text, not a date, decimal, or rounded long number.'];
                    } else {
                        $format = $cell->getStyle()->getNumberFormat()->getFormatCode();
                        $value = preg_match('/^0{1,50}$/', $format) ? str_pad(sprintf('%.0f', $value), strlen($format), '0', STR_PAD_LEFT) : sprintf('%.0f', $value);
                        $warnings[] = ['row' => $number, 'message' => 'Student ID was stored as a number in Excel. Verify its leading zeros before confirming.'];
                    }
                }
                if (is_object($value) && method_exists($value, 'getPlainText')) {
                    $value = $value->getPlainText();
                }
                $values[$field] = $value === null ? '' : trim((string) $value);
            }
            if (! $rowIssues && collect($values)->every(fn ($value) => $value === '')) {
                continue;
            }
            if (in_array('last_name', $mapping, true)) {
                foreach (['last_name', 'first_name'] as $part) {
                    if (($values[$part] ?? '') === '') {
                        $rowIssues[] = ['row' => $number, 'field' => 'full_name', 'message' => 'Both Lastname and Firstname are required.'];
                    }
                }
                $middle = Str::squish($values['middle_initial'] ?? '');
                if (preg_match('/^\pL$/u', $middle)) {
                    $middle .= '.';
                }
                $values['full_name'] = trim(($values['last_name'] ?? '').', '.($values['first_name'] ?? '').($middle !== '' ? ' '.$middle : ''));
            }
            foreach (array_intersect_key($values, $record) as $field => $value) {
                if ($value !== '') {
                    $record[$field] = $value;
                }
            }
            $record['full_name'] = Str::squish($record['full_name']);
            $record['course'] = $record['course'] ? Str::upper($record['course']) : null;
            $record['academic_status'] = Str::lower($record['academic_status']);
            $validator = Validator::make($record, [
                'student_id' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/'],
                'full_name' => ['required', 'string', 'max:255', 'regex:/\pL/u'],
                'course' => ['nullable', 'string', 'max:100'], 'year_level' => ['nullable', 'string', 'max:50'], 'section' => ['nullable', 'string', 'max:100'],
                'academic_status' => ['required', 'in:enrolled,graduated,stopped,inactive,withdrawn'],
            ]);
            foreach ($validator->errors()->messages() as $field => $messages) {
                foreach ($messages as $message) {
                    $rowIssues[] = ['row' => $number, 'field' => $field, 'message' => $message];
                }
            }
            foreach ($record as $field => $value) {
                if ($value !== null && preg_match('/[\x00-\x1F\x7F]/', $value)) {
                    $rowIssues[] = ['row' => $number, 'field' => $field, 'message' => 'Remove hidden control characters from this value.'];
                }
            }
            $key = strtolower($record['student_id']);
            if (isset($seen[$key])) {
                $rowIssues[] = ['row' => $number, 'field' => 'student_id', 'message' => 'Duplicate Student ID; it also appears on row '.$seen[$key].'.'];
            } else {
                $seen[$key] = $number;
            }
            $issues = [...$issues, ...$rowIssues];
            $rows[] = ['row_number' => $number, ...$record, 'status' => $rowIssues ? 'invalid' : 'new'];
        }
        $book->disconnectWorksheets();
        if (! $rows) {
            $this->fail('The selected worksheet has no student rows below the header.');
        }
        $existing = Student::whereIn('student_id', array_column($rows, 'student_id'))->pluck('student_id')->map(fn ($id) => strtolower($id))->flip();
        foreach ($rows as &$row) {
            if ($row['status'] === 'new' && $existing->has(strtolower($row['student_id']))) {
                $row['status'] = 'existing';
            }
        }
        unset($row);

        return ['rows' => $rows, 'issues' => $issues, 'warnings' => $warnings, 'summary' => ['total' => count($rows), 'new' => count(array_filter($rows, fn ($row) => $row['status'] === 'new')), 'existing' => count(array_filter($rows, fn ($row) => $row['status'] === 'existing')), 'invalid' => count(array_filter($rows, fn ($row) => $row['status'] === 'invalid'))]];
    }

    private function reader(UploadedFile $file): IReader
    {
        if (! $file->isValid() || $file->getSize() === 0) {
            $this->fail('The uploaded workbook is empty or incomplete. Choose the Excel file again.');
        }
        if (! in_array(strtolower($file->getClientOriginalExtension()), ['xlsx', 'xls'], true)) {
            $this->fail('Upload an Excel .xlsx or .xls workbook.');
        }
        if (strtolower($file->getClientOriginalExtension()) === 'xlsx') {
            $zip = new ZipArchive;
            if ($zip->open($file->getRealPath()) !== true) {
                $this->fail('This is not a valid Excel .xlsx workbook.');
            }
            $bytes = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $bytes += $zip->statIndex($i)['size'];
            }
            $tooLarge = $zip->numFiles > 1000 || $bytes > 20 * 1024 * 1024;
            $zip->close();
            if ($tooLarge) {
                $this->fail('The workbook is too large when opened. Remove embedded media and unused sheets, or split the class list.');
            }
        }
        try {
            $type = IOFactory::identify($file->getRealPath(), ['Xlsx', 'Xls']);
            if (($type === 'Xlsx') !== (strtolower($file->getClientOriginalExtension()) === 'xlsx')) {
                $this->fail('The file content does not match its extension. Re-save it using Excel.');
            }

            return IOFactory::createReader($type);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable) {
            $this->fail('This file is not a supported Excel workbook. Re-save it as .xlsx or .xls.');
        }
    }

    private function filter(int $first, int $last, array $columns): IReadFilter
    {
        return new class($first, $last, $columns) implements IReadFilter
        {
            public function __construct(private int $first, private int $last, private array $columns) {}

            public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
            {
                return $row >= $this->first && $row <= $this->last && in_array($columnAddress, $this->columns, true);
            }
        };
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
