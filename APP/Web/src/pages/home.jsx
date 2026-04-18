import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import logo from "../assets/lokawazlogo.png";

function Home() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const handleLogout = () => {
    navigate("/login");
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setFetchError("");

        const reportsRef = collection(db, "pothole_reports");
        const snapshot = await getDocs(reportsRef);
        console.log("Total docs fetched:", snapshot.size);

        const reportsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Doc data:", doc.id, data);

          return {
            id: doc.id,
            imageUrl: data.imageUrl || "",
            location: data.location || {},
            status: data.status || "Pending",
            timestamp: data.timestamp || null,
            userId: data.userId || "Unknown User",
          };
        });

        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setFetchError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const stats = useMemo(() => {
    const resolved = reports.filter(
      (report) => report.status?.toLowerCase() === "resolved"
    ).length;

    const pending = reports.filter(
      (report) => report.status?.toLowerCase() === "pending"
    ).length;

    const flagged = reports.filter((report) => {
      const status = report.status?.toLowerCase();
      return (
        status === "flagged" ||
        status === "flagged for review" ||
        status === "under review"
      );
    }).length;

    return {
      total: reports.length,
      resolved,
      pending,
      flagged,
    };
  }, [reports]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "No timestamp";

    try {
      const date = timestamp.toDate();
      return date.toLocaleString();
    } catch {
      return "Invalid timestamp";
    }
  };

  const getStatusClass = (status) => {
    const normalized = status?.toLowerCase();

    if (normalized === "resolved") return "resolved";
    if (normalized === "pending") return "pending";
    if (
      normalized === "flagged" ||
      normalized === "flagged for review" ||
      normalized === "under review"
    ) {
      return "flagged";
    }
    return "pending";
  };

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="topbar-left">
          <h1>Hello, Admin!</h1>
          <img src={logo} alt="LokAwaaz Logo" className="home-logo" />
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="home-content">
        <section className="reports-section">
          <div className="section-heading">
            <h2>Incoming Reports</h2>
            <p>Live reports received from the civic reporting system</p>
          </div>

          {loading ? (
            <div className="empty-state">Loading reports...</div>
          ) : fetchError ? (
            <div className="empty-state">{fetchError}</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">No reports found.</div>
          ) : (
            <div className="reports-list">
              {reports.map((report) => (
                <div className="report-card" key={report.id}>
                  <div className="report-top">
                    <div>
                      <h3>Pothole Report</h3>
                      <p className="report-id">{report.id}</p>
                    </div>

                    <span
                      className={`status-badge ${getStatusClass(report.status)}`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {report.imageUrl ? (
                    <img
                      src={report.imageUrl}
                      alt="Reported pothole"
                      className="report-image"
                    />
                  ) : (
                    <div className="report-image-placeholder">
                      No image available
                    </div>
                  )}

                  <div className="report-details">
                    <p>
                      <strong>User ID:</strong> {report.userId}
                    </p>
                    <p>
                      <strong>Latitude:</strong>{" "}
                      {report.location?.lat ?? "N/A"}
                    </p>
                    <p>
                      <strong>Longitude:</strong>{" "}
                      {report.location?.lng ?? "N/A"}
                    </p>
                    <p>
                      <strong>Status:</strong> {report.status}
                    </p>
                    <p>
                      <strong>Reported At:</strong>{" "}
                      {formatTimestamp(report.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="stats-section">
          <div className="stats-card">
            <h3>Report Statistics</h3>

            <div className="stat-row">
              <span>Total Reports</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="stat-row">
              <span>Resolved</span>
              <strong>{stats.resolved}</strong>
            </div>

            <div className="stat-row">
              <span>Pending</span>
              <strong>{stats.pending}</strong>
            </div>

            <div className="stat-row">
              <span>Flagged / Review</span>
              <strong>{stats.flagged}</strong>
            </div>
          </div>

          <div className="chart-card">
            <h3>Status Overview</h3>
            <div className="mini-stat-block">
              <div className="mini-bar resolved-bar">
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
              </div>

              <div className="mini-bar pending-bar">
                <span>Pending</span>
                <strong>{stats.pending}</strong>
              </div>

              <div className="mini-bar flagged-bar">
                <span>Flagged</span>
                <strong>{stats.flagged}</strong>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Heatmap Placeholder</h3>
            <div className="chart-placeholder">
              Later you can show issue density using lat/lng data
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Home;