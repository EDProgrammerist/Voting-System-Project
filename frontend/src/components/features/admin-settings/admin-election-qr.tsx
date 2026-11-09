import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, QrCode, X } from "@phosphor-icons/react";
import QRCode from "qrcode";
import collegeLogo from "@/assets/cordova-public-college-logo.jpg";
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
          "Use the public website address or this computer’s Wi-Fi IP address so students’ phones can open the link.",
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
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [error, setError] = useState("");
  const [image, setImage] = useState<{ url: string; src: string } | null>(null);
  const [generationError, setGenerationError] = useState<{
    url: string;
    message: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const address = votingAddress(website);
  const votingUrl =
    qr && address.origin ? new URL(qr.entry_path, address.origin).href : "";
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    field.current?.focus();
    const overflow = document.body.style.overflow;
    const opener = button.current;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const token = getAdminToken();
    const controller = new AbortController();
    if (token)
      apiRequest<QrResponse>(`/admin/elections/${electionId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      })
        .then((response) => {
          if (!controller.signal.aborted) {
            setQr(response);
            field.current?.focus();
          }
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
  }, [open, electionId]);
  useEffect(() => {
    if (!open || !votingUrl) return;
    let active = true;
    QRCode.toDataURL(votingUrl, {
      errorCorrectionLevel: "M",
      width: 400,
      margin: 4,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((src) => {
        if (active) setImage({ url: votingUrl, src });
      })
      .catch(() => {
        if (active)
          setGenerationError({
            url: votingUrl,
            message:
              "Unable to generate the QR image. Close this window and try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [open, votingUrl]);
  function openQr() {
    setQr(null);
    setError("");
    setImage(null);
    setGenerationError(null);
    setWebsite(
      import.meta.env.VITE_VOTING_SITE_URL ||
        localStorage.getItem("voting_qr_website_url") ||
        window.location.origin,
    );
    setOpen(true);
  }
  return (
    <>
      <button
        ref={button}
        className="election-qr-open"
        type="button"
        disabled={disabled || !electionId}
        onClick={openQr}
      >
        <QrCode aria-hidden="true" />
        Print voting QR
      </button>
      {open &&
        createPortal(
          <dialog
            className="election-qr-dialog"
            ref={dialog}
            aria-labelledby="election-qr-title"
            onCancel={() => setOpen(false)}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const box = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < box.left ||
                event.clientX > box.right ||
                event.clientY < box.top ||
                event.clientY > box.bottom
              )
                setOpen(false);
            }}
          >
            <button
              type="button"
              className="election-qr-close"
              aria-label="Close voting QR"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            <header>
              <img
                src={collegeLogo}
                alt="Cordova Public College seal"
                width={64}
                height={64}
              />
              <div>
                <p>CPC Vote · Student elections</p>
                <h2 id="election-qr-title">Scan to vote</h2>
              </div>
            </header>
            {error ? (
              <p className="election-qr-error" role="alert">
                {error}
              </p>
            ) : !qr ? (
              <p role="status">Loading election QR...</p>
            ) : (
              <>
                <h3>{qr.election.name}</h3>
                {qr.election.status !== "active" && (
                  <p className="election-qr-screen-note" role="status">
                    {qr.election.status === "draft"
                      ? "This election is in draft. Students can sign in and preview the ballot; vote submission opens when the election is active."
                      : "This election is closed. Its QR no longer accepts new voters."}
                  </p>
                )}
                <label className="election-qr-address">
                  Voting website address
                  <input
                    ref={field}
                    type="url"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    placeholder="https://voting.school.edu"
                    aria-describedby="election-qr-url-help"
                  />
                </label>
                <p
                  id="election-qr-url-help"
                  className="election-qr-screen-note"
                >
                  For local testing, use this computer’s Wi-Fi IP address and
                  connect phones to the same network. Use the hosted website
                  address for a published election.
                </p>
                {address.error && (
                  <p
                    className="election-qr-error election-qr-screen-note"
                    role="status"
                  >
                    {address.error}
                  </p>
                )}
                {votingUrl &&
                  (generationError?.url === votingUrl ? (
                    <p className="election-qr-error" role="alert">
                      {generationError.message}
                    </p>
                  ) : image?.url === votingUrl ? (
                    <img
                      className="election-qr-image"
                      src={image.src}
                      alt={`Scan to open student voting for ${qr.election.name}`}
                      width={400}
                      height={400}
                    />
                  ) : (
                    <p role="status">Generating QR image...</p>
                  ))}
                {votingUrl && <p className="election-qr-link">{votingUrl}</p>}
                <ol className="election-qr-steps">
                  <li>Scan using your phone’s camera.</li>
                  <li>Sign in with your student ID and password.</li>
                  <li>Review and submit your vote to record attendance.</li>
                </ol>
                <p className="election-qr-attendance">
                  Scanning alone does not record attendance.
                </p>
                <button
                  type="button"
                  className="election-qr-print"
                  disabled={
                    !votingUrl ||
                    image?.url !== votingUrl ||
                    qr.election.status === "closed"
                  }
                  onClick={() => {
                    localStorage.setItem(
                      "voting_qr_website_url",
                      website.trim(),
                    );
                    window.print();
                  }}
                >
                  <Printer aria-hidden="true" />
                  Print QR poster
                </button>
              </>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
