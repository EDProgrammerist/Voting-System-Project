export function partyLabel(team: string): string {
  return team === "TEAM_A" ? "Partylist A" : team === "TEAM_B" ? "Partylist B" : team;
}
