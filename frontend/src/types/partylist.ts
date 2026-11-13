export interface PartylistRecord {
  id: number;
  election_id: number;
  team: "TEAM_A" | "TEAM_B";
  name: string;
  platform: string;
  banner_image_url: string | null;
}

export interface PartylistsResponse {
  data: PartylistRecord[];
}
