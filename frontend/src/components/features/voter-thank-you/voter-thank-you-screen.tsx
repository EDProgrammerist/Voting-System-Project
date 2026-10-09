import { useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { clearVoterSession } from "@/lib/voter-session";

import "./voter-thank-you-screen.css";

export function VoterThankYouScreen() {
  const navigate = useNavigate();

  useDocumentTitle("Thank You | CPC Vote");

  function handleLogout() {
    clearVoterSession();
    navigate("/voter/login", { replace: true });
  }

  return (
    <main className="voter-thank-you">
      <img alt="" className="voter-thank-you__background" src={campusBackground} />
      <div className="voter-thank-you__overlay" />

      <section className="voter-thank-you__panel" aria-labelledby="voter-thank-you-title">
        <h1 id="voter-thank-you-title">Thank you!</h1>
        <p>Your vote has been recorded.</p>
        <button onClick={handleLogout} type="button">Logout</button>
      </section>
    </main>
  );
}
