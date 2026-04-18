import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import logo from "../assets/lokawazlogo.png";

function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [worker, setWorker] = useState(null);

  const parseWorkerLocation = (locationValue) => {
    if (!locationValue) return { lat: null, lng: null };

    // if someday you store as object
    if (
      typeof locationValue === "object" &&
      !Array.isArray(locationValue) &&
      locationValue.lat !== undefined &&
      locationValue.lng !== undefined
    ) {
      return {
        lat: Number(locationValue.lat),
        lng: Number(locationValue.lng),
      };
    }

    // current format: ["22.8208015° N", "75.9428743° E"]
    if (Array.isArray(locationValue) && locationValue.length >= 2) {
      const rawLat = String(locationValue[0]);
      const rawLng = String(locationValue[1]);

      let lat = parseFloat(rawLat);
      let lng = parseFloat(rawLng);

      if (rawLat.includes("S")) lat = -Math.abs(lat);
      if (rawLng.includes("W")) lng = -Math.abs(lng);

      return {
        lat: Number.isNaN(lat) ? null : lat,
        lng: Number.isNaN(lng) ? null : lng,
      };
    }

    return { lat: null, lng: null };
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      return timestamp.toDate().toLocaleString();
    } catch {
      return "Invalid timestamp";
    }
  };

  const formatMillis = (value) => {
    if (!value) return "N/A";

    try {
      return new Date(Number(value)).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  useEffect(() => {
    const fetchReportAndWorker = async () => {
      try {
        const reportRef = doc(db, "pothole_reports", id);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
          setReport(null);
          setWorker(null);
          return;
        }

        const reportData = reportSnap.data();
        setReport(reportData);

        if (reportData.assigned_to) {
          const workerRef = doc(db, "field_staff", reportData.assigned_to);
          const workerSnap = await getDoc(workerRef);

          if (workerSnap.exists()) {
            setWorker(workerSnap.data());
          } else {
            setWorker(null);
            console.log("Worker document not found");
          }
        } else {
          setWorker(null);
        }
      } catch (error) {
        console.error("Error fetching report/worker details:", error);
      }
    };

    fetchReportAndWorker();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const reportRef = doc(db, "pothole_reports", id);

      await updateDoc(reportRef, {
        status: newStatus,
      });

      setReport((prev) => ({
        ...prev,
        status: newStatus,
      }));

      alert(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const workerCoords = parseWorkerLocation(worker?.location);
  const workerLat = workerCoords.lat;
  const workerLng = workerCoords.lng;

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
          {/* LEFT SIDE */}
          <div className="details-image-card">
            {/* Reported image */}
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

            {/* Worker details below report image */}
            <div className="worker-section-card">
              <h3 className="worker-section-title">Assigned Worker Details</h3>

              <div className="details-row">
                <span className="details-label">Worker Name</span>
                <span className="details-value">
                  {worker?.name || report.assigned_name || "Not assigned yet"}
                </span>
              </div>

              <div className="details-row">
                <span className="details-label">Worker Email</span>
                <span className="details-value">{worker?.email || "N/A"}</span>
              </div>

              <div className="details-row">
                <span className="details-label">Worker ID</span>
                <span className="details-value">
                  {worker?.fsid || report.assigned_to || "N/A"}
                </span>
              </div>

              <div className="details-row">
                <span className="details-label">Duty Status</span>
                <span className="details-value">
                  {worker?.duty_status === true
                    ? "On Duty"
                    : worker?.duty_status === false
                    ? "Off Duty"
                    : "N/A"}
                </span>
              </div>

              <div className="details-row">
                <span className="details-label">Assigned Task</span>
                <span className="details-value">
                  {worker?.assignedTask || "N/A"}
                </span>
              </div>

              <div className="details-row">
                <span className="details-label">Resolved Count</span>
                <span className="details-value">
                  {worker?.resolvedCount ?? "N/A"}
                </span>
              </div>

              <div className="details-row">
                <span className="details-label">Last Updated</span>
                <span className="details-value">
                  {formatMillis(worker?.lastUpdated)}
                </span>
              </div>
            </div>

            {/* Worker map */}
            <div className="worker-section-card">
              <h3 className="worker-section-title">Worker Location</h3>

              {workerLat && workerLng ? (
                <>
                  <div className="details-row">
                    <span className="details-label">Latitude</span>
                    <span className="details-value">{workerLat}</span>
                  </div>

                  <div className="details-row">
                    <span className="details-label">Longitude</span>
                    <span className="details-value">{workerLng}</span>
                  </div>

                  <div className="worker-map-wrapper">
                    <iframe
                      title="Worker Location Map"
                      width="100%"
                      height="280"
                      className="worker-map-frame"
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${workerLat},${workerLng}&z=15&output=embed`}
                    />
                  </div>
                </>
              ) : (
                <p className="worker-map-fallback">
                  Worker location not available
                </p>
              )}
            </div>

            {/* Completion image */}
            <div className="worker-section-card">
              <h3 className="worker-section-title">Completion Image</h3>

              {report.completionImage ? (
                <img
                  src={report.completionImage}
                  alt="Completion proof"
                  className="details-image"
                />
              ) : (
                <div className="details-image-placeholder">
                  No completion image available
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="details-info-card">
            <div className="details-row">
                <span className="details-label">Status</span>
                <span 
                  className={`status-badge ${report.status
                    ?.toLowerCase()
                    .replace(/[\s_]+/g, "-")}`}
                >
                 {report.status?.replace(/_/g, " ") || "N/A"}
                </span>
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
              <span className="details-label">Issue Latitude</span>
              <span className="details-value">
                {report.location?.lat ?? "N/A"}
              </span>
            </div>

            <div className="details-row">
              <span className="details-label">Issue Longitude</span>
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

            {report.status === "Manual_Review_Required" && (
              <div className="manual-review-actions">
                <button
                  className="resolve-btn"
                  onClick={() => handleStatusUpdate("resolved")}
                >
                  Mark Resolved
                </button>

                <button
                  className="unresolve-btn"
                  onClick={() => handleStatusUpdate("pending")}
                >
                  Mark Unresolved
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="report-details-loading">Loading report...</div>
      )}
    </div>
  );
}

export default ReportDetails;