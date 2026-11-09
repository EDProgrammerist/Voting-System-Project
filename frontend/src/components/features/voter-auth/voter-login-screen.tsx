import {
  ArrowLeft,
  ArrowRight,
  CheckSquareOffset,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  clearVoterSession,
  getVoterToken,
  saveVoterSession,
  getVoterQrEntry,
  clearVoterQrEntry,
} from "@/lib/voter-session";
import {
  createVoterPassword,
  loginVoter,
  logoutVoter,
} from "@/services/voter-auth-service";
import { ApiError } from "@/services/api-client";

import "@/components/features/voter-shared/voter-shared.css";
import "./voter-login-screen.css";
import "@/components/features/shared/login-transition.css";

export function VoterPasswordScreen() {
  return <VoterLoginScreen setupPassword />;
}

export function VoterLoginScreen({
  setupPassword = false,
}: {
  setupPassword?: boolean;
}) {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrEntry, setQrEntry] = useState(getVoterQrEntry);

  useDocumentTitle(
    setupPassword ? "Create Password | CPC Vote" : "Voter Login | CPC Vote",
  );

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || (!setupPassword && !studentId.trim())) {
      setMessage("Enter your student ID number and password.");
      return;
    }

    if (setupPassword && password !== confirmation) {
      setMessage(
        "Your passwords do not match. Please enter the same password twice.",
      );
      return;
    }
    if (setupPassword && new TextEncoder().encode(password).length > 72) {
      setMessage("This password is too long. Please use a shorter password.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const response = setupPassword
        ? await createVoterPassword(
            getVoterToken() ?? "",
            password,
            confirmation,
          )
        : await loginVoter({
            student_id: studentId.trim(),
            password,
            ...(qrEntry ? { entry_code: qrEntry.code } : {}),
          });
      saveVoterSession(
        response.token,
        response.student,
        response.election,
        response.tally_only,
        response.password_change_required,
      );
      setPassword("");
      setConfirmation("");
      navigate(
        response.password_change_required
          ? "/voter/password"
          : response.tally_only
            ? "/voter/tally"
            : "/voter/ballot",
        { replace: true },
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "The voting service is unavailable. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    try {
      const token = getVoterToken();
      if (token) await logoutVoter(token);
      clearVoterSession();
      navigate("/voter/login", { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className={setupPassword ? "voter-login" : "voter-login login-transition"}
    >
      <section
        className="voter-login__visual"
        aria-label="CPC student elections"
      >
        <img
          alt=""
          className="voter-login__background"
          src={campusBackground}
        />
        <span className="voter-login__brand">
          <CheckSquareOffset aria-hidden="true" weight="light" />
          <span>
            <strong>CPC</strong> Vote
          </span>
        </span>
        <div className="voter-login__visual-copy">
          <p className="voter-login__motto">
            <strong>Your Voice</strong>
            <span>Your Vote</span>
          </p>
          <p>A stronger student community starts with you.</p>
        </div>
        <span className="voter-login__college">
          Cordova Public College <span>Student elections</span>
        </span>
      </section>
      <section
        className="voter-login__content"
        aria-labelledby="voter-login-title"
      >
        {setupPassword ? (
          <button
            className="voter-login__switch voter-login__signout"
            disabled={submitting}
            onClick={handleLogout}
            type="button"
          >
            <ArrowLeft aria-hidden="true" />
            Sign out
          </button>
        ) : !qrEntry ? (
          <Link className="voter-login__switch" to="/admin/login">
            <ArrowLeft aria-hidden="true" />
            Admin Login
          </Link>
        ) : null}
        <div className="voter-login__panel">
          <span className="voter-login__form-icon">
            <CheckSquareOffset aria-hidden="true" weight="light" />
          </span>
          <h1 id="voter-login-title">
            {setupPassword ? "Secure your account." : "Welcome, voter."}
          </h1>
          <p className="voter-login__intro">
            {setupPassword
              ? "Create your own password before continuing. This replaces your default password for future sign-ins."
              : "Sign in with your student ID number and password."}
          </p>
          <form
            onSubmit={handleVerification}
            aria-describedby={message ? "login-status" : undefined}
          >
            {!setupPassword && qrEntry && (
              <div className="voter-login__qr-context">
                <p>
                  Voting for <strong>{qrEntry.election.name}</strong>
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    clearVoterQrEntry();
                    setQrEntry(null);
                  }}
                >
                  Use regular student login
                </button>
              </div>
            )}
            {!setupPassword && (
              <div className="voter-login__field">
                <label htmlFor="student-id">Student ID number</label>
                <input
                  autoCapitalize="none"
                  autoComplete="username"
                  autoFocus
                  disabled={submitting}
                  id="student-id"
                  maxLength={50}
                  onChange={(event) => setStudentId(event.target.value)}
                  placeholder="e.g. 20240100"
                  required
                  spellCheck={false}
                  value={studentId}
                />
              </div>
            )}
            <div className="voter-login__field">
              <label htmlFor="voter-password">
                {setupPassword ? "New password" : "Password"}
              </label>
              <div className="voter-login__password">
                <input
                  aria-describedby="voter-password-help"
                  autoComplete={
                    setupPassword ? "new-password" : "current-password"
                  }
                  autoFocus={setupPassword}
                  disabled={submitting}
                  id="voter-password"
                  maxLength={72}
                  minLength={setupPassword ? 12 : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    setupPassword
                      ? "Create a secure password"
                      : "Enter your password"
                  }
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={submitting}
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeSlash aria-hidden="true" weight="light" />
                  ) : (
                    <Eye aria-hidden="true" weight="light" />
                  )}
                </button>
              </div>
              <p id="voter-password-help">
                {setupPassword
                  ? "Use at least 12 characters, including uppercase and lowercase letters, a number, and a symbol."
                  : "First sign-in? Use the default password 123456. You will be asked to create your own password."}
              </p>
            </div>
            {setupPassword && (
              <div className="voter-login__field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  autoComplete="new-password"
                  disabled={submitting}
                  id="confirm-password"
                  maxLength={72}
                  minLength={12}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                />
              </div>
            )}
            <p
              aria-live="polite"
              className="voter-login__status"
              id="login-status"
              role="status"
            >
              {message}
            </p>
            <button
              className="voter-login__submit"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? setupPassword
                  ? "Saving password..."
                  : "Signing in..."
                : setupPassword
                  ? "Save password and continue"
                  : "Log In"}
              <span>
                <ArrowRight aria-hidden="true" />
              </span>
            </button>
          </form>
          <p className="voter-login__help">
            {setupPassword
              ? "Keep your password private. Do not reuse a password from another account."
              : "Having trouble signing in? Check your student ID number or contact your election administrator."}
          </p>
        </div>
        <p className="voter-login__footer">
          CPC Vote <span>Student election portal</span>
        </p>
      </section>
    </main>
  );
}
