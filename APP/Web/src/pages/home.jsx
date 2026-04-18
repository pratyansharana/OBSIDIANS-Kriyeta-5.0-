import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import logo from "../assets/lokawazlogo.png";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function Home() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);
  const [deleting, setDeleting] = useState(false);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  const toggleSelectionMode = () => {
  setSelectionMode((prev) => !prev);
  setSelectedReports([]); };
  const toggleReportSelection = (reportId) => {
    setSelectedReports((prev) =>
        prev.includes(reportId)
    ? prev.filter((id) => id !== reportId)
    : [...prev, reportId]
    ); };

const handleSelectAll = () => {
  if (selectedReports.length === reports.length) {
    setSelectedReports([]);
  } else {
    setSelectedReports(reports.map((report) => report.id));
  }
};

const handleDeleteSelected = async () => {
  if (selectedReports.length === 0) {
    alert("Please select at least one report to delete.");
    return;
  }

  const confirmDelete = window.confirm(
    `Are you sure you want to delete ${selectedReports.length} selected report(s)?`
  );

  if (!confirmDelete) return;

  try {
    setDeleting(true);

    for (const reportId of selectedReports) {
      await deleteDoc(doc(db, "pothole_reports", reportId));
    }

    setReports((prev) =>
      prev.filter((report) => !selectedReports.includes(report.id))
    );

    setSelectedReports([]);
    setSelectionMode(false);

    alert("Selected reports deleted successfully.");
  } catch (error) {
    console.error("Error deleting reports:", error);
    alert("Failed to delete selected reports.");
  } finally {
    setDeleting(false);
  }
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

  const rejected = reports.filter(
    (report) => report.status?.toLowerCase() === "rejected"
  ).length;

  const manualReviewRequired= reports.filter(
    (report) => report.status?.toLowerCase() === "manual_review_required"
  ).length;

  return {
    total: reports.length,
    resolved,
    pending,
    rejected,
    manualReviewRequired,
  };
}, [reports]);

const pieData = [
  { name: "Resolved", value: stats.resolved },
  { name: "Pending", value: stats.pending },
  { name: "Rejected", value: stats.rejected },
  { name: "Manual Review Required", value: stats.manualReviewRequired },
];

const PIE_COLORS = [
  "#138808",
  "#e76f51",
  "#dc2626",
  "#2563eb",
];

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
    if (normalized === "rejected") return "rejected";
    if (normalized === "manual_review_required") return "manual-review-required";
    return "pending";
  };

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="topbar-left">
          <h1>Hello, Admin!</h1>
          <img src={logo} alt="LokAwaaz Logo" className="home-logo" />
        </div>

        <div className="topbar-actions">
            <button className="delete-mode-btn" onClick={toggleSelectionMode}>
                {selectionMode ? "Cancel" : "Delete Reports"}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
                Logout
            </button>
        </div>
      </header>

      <div className="home-content">
        <section className="reports-section">
          <div className="section-heading">
            <h2>Incoming Reports</h2>
            <p>Live reports received from the civic reporting system</p>
          </div>
          {selectionMode && reports.length > 0 && (
            <div className="selection-toolbar">
                <button className="select-all-btn" onClick={handleSelectAll}>
                    {selectedReports.length === reports.length ? "Unselect All" : "Select All"}
                </button>
                <span className="selected-count">
                    {selectedReports.length} selected
                </span>
                <button
                className="confirm-delete-btn"
                onClick={handleDeleteSelected}
                disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete Selected"}
                </button>
            </div>
        )}

          {loading ? (
            <div className="empty-state">Loading reports...</div>
          ) : fetchError ? (
            <div className="empty-state">{fetchError}</div>
          ) : reports.length === 0 ? (
            <div className="empty-state">No reports found.</div>
          ) : (
            <div className="reports-list">
              {reports.map((report) => (
                <div
                className="report-card"
                key={report.id}
                onClick={() => navigate(`/report/${report.id}`)}
                >
                    {selectionMode && (
                        <div className="report-select-row">
                            <input
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                            className="report-checkbox"
                            />
                        <span className="select-label">Select</span>
                    </div>
                )}

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
              <span>Rejected</span>
              <strong>{stats.rejected}</strong>
            </div>

            <div className="stat-row">
              <span>Manual Review Required</span>
              <strong>{stats.manualReviewRequired}</strong>
            </div>
          </div>

          <div className="chart-card">
            <h3>Status Overview</h3>
            
            <div className="pie-chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie
                         data={pieData}
                         dataKey="value"
                         nameKey="name"
                         cx="50%"
                         cy="50%"
                         outerRadius={80}
                         label
                        >
                         {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                         ))}
                        </Pie>

                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
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