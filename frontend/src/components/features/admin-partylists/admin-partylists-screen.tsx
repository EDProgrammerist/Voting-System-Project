import { useEffect, useRef, useState, type FormEvent } from "react";
import { Image, Plus, X } from "@phosphor-icons/react";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminElections } from "@/services/admin-dashboard-service";
import {
  listAdminPartylists,
  saveAdminPartylist,
  deleteAdminPartylist,
} from "@/services/admin-partylist-service";
import type { ElectionSummary } from "@/types/dashboard";
import type { PartylistRecord } from "@/types/partylist";
import "./admin-partylists-screen.css";

const SLOTS = [
  { team: "TEAM_A", label: "Partylist A" },
  { team: "TEAM_B", label: "Partylist B" },
] as const;

export function AdminPartylistsScreen() {
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [electionId, setElectionId] = useState<number | null>(null);
  const [partylists, setPartylists] = useState<PartylistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [modal, setModal] = useState<{
    team: "TEAM_A" | "TEAM_B";
    party?: PartylistRecord;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [bannerFileName, setBannerFileName] = useState("");
  const bannerInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useDocumentTitle("Partylists | CPC Vote Admin");
  const election = elections.find((item) => item.id === electionId);
  const canEdit = election?.status === "draft" && !loading && !error;
  const available = SLOTS.filter(
    (slot) => !partylists.some((party) => party.team === slot.team),
  );

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    let active = true;
    listAdminElections(token)
      .then(({ data }) => {
        if (!active) return;
        setElections(data);
        setElectionId((current) =>
          current !== null && data.some((item) => item.id === current)
            ? current
            : ((
                data.find((item) => item.status === "draft") ??
                data.find((item) => item.status === "active") ??
                data[0]
              )?.id ?? null),
        );
        if (!data.length) setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load elections.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token || electionId === null) return;
    const controller = new AbortController();
    listAdminPartylists(token, electionId, controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setPartylists(data);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Unable to load partylists.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [electionId, attempt]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const currentDialog = dialog.current;
    currentDialog?.showModal();
    currentDialog
      ?.querySelector<HTMLInputElement>('input[name="name"]')
      ?.focus();
    return () => {
      currentDialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [modal]);

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  function open(team: "TEAM_A" | "TEAM_B", party?: PartylistRecord) {
    if (!canEdit || deletingId !== null) return;
    setActionError("");
    setFormError("");
    setImageError("");
    setImagePreview(null);
    setBannerFileName("");
    setModal({ team, party });
  }

  async function removePartylist(party: PartylistRecord) {
    const token = getAdminToken();
    if (!token || !canEdit || deletingId !== null) return;
    const slot = SLOTS.find((item) => item.team === party.team)!.label;
    if (
      !window.confirm(
        `Delete "${party.name}"? Its platform and banner will be removed. Candidates remain in ${slot}; votes and attendance are kept. The slot can be created again.`,
      )
    )
      return;
    setDeletingId(party.id);
    setActionError("");
    setNotice("");
    try {
      const response = await deleteAdminPartylist(token, party.id);
      setPartylists((current) =>
        current.filter((item) => item.id !== party.id),
      );
      setNotice(response.message);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to delete this partylist. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAdminToken();
    if (
      !token ||
      !modal ||
      !canEdit ||
      electionId === null ||
      imageError ||
      submitting
    )
      return;
    const payload = new FormData(event.currentTarget);
    payload.set("team", modal.team);
    payload.set("election_id", String(electionId));
    setSubmitting(true);
    setFormError("");
    try {
      const response = await saveAdminPartylist(
        token,
        payload,
        modal.party?.id,
      );
      setPartylists((current) => [
        ...current.filter((item) => item.team !== response.data.team),
        response.data,
      ]);
      setNotice(response.message);
      setModal(null);
      setImagePreview(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save this partylist.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <section className="admin-dashboard__content">
        <PageSkeleton kind="candidates" label="Loading partylists" />
      </section>
    );
  return (
    <>
      <section className="admin-dashboard__content partylist-page">
        <header className="partylist-page__heading">
          <div>
            <h1>Partylists</h1>
            <p>Set the shared platform and banner for each partylist.</p>
          </div>
          {!!elections.length && (
            <label>
              Election
              <select
                aria-label="Election for partylists"
                disabled={deletingId !== null}
                value={electionId ?? ""}
                onChange={(event) => {
                  setLoading(true);
                  setPartylists([]);
                  setError("");
                  setNotice("");
                  setActionError("");
                  setElectionId(Number(event.target.value));
                }}
              >
                {elections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.status})
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="partylist-button"
            disabled={!canEdit || !available.length || deletingId !== null}
            onClick={() => available[0] && open(available[0].team)}
          >
            <Plus aria-hidden="true" />
            Create Partylist
          </button>
        </header>
        {error ? (
          <div className="partylist-message" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : !election ? (
          <p className="partylist-message">No elections are available yet.</p>
        ) : (
          <>
            {!canEdit && (
              <p className="partylist-message" role="status">
                Partylists are read-only after an election opens. Select a draft
                election to make changes.
              </p>
            )}
            {actionError && (
              <p className="partylist-modal__error" role="alert">
                {actionError}
              </p>
            )}
            <div className="partylist-grid">
              {SLOTS.map((slot) => {
                const party = partylists.find(
                  (item) => item.team === slot.team,
                );
                return (
                  <article
                    className="partylist-card"
                    key={slot.team}
                    data-team={slot.team}
                  >
                    {party?.banner_image_url ? (
                      <img
                        className="partylist-card__banner"
                        src={party.banner_image_url}
                        alt={`${party.name} banner`}
                      />
                    ) : (
                      <div className="partylist-card__placeholder">
                        <Image aria-hidden="true" />
                        <span>No banner uploaded</span>
                      </div>
                    )}
                    <div className="partylist-card__body">
                      <span className="partylist-card__slot">{slot.label}</span>
                      <h2>{party?.name ?? slot.label}</h2>
                      <h3>Platform</h3>
                      <p className="partylist-card__platform">
                        {party?.platform ??
                          "Create this partylist to add its shared platform and banner."}
                      </p>
                      <div className="partylist-card__actions">
                        <button
                          type="button"
                          className="partylist-button partylist-button--secondary"
                          disabled={!canEdit || deletingId !== null}
                          onClick={() => open(slot.team, party)}
                        >
                          {party ? "Edit Partylist" : `Create ${slot.label}`}
                        </button>
                        {party && (
                          <button
                            type="button"
                            className="partylist-button partylist-button--danger"
                            disabled={!canEdit || deletingId !== null}
                            onClick={() => void removePartylist(party)}
                          >
                            {deletingId === party.id
                              ? "Deleting..."
                              : "Delete Partylist"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <p
              role="status"
              aria-live="polite"
              className="partylist-page__notice"
            >
              {notice}
            </p>
          </>
        )}
      </section>
      {modal && (
        <dialog
          ref={dialog}
          className="partylist-modal"
          aria-labelledby="partylist-modal-title"
          onCancel={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            if (!submitting) setModal(null);
          }}
        >
          <button
            type="button"
            className="partylist-modal__close"
            aria-label="Close partylist form"
            disabled={submitting}
            onClick={() => setModal(null)}
          >
            <X aria-hidden="true" />
          </button>
          <h2 id="partylist-modal-title">
            {modal.party ? "Edit Partylist" : "Create Partylist"}
          </h2>
          <form onSubmit={save} aria-busy={submitting}>
            <label>
              Partylist slot
              <select
                aria-label="Partylist slot"
                value={modal.team}
                disabled={submitting || !!modal.party}
                onChange={(event) =>
                  setModal({ team: event.target.value as "TEAM_A" | "TEAM_B" })
                }
              >
                {SLOTS.filter(
                  (slot) =>
                    modal.party?.team === slot.team ||
                    !partylists.some((party) => party.team === slot.team),
                ).map((slot) => (
                  <option key={slot.team} value={slot.team}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Partylist name
              <input
                name="name"
                defaultValue={modal.party?.name ?? ""}
                maxLength={100}
                required
                disabled={submitting}
              />
            </label>
            <div className="partylist-modal__field">
              <label htmlFor="partylist-platform">Platform</label>
              <textarea
                id="partylist-platform"
                name="platform"
                defaultValue={modal.party?.platform ?? ""}
                maxLength={5000}
                rows={6}
                required
                disabled={submitting}
              />
            </div>
            <div className="partylist-modal__field">
              <label htmlFor="partylist-banner-image">Banner image</label>
              <input
                id="partylist-banner-image"
                aria-describedby="partylist-banner-hint"
                tabIndex={-1}
                ref={bannerInput}
                className="partylist-modal__file-input"
                name="banner_image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={submitting}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setBannerFileName(file?.name ?? "");
                  setImageError("");
                  setImagePreview(null);
                  if (!file) return;
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 2 * 1024 * 1024
                  ) {
                    setImageError(
                      "Choose a JPG, PNG, or WebP image up to 2 MB.",
                    );
                    return;
                  }
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
              <div className="partylist-modal__banner-actions">
                <button
                  type="button"
                  className="partylist-button partylist-button--secondary"
                  disabled={submitting}
                  aria-controls="partylist-banner-image"
                  onClick={() => bannerInput.current?.click()}
                >
                  {imagePreview || modal.party?.banner_image_url
                    ? "Edit Banner"
                    : "Add Banner"}
                </button>
                <span className="partylist-modal__filename" role="status">
                  {bannerFileName ||
                    (modal.party?.banner_image_url
                      ? "Current banner saved"
                      : "No banner selected")}
                </span>
              </div>
            </div>
            <p id="partylist-banner-hint" className="partylist-modal__hint">
              JPG, PNG, or WebP, up to 2 MB. A wide image works best. Leave
              blank to keep the current banner.
            </p>
            {(imagePreview || modal.party?.banner_image_url) && (
              <img
                className="partylist-modal__preview"
                src={imagePreview ?? modal.party!.banner_image_url!}
                alt="Banner preview"
              />
            )}
            {(imageError || formError) && (
              <p className="partylist-modal__error" role="alert">
                {imageError || formError}
              </p>
            )}
            <div className="partylist-modal__actions">
              <button
                type="button"
                className="partylist-button partylist-button--secondary"
                disabled={submitting}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="partylist-button"
                disabled={submitting || !!imageError}
              >
                {submitting ? "Saving..." : "Save Partylist"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
