import { Skeleton, SkeletonBox } from "skullet/react";
import "./page-skeleton.css";

export type LoadingPageKind =
  | "dashboard"
  | "table"
  | "candidates"
  | "settings"
  | "ballot"
  | "review"
  | "tally"
  | "auth";

function Lines() {
  return (
    <div className="page-skeleton__lines">
      <SkeletonBox width="62%" height={18} />
      <SkeletonBox width="90%" height={12} />
      <SkeletonBox width="76%" height={12} />
    </div>
  );
}

export function PageSkeleton({
  kind = "table",
  label = "Loading page content",
}: {
  kind?: LoadingPageKind;
  label?: string;
}) {
  const choices =
    kind === "ballot" || kind === "review" || kind === "candidates";
  return (
    <Skeleton
      loading
      label={label}
      className="page-skeleton"
      skeleton={
        <div className={`page-skeleton__layout page-skeleton__layout--${kind}`}>
          <header className="page-skeleton__heading">
            <SkeletonBox width="38%" height={30} />
            <SkeletonBox width="65%" height={14} />
          </header>
          {kind === "auth" ? (
            <div className="page-skeleton__auth">
              <SkeletonBox width="100%" height={280} radius={12} />
              <div className="page-skeleton__panel">
                <Lines />
                <SkeletonBox width="100%" height={48} />
                <SkeletonBox width="100%" height={48} />
                <SkeletonBox width="100%" height={48} />
              </div>
            </div>
          ) : (
            <>
              <div className="page-skeleton__toolbar">
                <SkeletonBox width="55%" height={44} />
                <SkeletonBox width="30%" height={44} />
              </div>
              {kind !== "settings" && (
                <div className="page-skeleton__metrics">
                  {Array.from(
                    { length: kind === "dashboard" ? 4 : 3 },
                    (_, index) => (
                      <div className="page-skeleton__panel" key={index}>
                        <SkeletonBox width="70%" height={14} />
                        <SkeletonBox width="45%" height={30} />
                      </div>
                    ),
                  )}
                </div>
              )}
              <div
                className={
                  kind === "dashboard" || kind === "ballot" || kind === "review"
                    ? "page-skeleton__columns"
                    : "page-skeleton__stack"
                }
              >
                <div className="page-skeleton__panel">
                  <Lines />
                  {choices ? (
                    <div className="page-skeleton__choices">
                      {[0, 1].map((index) => (
                        <div className="page-skeleton__choice" key={index}>
                          <SkeletonBox width="100%" height={145} radius={8} />
                          <Lines />
                          <SkeletonBox width="100%" height={42} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    Array.from(
                      { length: kind === "settings" ? 2 : 6 },
                      (_, index) => (
                        <div className="page-skeleton__row" key={index}>
                          <SkeletonBox
                            width="44%"
                            height={kind === "settings" ? 44 : 20}
                          />
                          <SkeletonBox width="20%" height={20} />
                          <SkeletonBox width="12%" height={20} />
                        </div>
                      ),
                    )
                  )}
                </div>
                {(kind === "dashboard" ||
                  kind === "ballot" ||
                  kind === "review") && (
                  <aside className="page-skeleton__panel">
                    <Lines />
                    <SkeletonBox width="100%" height={190} radius={8} />
                    <Lines />
                    <SkeletonBox width="100%" height={44} />
                  </aside>
                )}
              </div>
            </>
          )}
        </div>
      }
    >
      <span />
    </Skeleton>
  );
}

export function AuthLoading() {
  return (
    <main className="portal-auth-loading">
      <PageSkeleton kind="auth" label="Loading sign-in page" />
    </main>
  );
}
