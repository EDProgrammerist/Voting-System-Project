export function partyLabel(team: string, name?: string): string {
  return name || (team === "TEAM_A" ? "Partylist A" : team === "TEAM_B" ? "Partylist B" : team);
}
