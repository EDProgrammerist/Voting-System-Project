export interface PositionRecord {
  id: number;
  election_id: number;
  name: string;
  max_selections: number;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PositionsResponse {
  data: PositionRecord[];
}

export interface PositionPayload {
  election_id?: number;
  name?: string;
  max_selections?: number;
  display_order?: number;
}

export interface PositionMutationResponse {
  message: string;
  data: PositionRecord;
}
