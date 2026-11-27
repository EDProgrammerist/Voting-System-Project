import { CommitteeSectionsScreen } from "@/components/features/committee-sections/committee-sections-screen";
import { useSearchParams } from "react-router";

export default function CommitteeSectionsPage() {
  const [params] = useSearchParams();
  return <CommitteeSectionsScreen key={params.get("course") ?? "all"} />;
}
