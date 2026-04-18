import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = getFirestore();

/**
 * Helper: Haversine formula to calculate distance in KM
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const assignPotholeTask = onDocumentCreated(
  "pothole_reports/{reportId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const reportData = snapshot.data();
    const reportId = event.params.reportId;

    if (reportData.assigned_to) return null;

    const reportLat = reportData.location.lat;
    const reportLng = reportData.location.lng;

    try {
      const staffQuery = await db.collection("field_staff")
        .where("duty_status", "==", true)
        .where("assignedTask", "==", "")
        .get();

      if (staffQuery.empty) {
        await db.collection("pothole_reports").doc(reportId)
          .update({status: "Pending"});
        return null;
      }

      let nearestStaff: any = null;
      let minDistance = Infinity;

      staffQuery.forEach((doc) => {
        const staffData = doc.data();
        const staffLoc = staffData.location;
        const dist = getDistance(
          reportLat,
          reportLng,
          staffLoc.latitude,
          staffLoc.longitude
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestStaff = {id: doc.id, ...staffData};
        }
      });

      if (nearestStaff) {
        const batch = db.batch();
        batch.update(db.collection("field_staff").doc(nearestStaff.id), {
          assignedTask: reportId,
        });
        batch.update(db.collection("pothole_reports").doc(reportId), {
          assigned_to: nearestStaff.fsid,
          assigned_name: nearestStaff.name,
          status: "Assigned",
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Assignment Error:", error);
    }
    return null;
  }
);

export const onStaffAvailable = onDocumentUpdated(
  "field_staff/{staffId}",
  async (event) => {
    const data = event.data;
    if (!data) return null;

    const before = data.before.data();
    const after = data.after.data();
    const staffId = event.params.staffId;

    const becameFree = before.assignedTask !== "" && after.assignedTask === "";
    const becameOnDuty = !before.duty_status && after.duty_status;

    if ((becameFree || becameOnDuty) && after.duty_status) {
      try {
        const pending = await db.collection("pothole_reports")
          .where("status", "==", "Pending")
          .orderBy("timestamp", "asc")
          .limit(1)
          .get();

        if (pending.empty) return null;

        const reportDoc = pending.docs[0];
        const batch = db.batch();
        batch.update(db.collection("field_staff").doc(staffId), {
          assignedTask: reportDoc.id,
        });
        batch.update(db.collection("pothole_reports").doc(reportDoc.id), {
          assigned_to: after.fsid,
          assigned_name: after.name,
          status: "Assigned",
        });
        await batch.commit();
      } catch (error) {
        console.error("Backlog Error:", error);
      }
    }
    return null;
  }
);
