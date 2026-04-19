import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase";
import logo from "../assets/lokawazlogo.png";

function Login() {
  useEffect(() => {
    signOut(auth); 
  }, []);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email, password);

      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Email or password is incorrect.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="login-page">
      <div className="login-background-shape top-shape"></div>
      <div className="login-background-shape bottom-shape"></div>

      <div className="login-card">
        <div className="logo-container">
          <img src={logo} alt="LokAwaaz Logo" className="logo-img" />
        </div>

        <h1 className="portal-title">LokAwaaz Municipality Portal</h1>
        <p className="portal-subtitle">
          Authorized access for municipal and department officials
        </p>

        <div className="tricolor-line"></div>

        <div className="input-group">
          <label>Official Email</label>
          <input
            type="email"
            placeholder="Enter official email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="login-error">{error}</p>}

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
         {loading ? "Logging in..." : "Login"}
        </button>

        <p className="footer-text">
          Secure civic issue monitoring and assignment system
        </p>
      </div>
    </div>
  );
};


export default Login;