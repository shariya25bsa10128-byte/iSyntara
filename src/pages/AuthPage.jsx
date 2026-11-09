
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Orbit,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserRound,
  Building2,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./Auth.css";

function AuthPage({ mode }) {
  const isRegister = mode === "register";

  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [role, setRole] = useState("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isRegister && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (isRegister && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password, role);
      } else {
        await login(email.trim(), password);
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-background">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-grid" />
      </div>

      <header className="auth-header">
        <Link to="/" className="auth-brand">
          <Orbit size={27} />
          <span>
            iSyntara<span className="auth-brand-dot">.</span>
          </span>
        </Link>

        <Link to="/" className="auth-back">
          <ArrowLeft size={16} />
          BACK TO HOME
        </Link>
      </header>

      <section className="auth-container">
        <div className="auth-intro">
          <span className="auth-eyebrow">
            <span className="auth-status-dot" />
            SYNTARA AEROSPACE
          </span>

          <h1>
            {isRegister ? (
              <>
                YOUR JOURNEY <span>STARTS HERE.</span>
              </>
            ) : (
              <>
                WELCOME <span>BACK.</span>
              </>
            )}
          </h1>

          <p>
            {isRegister
              ? "Join a growing network of ambitious minds shaping the future of aerospace and engineering."
              : "Sign in to continue exploring opportunities and building your future."}
          </p>

          <div className="auth-trust">
            <ShieldCheck size={18} />
            <span>SECURE ACCOUNT ACCESS</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span>
              {isRegister ? "CREATE ACCOUNT" : "ACCOUNT ACCESS"}
            </span>

            <h2>{isRegister ? "Get started." : "Sign in."}</h2>

            <p>
              {isRegister
                ? "Choose how you want to use iSyntara."
                : "Enter your account credentials below."}
            </p>
          </div>

          {isRegister && (
            <div className="auth-role-selector">
              <button
                type="button"
                className={role === "STUDENT" ? "selected" : ""}
                onClick={() => setRole("STUDENT")}
              >
                <UserRound size={19} />
                <span>CANDIDATE</span>
              </button>

              <button
                type="button"
                className={role === "EMPLOYER" ? "selected" : ""}
                onClick={() => setRole("EMPLOYER")}
              >
                <Building2 size={19} />
                <span>RECRUITER</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <label className="auth-field">
                <span>FULL NAME</span>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="auth-field">
              <span>EMAIL ADDRESS</span>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>PASSWORD</span>

              <div className="auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  minLength={isRegister ? 8 : undefined}
                  required
                />

                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting}
            >
              {submitting
                ? "PLEASE WAIT..."
                : isRegister
                  ? "CREATE ACCOUNT"
                  : "SIGN IN"}

              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "New to iSyntara?"}

            {" "}

            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="auth-footer">
        <span>© 2026 SYNTARA AEROSPACE</span>
        <span>ENGINEERING THE POSSIBLE.</span>
      </footer>
    </main>
  );
}

export default AuthPage;
