import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import logo from "../assets/lokawazlogo.png";

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const reportRef = doc(db, "pothole_reports", id);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setReport(reportSnap.data());
        } else {
          setReport(null);
        }
      } catch (error) {
        console.error("Error fetching report details:", error);
      }
    };

    fetchReport();
  }, [id]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      return timestamp.toDate().toLocaleString();
    } catch {
      return "Invalid timestamp";
    }
  };

  return (
    <div className="report-details-page">
      <div className="report-details-topbar">
        <div className="details-topbar-left">
          <h1>Report Details</h1>
          <img src={logo} alt="LokAwaaz Logo" className="details-logo" />
        </div>

        <button className="back-btn" onClick={() => navigate("/home")}>
          Back
        </button>
      </div>

      {report ? (
        <div className="report-details-content">
          <div className="details-image-card">
            {report.imageUrl ? (
              <img
                src={report.imageUrl}
                alt="Reported issue"
                className="details-image"
              />
            ) : (
              <div className="details-image-placeholder">
                No image available
              </div>
            )}
          </div>

          <div className="details-info-card">
            <div className="details-row">
              <span className="details-label">Status</span>
              <span className="details-value">{report.status || "N/A"}</span>
            </div>

            <div className="details-row">
              <span className="details-label">Assigned Worker Name</span>
              <span className="details-value">
                {report.assigned_name || "Not assigned yet"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Assigned Worker ID</span>
              <span className="details-value">
                {report.assigned_to || "N/A"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">User ID</span>
              <span className="details-value">{report.userId || "N/A"}</span>
            </div>

            <div className="details-row">
              <span className="details-label">Reported Via</span>
              <span className="details-value">
                {report.reportedVia || "N/A"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Latitude</span>
              <span className="details-value">
                {report.location?.lat ?? "N/A"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Longitude</span>
              <span className="details-value">
                {report.location?.lng ?? "N/A"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Upvotes</span>
              <span className="details-value">{report.upvotes ?? 0}</span>
            </div>

            <div className="details-row">
              <span className="details-label">Reported At</span>
              <span className="details-value">
                {formatTimestamp(report.timestamp)}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Last Detected</span>
              <span className="details-value">
                {formatTimestamp(report.last_detected)}
              </span>
            </div>

            <div className="details-row details-row-notes">
              <span className="details-label">AI Audit Notes</span>
              <span className="details-value details-notes">
                {report.ai_audit_notes || "No audit notes available"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-details-loading">Loading report...</div>
      )}
    </div>
  );
}

export default ReportDetails;