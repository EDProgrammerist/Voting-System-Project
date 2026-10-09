import { useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import gsap from "gsap";
import { Link, useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { saveAdminSession } from "@/lib/admin-session";
import { ApiError } from "@/services/api-client";
import { loginAdmin } from "@/services/admin-auth-service";

import "./admin-login-screen.css";

gsap.registerPlugin(useGSAP);

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export function AdminLoginScreen() {
  const navigate = useNavigate();
  const screenRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState("");

  useDocumentTitle("Admin Login | CPC Vote");

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

        timeline
          .fromTo(
            "[data-login-background]",
            { autoAlpha: 0.55, scale: 0.88 },
            { autoAlpha: 1, duration: 1.35, scale: 1 },
          )
          .fromTo(
            "[data-login-curtain]",
            { autoAlpha: 0, xPercent: 12 },
            { autoAlpha: 1, duration: 0.85, xPercent: 0 },
            "-=0.8",
          )
          .fromTo(
            "[data-brand-word]",
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, duration: 0.65, stagger: 0.08, y: 0 },
            "-=0.45",
          )
          .fromTo(
            "[data-login-panel]",
            { autoAlpha: 0, scale: 0.96, y: 20 },
            { autoAlpha: 1, duration: 0.7, scale: 1, y: 0 },
            "-=0.45",
          );
      });

      return () => media.revert();
    },
    { scope: screenRef },
  );

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
        setMessage("The voting service is temporarily unavailable. Please try again.");
      }
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <main className="admin-login" ref={screenRef}>
      <section className="admin-login__stage" aria-labelledby="admin-login-title">
        <img
          alt=""
          className="admin-login__background"
          data-login-background
          src={campusBackground}
        />

        <div className="admin-login__curtain" data-login-curtain>
          <Link className="admin-login__switch" to="/voter/login">
            <ArrowsLeftRight aria-hidden="true" weight="bold" />
            Voter Login
          </Link>
          <h1 className="admin-login__brand" id="admin-login-title">
            <span className="admin-login__brand-cpc" data-brand-word>
              CPC
            </span>
            <span className="admin-login__brand-vote" data-brand-word>
              Vote
            </span>
            <span className="admin-login__brand-admin" data-brand-word>
              Admin
            </span>
          </h1>

          <div className="admin-login__panel" data-login-panel>
            <form className="admin-login__form" onSubmit={handleSubmit}>
              <div className="admin-login__field">
                <label htmlFor="admin-email">Email</label>
                <input
                  autoComplete="username"
                  disabled={isSubmitting}
                  id="admin-email"
                  inputMode="email"
                  name="email"
                  placeholder="Email"
                  required
                  type="email"
                />
              </div>

              <div className="admin-login__field">
                <label htmlFor="admin-password">Password</label>
                <input
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  id="admin-password"
                  minLength={8}
                  name="password"
                  placeholder="Password"
                  required
                  type="password"
                />
              </div>

              <button className="admin-login__submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in…" : "Login"}
              </button>

              <p
                aria-live="polite"
                className="admin-login__status"
                data-state={status}
                role="status"
              >
                {message}
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
