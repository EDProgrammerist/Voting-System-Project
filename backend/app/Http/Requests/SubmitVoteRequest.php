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