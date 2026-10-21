
import { useState } from "react";
import "./AuthGate.css";

const DEMO_KEY = "rydex_demo_user";

export default function AuthGate({ children }) {
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem(DEMO_KEY) === "yes"
  );
  const [isSignup, setIsSignup] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || password.length < 6) {
      setMessage("Enter an email and password with at least 6 characters.");
      return;
    }

    sessionStorage.setItem(DEMO_KEY, "yes");
    setLoggedIn(true);
  }

  function handleLogout() {
    sessionStorage.removeItem(DEMO_KEY);
    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setMessage("");
    setIsSignup(true);
  }

  if (loggedIn) {
    return (
      <>
        <div className="auth-user-bar">
          <span>Welcome, {email || "Rydex User"}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">R</div>
        <p className="auth-eyebrow">YOUR JOURNEY, SIMPLIFIED</p>

        <h1>{isSignup ? "Create Account" : "Welcome Back"}</h1>

        <p className="auth-subtitle">
          {isSignup
            ? "Create your account to continue to Rydex."
            : "Sign in to continue to Rydex."}
        </p>

        <label htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />

        <button className="auth-submit" type="submit">
          {isSignup ? "Create Account" : "Sign In"}
        </button>

        {message && (
          <p className="auth-message" role="alert">
            {message}
          </p>
        )}

        
<p className="auth-switch">
  {isSignup ? (
    <>
      Already have an account?{" "}
      <button
        type="button"
        onClick={() => {
          setIsSignup(false);
          setMessage("");
        }}
      >
        Sign In
      </button>
      <br />
      <button
        type="button"
        className="create-another-account"
        
      onClick={() => {
     setIsSignup(true);
     setEmail("");
     setPassword("");
     setMessage("");
    }}

      >
        Create another account
      </button>
    </>
  ) : (
    <>
      Don't have an account?{" "}
      <button
        type="button"
        onClick={() => {
          setIsSignup(true);
          setMessage("");
        }}
      >
        Create Account
      </button>
    </>
  )}
</p>

      </form>
    </main>
  );
}
