<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitVoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ballot_reference_id' => ['nullable', 'uuid'],
            'thumbmark_confirmed' => ['required', 'accepted'],
            'signature' => ['required', 'array', 'min:1', 'max:100', function ($attribute, $value, $fail) {
                if (! is_array($value)) {
                    return;
                }
                $pointCount = 0;
                foreach ($value as $stroke) {
                    if (is_array($stroke)) {
                        $pointCount += count($stroke);
                    }
                }
                if ($pointCount > 10000 || strlen(json_encode($value)) > 1000000) {
                    $fail('The signature is too large. Clear it and sign again.');
                }
            }],
            'signature.*' => ['required', 'array', 'min:2', 'max:2000'],
            'signature.*.*' => ['required', 'array:x,y'],
            'signature.*.*.x' => ['required', 'numeric', 'between:0,600'],
            'signature.*.*.y' => ['required', 'numeric', 'between:0,200'],
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
            'selections' => [
                'required',
                'array',
                'min:1',
            ],
            'selections.*.position_id' => [
                'required',
                'integer',
                'exists:positions,id',
            ],
            'selections.*.candidate_student_id' => [
                'required',
                'string',
                'max:50',
            ],
        ];
    }
}
