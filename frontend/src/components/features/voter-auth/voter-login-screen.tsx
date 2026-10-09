import { ArrowLeft, ArrowsLeftRight } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { saveVoterSession } from "@/lib/voter-session";
import { loginVoter } from "@/services/voter-auth-service";
import { ApiError } from "@/services/api-client";

import "./voter-login-screen.css";

type LoginStep = "student-id" | "full-name";

export function VoterLoginScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>("student-id");
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useDocumentTitle("Voter Login | CPC Vote");

  function handleStudentId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = studentId.trim();
    if (!normalized) {
      setMessage("Enter your student ID to continue.");
      return;
    }
    setStudentId(normalized);
    setMessage("");
    setStep("full-name");
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim();
    if (!normalizedName) {
      setMessage("Enter your full name exactly as it appears in your student record.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const response = await loginVoter({ student_id: studentId, full_name: normalizedName });
      saveVoterSession(response.token, response.student, response.election);
      navigate("/voter/ballot", { replace: true });
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "The voting service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    setMessage("");
    setStep("student-id");
  }

  return (
    <main className="voter-login">
      <img alt="" className="voter-login__background" src={campusBackground} />
      <section aria-labelledby="voter-login-title" className="voter-login__content">
        <Link className="voter-login__switch" to="/admin/login">
          <ArrowsLeftRight aria-hidden="true" weight="bold" />
          Admin Login
        </Link>
        <h1 className="voter-login__brand" id="voter-login-title">
          <strong>CPC</strong><span>Vote</span>
        </h1>

        <p className="voter-login__motto"><strong>Your Voice</strong><span>Your Vote</span></p>

        <div className="voter-login__panel">
          {step === "student-id" && (
            <form onSubmit={handleStudentId}>
              <label className="sr-only" htmlFor="student-id">Student ID</label>
              <input
                autoComplete="username"
                autoFocus
                id="student-id"
                inputMode="text"
                maxLength={50}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="Enter Student ID"
                value={studentId}
              />
              <button type="submit">Log In</button>
            </form>
          )}

          {step === "full-name" && (
            <form onSubmit={handleVerification}>
              <button aria-label="Return to student ID" className="voter-login__back" disabled={submitting} onClick={goBack} type="button"><ArrowLeft aria-hidden="true" weight="bold" /></button>
              <p className="voter-login__step-label">Student ID <strong>{studentId}</strong></p>
              <label className="sr-only" htmlFor="full-name">Full name</label>
              <input
                autoComplete="name"
                autoFocus
                disabled={submitting}
                id="full-name"
                maxLength={255}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter Full Name"
                value={fullName}
              />
              <button disabled={submitting} type="submit">{submitting ? "Verifying…" : "Verify & Continue"}</button>
            </form>
          )}

          <p aria-live="polite" className="voter-login__status" role="status">{message}</p>
        </div>
      </section>
    </main>
  );
}
