import { useEffect, useState } from "react";
import { QrCode } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { getAdminToken } from "@/lib/admin-session";
import { apiRequest } from "@/services/api-client";
import "./admin-election-qr.css";

interface QrResponse {
  election: { id: number; name: string; status: string };
  entry_path: string;
}

function votingAddress(value: string): { origin?: string; error?: string } {
  try {
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return {
        error:
          "Enter the website address without a page path, for example https://voting.school.edu.",
      };
    if (
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "[::1]" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.startsWith("127.")
    )
      return {
        error:
          "Use the public website address or this computer's Wi-Fi IP address so students' phones can open the link.",
      };
    return { origin: url.origin };
  } catch {
    return {
      error:
        "Enter a complete website address starting with https:// or http://.",
    };
  }
}

export function AdminElectionQr({
  electionId,
  disabled,
}: {
  electionId: number;
  disabled?: boolean;
}) {
  const [website, setWebsite] = useState(
    () =>
      import.meta.env.VITE_VOTING_SITE_URL ||
      localStorage.getItem("voting_qr_website_url") ||
      window.location.origin,
  );
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState<{ url: string; src: string } | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [generationError, setGenerationError] = useState<{
    url: string;
    message: string;
  } | null>(null);
  const address = votingAddress(website);
  const votingUrl =
    qr && !disabled && qr.election.status !== "closed" && address.origin
      ? new URL(qr.entry_path, address.origin).href
      : "";

  useEffect(() => {
    if (disabled) return;
    const token = getAdminToken();
    const controller = new AbortController();
    if (token)
      apiRequest<QrResponse>(`/admin/elections/${electionId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      })
        .then((response) => {
          if (!controller.signal.aborted) setQr(response);
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted)
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load the voting QR code.",
            );
        });
    return () => controller.abort();
  }, [electionId, disabled, attempt]);

  useEffect(() => {
    if (!votingUrl) return;
    let active = true;
    QRCode.toDataURL(votingUrl, {
      errorCorrectionLevel: "M",
      width: 400,
      margin: 4,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((src) => {
        if (active) {
          setImage({ url: votingUrl, src });
          setGenerationError(null);
          localStorage.setItem(
            "voting_qr_website_url",
            new URL(votingUrl).origin,
          );
        }
      })
      .catch(() => {
        if (active)
          setGenerationError({
            url: votingUrl,
            message: "Unable to generate the QR image. Please try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [votingUrl, generationAttempt]);

  if (disabled) return null;

  if (error)
    return (
      <div className="election-qr-panel">
        <p className="election-qr-error" role="alert">
          {error}
        </p>
        <button
          className="election-qr-retry"
          onClick={() => {
            setError("");
            setQr(null);
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          Try again
        </button>
      </div>
    );

  if (!qr)
    return (
      <div className="election-qr-panel election-qr-loading" role="status">
        Loading voting QR code...
      </div>
    );

  if (qr.election.status === "closed")
    return (
      <p className="election-qr-panel" role="status">
        This election is closed. Its voting QR code is unavailable.
      </p>
    );

  return (
    <div className="election-qr-panel">
      <div className="election-qr-layout">
        <figure className="election-qr-code">
          {!votingUrl ? (
            <div className="election-qr-placeholder">
              <QrCode aria-hidden="true" />
              <p>Enter a reachable website address to display the QR code.</p>
            </div>
          ) : generationError?.url === votingUrl ? (
            <div className="election-qr-placeholder">
              <p className="election-qr-error" role="alert">
                {generationError.message}
              </p>
              <button
                className="election-qr-retry"
                onClick={() => {
                  setGenerationError(null);
                  setGenerationAttempt((value) => value + 1);
                }}
                type="button"
              >
                Regenerate QR
              </button>
            </div>
          ) : image?.url === votingUrl ? (
            <img
              className="election-qr-image"
              src={image.src}
              alt={`Scan to open student voting for ${qr.election.name}`}
              width={400}
              height={400}
            />
          ) : (
            <div className="election-qr-placeholder" role="status">
              Generating QR image...
            </div>
          )}
          <figcaption>Scan to vote in {qr.election.name}.</figcaption>
        </figure>
        <div className="election-qr-details">
          <label className="election-qr-address">
            Voting website address
            <input
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://voting.school.edu"
              autoComplete="url"
              spellCheck={false}
              aria-invalid={Boolean(address.error)}
              aria-describedby={`election-qr-url-help${address.error ? " election-qr-address-error" : ""}`}
            />
          </label>
          <p id="election-qr-url-help">
            For a local demo, use this computer's Wi-Fi IP address and connect
            phones to the same network. After deployment, use the public website
            address.
          </p>
          {address.error && (
            <p
              className="election-qr-error"
              id="election-qr-address-error"
              role="status"
            >
              {address.error}
            </p>
          )}
          {votingUrl && (
            <div className="election-qr-share">
              <p>Voting link</p>
              <a href={votingUrl} target="_blank" rel="noopener noreferrer">
                {votingUrl}
              </a>
            </div>
          )}
          <ol className="election-qr-steps">
            <li>Scan using your phone's camera.</li>
            <li>Sign in with your student ID and password.</li>
            <li>Review and submit your ballot to record attendance.</li>
          </ol>
          <p className="election-qr-attendance">
            Scanning alone does not record attendance.
          </p>
        </div>
      </div>
    </div>
  );
}
