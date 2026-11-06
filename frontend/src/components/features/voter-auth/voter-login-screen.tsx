<<<<<<< HEAD
import { ArrowLeft, ArrowRight, CheckSquareOffset, Eye, EyeSlash } from "@phosphor-icons/react";
=======
import { ArrowLeft, ArrowsLeftRight } from "@phosphor-icons/react";
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { saveVoterSession } from "@/lib/voter-session";
import { loginVoter } from "@/services/voter-auth-service";
import { ApiError } from "@/services/api-client";

<<<<<<< HEAD
import "@/components/features/voter-shared/voter-shared.css";
import "./voter-login-screen.css";

export function VoterLoginScreen() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
=======
import "./voter-login-screen.css";

type LoginStep = "student-id" | "full-name";

export function VoterLoginScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>("student-id");
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  const [submitting, setSubmitting] = useState(false);

  useDocumentTitle("Voter Login | CPC Vote");

<<<<<<< HEAD
  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim();
    if (!normalizedName || !studentId.trim()) {
      setMessage("Enter your full name and use your student ID number as your password.");
=======
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
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
<<<<<<< HEAD
      const response = await loginVoter({ student_id: studentId.trim(), full_name: normalizedName });
      saveVoterSession(response.token, response.student, response.election, response.tally_only);
      navigate(response.tally_only ? "/voter/tally" : "/voter/ballot", { replace: true });
=======
      const response = await loginVoter({ student_id: studentId, full_name: normalizedName });
      saveVoterSession(response.token, response.student, response.election);
      navigate("/voter/ballot", { replace: true });
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "The voting service is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

<<<<<<< HEAD
  return (
    <main className="voter-login">
      <section className="voter-login__visual" aria-label="CPC student elections">
        <img alt="" className="voter-login__background" src={campusBackground} />
        <span className="voter-login__brand"><CheckSquareOffset aria-hidden="true" weight="light" /><span><strong>CPC</strong> Vote</span></span>
        <div className="voter-login__visual-copy"><p className="voter-login__motto"><strong>Your Voice</strong><span>Your Vote</span></p><p>A stronger student community starts with you.</p></div>
        <span className="voter-login__college">Cordova Public College <span>Student elections</span></span>
      </section>
      <section className="voter-login__content" aria-labelledby="voter-login-title">
        <Link className="voter-login__switch" to="/admin/login"><ArrowLeft aria-hidden="true" />Admin Login</Link>
        <div className="voter-login__panel">
          <span className="voter-login__form-icon"><CheckSquareOffset aria-hidden="true" weight="light" /></span>
          <h1 id="voter-login-title">Welcome, voter.</h1>
          <p className="voter-login__intro">Sign in to explore the candidates and make your voice count.</p>
          <form onSubmit={handleVerification} aria-describedby={message ? "login-status" : undefined}>
            <div className="voter-login__field">
              <label htmlFor="full-name">Full Name</label>
              <input autoComplete="username" autoFocus disabled={submitting} id="full-name" maxLength={255} onChange={(event) => setFullName(event.target.value)} placeholder="Enter Full Name" required value={fullName} />
            </div>
            <div className="voter-login__field">
              <label htmlFor="voter-password">Password</label>
              <div className="voter-login__password"><input aria-describedby="voter-password-help" autoComplete="current-password" disabled={submitting} id="voter-password" maxLength={50} onChange={(event) => setStudentId(event.target.value)} placeholder="Enter your Student ID number" required type={showPassword ? "text" : "password"} value={studentId} /><button aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={submitting} onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeSlash aria-hidden="true" weight="light" /> : <Eye aria-hidden="true" weight="light" />}</button></div>
              <p id="voter-password-help">Use your student ID number as your password.</p>
            </div>
            <p aria-live="polite" className="voter-login__status" id="login-status" role="status">{message}</p>
            <button className="voter-login__submit" disabled={submitting} type="submit">{submitting ? "Signing in..." : "Log In"}<span><ArrowRight aria-hidden="true" /></span></button>
          </form>
          <p className="voter-login__help">Having trouble signing in? Check that your full name matches your student record.</p>
        </div>
        <p className="voter-login__footer">CPC Vote <span>Student election portal</span></p>
=======
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
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
      </section>
    </main>
  );
}
