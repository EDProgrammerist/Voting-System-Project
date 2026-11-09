import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import collegeLogo from "@/assets/cordova-public-college-logo.jpg";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { saveAdminSession } from "@/lib/admin-session";
import { ApiError } from "@/services/api-client";
import { loginAdmin } from "@/services/admin-auth-service";
import "./admin-login-screen.css";
import "@/components/features/shared/login-transition.css";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export function AdminLoginScreen() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  useDocumentTitle("Admin Login | CPC Vote");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await loginAdmin({ email, password });
      saveAdminSession(response.token, response.admin);
      setStatus("success");
      setMessage(`Welcome, ${response.admin.name}.`);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError && error.status > 0 && error.status < 500) {
        setMessage(error.message);
      } else {
        setMessage(
          "The voting service is temporarily unavailable. Please try again.",
        );
      }
    }
  }

  const isSubmitting = status === "submitting";
  return (
    <main className="admin-login login-transition">
      <div className="admin-login__container">
        <Link className="admin-login__switch" to="/voter/login">
          <ArrowLeft aria-hidden="true" />
          Voter Login
        </Link>
        <div className="admin-login__workspace">
          <section
            className="admin-login__context"
            aria-label="CPC Vote administration"
          >
            <img
              className="admin-login__college-logo"
              src={collegeLogo}
              alt="Cordova Public College official seal"
              width={1080}
              height={1080}
              fetchPriority="high"
            />
          </section>
          <section
            className="admin-login__panel"
            aria-labelledby="admin-login-title"
          >
            <header>
              <span className="admin-login__section-label">
                Administrator access
              </span>
              <h1 id="admin-login-title">Welcome back</h1>
              <p>Sign in with your administrator account.</p>
            </header>
            <form
              className="admin-login__form"
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
            >
              <div className="admin-login__field">
                <label htmlFor="admin-email">Email</label>
                <input
                  autoComplete="username"
                  disabled={isSubmitting}
                  id="admin-email"
                  inputMode="email"
                  name="email"
                  placeholder="Your administrator email"
                  required
                  type="email"
                  aria-describedby={
                    status === "error" ? "admin-login-status" : undefined
                  }
                />
              </div>
              <div className="admin-login__field">
                <label htmlFor="admin-password">Password</label>
                <div className="admin-login__password">
                  <input
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    id="admin-password"
                    minLength={8}
                    name="password"
                    placeholder="Enter your password"
                    required
                    type={showPassword ? "text" : "password"}
                    aria-describedby={
                      status === "error" ? "admin-login-status" : undefined
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? (
                      <EyeSlash aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <p
                aria-live="polite"
                className="admin-login__status"
                data-state={status}
                id="admin-login-status"
                role="status"
              >
                {message}
              </p>
              <button
                className="admin-login__submit"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Signing in…" : "Login"}
                <ArrowRight aria-hidden="true" />
              </button>
            </form>
            <p className="admin-login__help">
              For election administrators. Students can use{" "}
              <Link to="/voter/login">Voter Login</Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
