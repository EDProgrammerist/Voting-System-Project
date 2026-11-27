import { useEffect, useState } from "react";
import { getCommitteeToken, getCommitteeElectionId, setCommitteeElectionId } from "@/lib/committee-session";
import { listAllCommitteeStudents, listCommitteeElections, listCommitteeSections } from "@/services/committee-service";
import type { ClassSection } from "@/types/committee";
import type { ElectionSummary } from "@/types/dashboard";
import type { VoterRecord } from "@/types/student";

export function useCommitteeSections(selected: string | null) {
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [electionId, updateElectionId] = useState<number | null>(getCommitteeElectionId);
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [students, setStudents] = useState<VoterRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [dataScope, setDataScope] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [electionAttempt, setElectionAttempt] = useState(0);
  const scope = `${electionId}:${selected ?? "directory"}`;

  useEffect(() => {
    const token = getCommitteeToken();
    if (!token) return;
    let active = true;
    listCommitteeElections(token).then(({ data }) => {
      if (!active) return;
      setElections(data);
      const current = getCommitteeElectionId();
      const chosen = data.find((item) => item.id === current) ?? data.find((item) => item.status === "active") ?? data.find((item) => item.status === "draft") ?? data[0];
      updateElectionId(chosen?.id ?? null);
      setCommitteeElectionId(chosen?.id ?? null);
      setReady(true);
      setNotice("");
    }).catch((error) => {
      if (active) setNotice(error instanceof Error ? error.message : "Unable to load elections.");
    });
    return () => { active = false; };
  }, [electionAttempt]);

  useEffect(() => {
    const token = getCommitteeToken();
    if (!token || !ready) return;
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (controller.signal.aborted || inFlight) return;
      inFlight = true;
      try {
        const [directory, roster] = await Promise.all([
          listCommitteeSections(token!, electionId ?? undefined, controller.signal),
          selected ? listAllCommitteeStudents(token!, {electionId: electionId ?? undefined, ...(selected !== "unassigned" && selected !== "overview" ? {sectionId: Number(selected)} : {}), signal: controller.signal}) : Promise.resolve([]),
        ]);
        if (!controller.signal.aborted) {
          setSections(directory.data);
          setUnassignedCount(directory.unassigned_count);
          setStudents(roster);
          setNotice("");
          setLoadedScope(scope);
          setDataScope(scope);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotice(error instanceof Error ? error.message : "Unable to load sections. Try again.");
          setLoadedScope(scope);
        }
      } finally { inFlight = false; }
    }
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    void refresh();
    const timer = window.setInterval(visibleRefresh, 5_000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [electionId, ready, selected, attempt, scope]);

  return { elections, electionId, setElectionId: (value: number) => {setCommitteeElectionId(value); updateElectionId(value);},
    sections: dataScope === scope ? sections : [],
    unassignedCount: dataScope === scope ? unassignedCount : 0,
    students: dataScope === scope ? students : [],
    hasData: dataScope === scope,
    notice, loading: ready && loadedScope !== scope, ready,
    reload: () => { if (!ready) setElectionAttempt((value) => value + 1); else setAttempt((value) => value + 1); },
  };
}
