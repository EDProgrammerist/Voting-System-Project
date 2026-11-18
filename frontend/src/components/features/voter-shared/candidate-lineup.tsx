import { useState } from "react";
import { GraduationCap, Medal } from "@phosphor-icons/react";
import type { BallotCandidate } from "@/types/voter";
import { voterMediaUrl } from "@/lib/voter-media-url";
import "./candidate-lineup.css";

export function LineupCandidateProfile({
  candidate,
  position,
}: {
  candidate: BallotCandidate;
  position: string;
}) {
  const platform =
    candidate.partylist?.platform?.trim() || candidate.motto?.trim();
  return (
    <div className="lineup-party__profile">
      <div className="lineup-hero">
        <LineupPortrait key={candidate.student_id} candidate={candidate} />
        <div className="lineup-hero__identity">
          <span>{position}</span>
          <h4>{candidate.full_name}</h4>
        </div>
      </div>
      <div className="lineup-details">
        {(platform || candidate.partylist) && (
          <section className="lineup-party__platform">
            <h5>Partylist platform</h5>
            <p>{platform || "No platform has been provided yet."}</p>
          </section>
        )}
        {candidate.profile?.trim() && (
          <section>
            <h5>
              <GraduationCap aria-hidden="true" />
              Profile
            </h5>
            <p>{candidate.profile}</p>
          </section>
        )}
        <section>
          <h5>
            <Medal aria-hidden="true" />
            Achievements
          </h5>
          <p>
            {candidate.achievements?.trim() ||
              "No achievements have been provided yet."}
          </p>
        </section>
      </div>
    </div>
  );
}

export function PartylistBanner({ candidate }: { candidate: BallotCandidate }) {
  const [failed, setFailed] = useState(false);
  const banner = candidate.partylist?.banner_image_url;
  if (!banner) return null;
  if (failed)
    return <p className="lineup-party__banner-error">Banner unavailable.</p>;
  return (
    <img
      className="lineup-party__banner"
      src={voterMediaUrl(banner)}
      alt={`${candidate.partylist?.name || "Partylist"} banner`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function LineupPortrait({ candidate }: { candidate: BallotCandidate }) {
  const [failed, setFailed] = useState(false);
  const initials = candidate.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className="lineup-portrait">
      {candidate.profile_photo_url && !failed ? (
        <img
          src={voterMediaUrl(candidate.profile_photo_url)}
          alt={`Portrait of ${candidate.full_name}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="lineup-portrait__fallback">
          <span aria-hidden="true">{initials}</span>
          <small>{failed ? "Photo unavailable" : "No photo provided"}</small>
        </div>
      )}
    </div>
  );
}
