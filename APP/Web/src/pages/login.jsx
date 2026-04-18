import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/lokawazlogo.png";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

  navigate("/home"); };

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

        <button className="login-btn" onClick={handleLogin}>
          Login
        </button>

        <p className="footer-text">
          Secure civic issue monitoring and assignment system
        </p>
      </div>
    </div>
  );
}

export default Login;