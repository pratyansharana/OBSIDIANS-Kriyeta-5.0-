import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const db = getFirestore();

// Securely load your Gemini API Key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

// Haversine formula to calculate distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Downloads an image URL and converts it to Base64 for Gemini
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * ==========================================
 * TRIGGER 1: NEW REPORT CREATED
 * Action: Finds nearest on-duty free worker
 * ==========================================
 */
export const assignPotholeTask = onDocumentCreated(
  "pothole_reports/{reportId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const reportData = snapshot.data();
    const reportId = event.params.reportId;

    if (reportData.assigned_to) return null;

    logger.info(`[assignPotholeTask] 🆕 New report detected: ${reportId}`);

    const reportLat = reportData.location.lat;
    const reportLng = reportData.location.lng;

    try {
      const staffQuery = await db
        .collection("field_staff")
        .where("duty_status", "==", true)
        .where("assignedTask", "==", "")
        .get();

      if (staffQuery.empty) {
        logger.warn(`[assignPotholeTask] ⚠️ No free staff for ${reportId}. Marking as Pending.`);
        await db.collection("pothole_reports").doc(reportId).update({ status: "Pending" });
        return null;
      }

      let nearestStaff: any = null;
      let minDistance = Infinity;

      staffQuery.forEach((doc) => {
        const staffData = doc.data();
        const staffLoc = staffData.location;
        const dist = getDistance(reportLat, reportLng, staffLoc.latitude, staffLoc.longitude);

        if (dist < minDistance) {
          minDistance = dist;
          nearestStaff = { id: doc.id, ...staffData };
        }
      });

      if (nearestStaff) {
        logger.info(`[assignPotholeTask] 🎯 Assigning ${reportId} to ${nearestStaff.name} (Dist: ${minDistance.toFixed(2)}km)`);
        
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
        logger.info(`[assignPotholeTask] ✅ Assignment committed for ${reportId}`);
      }
    } catch (error) {
      logger.error(`[assignPotholeTask] ❌ Error assigning task ${reportId}:`, error);
    }
    return null;
  }
);

/**
 * ==========================================
 * TRIGGER 2: AI REPAIR VERIFICATION
 * Action: Worker submits photo -> Gemini checks -> Approves/Rejects
 * ==========================================
 */
export const verifyRepair = onDocumentUpdated(
  {
    document: "pothole_reports/{reportId}",
    secrets: [geminiApiKey],
  },
  async (event) => {
    const data = event.data;
    if (!data) return null;

    const before = data.before.data();
    const after = data.after.data();
    const reportId = event.params.reportId;

    // 🔥 Trigger only when the mobile app updates status to "Pending_Verification"
    if (before.status !== "Pending_Verification" && after.status === "Pending_Verification") {
      logger.info(`[verifyRepair] 🤖 Initiating AI verification for report ${reportId}`);

      const originalImageUrl = after.imageUrl;
      const completionImage = after.completionImage; // 🔥 Using the exact field name from your database

      if (!originalImageUrl || !completionImage) {
        logger.error(`[verifyRepair] ❌ Missing images for ${reportId}. Rejecting.`);
        await event.data?.after.ref.update({ 
          status: "Rejected", 
          ai_audit_notes: "Missing before/after image data." 
        });
        return null;
      }

      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json" } 
        });

        logger.info(`[verifyRepair] 📥 Downloading images to Base64...`);
        const [originalBase64, repairBase64] = await Promise.all([
          fetchImageAsBase64(originalImageUrl),
          fetchImageAsBase64(completionImage)
        ]);

        const prompt = `
          You are a strict, uncompromising civic maintenance auditor. 
          Image 1 (First image) is a reported pothole.
          Image 2 (Second image) is a submitted repair.
          
          You must fail the repair (verified: false) if ANY of the following are true:
          - Image 2 is just a picture of an empty road, a screen, a random object, or grass.
          - The geographic surroundings (curbs, lines, textures) in Image 2 clearly do not match Image 1.
          - There is no visible fresh asphalt, tar, or cement patching the specific hole from Image 1.
          
          Return JSON:
          {
            "verified": boolean,
            "reason": "1-sentence explanation"
          }
        `;

        const imageParts = [
          { inlineData: { data: originalBase64, mimeType: "image/jpeg" } },
          { inlineData: { data: repairBase64, mimeType: "image/jpeg" } }
        ];

        logger.info(`[verifyRepair] 🧠 Sending payload to Gemini 1.5 Flash...`);
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        const aiDecision = JSON.parse(responseText);

        logger.info(`[verifyRepair] ⚖️ Decision: Verified=${aiDecision.verified}. Reason: ${aiDecision.reason}`);

        if (aiDecision.verified === true) {
          // 🎉 Setting to Resolved will automatically trigger `onTaskResolved`
          await event.data?.after.ref.update({
            status: "Resolved",
            ai_audit_notes: aiDecision.reason,
            verified_at: FieldValue.serverTimestamp()
          });
          logger.info(`[verifyRepair] 🎉 Report ${reportId} approved & marked Resolved!`);
        } else {
          await event.data?.after.ref.update({
            status: "Rejected",
            ai_audit_notes: aiDecision.reason,
            completionImage: FieldValue.delete() // Clear the bad image so they can try again
          });
          logger.info(`[verifyRepair] 🚫 Report ${reportId} rejected by AI.`);
        }

      } catch (error) {
        logger.error(`[verifyRepair] 💥 Critical AI Error on ${reportId}:`, error);
        await event.data?.after.ref.update({ status: "Manual_Review_Required" });
      }
    }
    return null;
  }
);

/**
 * ==========================================
 * TRIGGER 3: TASK CHAINING
 * Action: AI marks as Resolved -> Free worker -> Assign next task
 * ==========================================
 */
export const onTaskResolved = onDocumentUpdated(
  "pothole_reports/{reportId}",
  async (event) => {
    const data = event.data;
    if (!data) return null;

    const before = data.before.data();
    const after = data.after.data();
    const reportId = event.params.reportId;

    if (before.status !== "Resolved" && after.status === "Resolved") {
      const staffId = after.assigned_to; 
      
      if (!staffId) return null;

      logger.info(`[onTaskResolved] 🔄 Report ${reportId} closed. Finding next task for staff: ${staffId}`);

      try {
        const staffDoc = await db.collection("field_staff").doc(staffId).get();
        if (!staffDoc.exists) return null;
        
        const staffData = staffDoc.data();
        const staffLoc = staffData?.location;

        // 🔥 ADDED .limit(50) to prevent Out-Of-Memory DB crashes!
        const pendingQuery = await db.collection("pothole_reports")
          .where("status", "==", "Pending")
          .limit(50) 
          .get();

        const batch = db.batch();

        if (pendingQuery.empty) {
          logger.info(`[onTaskResolved] 🏖️ No pending tasks found. Freeing staff ${staffId}.`);
          batch.update(db.collection("field_staff").doc(staffId), { assignedTask: "" });
          await batch.commit();
          return null;
        }

        let nextTask: any = null;
        let minDistance = Infinity;

        pendingQuery.forEach((doc) => {
          const rData = doc.data();
          if (staffLoc && rData.location) {
            const dist = getDistance(staffLoc.latitude, staffLoc.longitude, rData.location.lat, rData.location.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nextTask = { id: doc.id, ...rData };
            }
          }
        });

        if (!nextTask) nextTask = { id: pendingQuery.docs[0].id, ...pendingQuery.docs[0].data() };

        logger.info(`[onTaskResolved] 🎯 Found next nearest task: ${nextTask.id} (${minDistance.toFixed(2)}km)`);

        batch.update(db.collection("field_staff").doc(staffId), { assignedTask: nextTask.id });
        batch.update(db.collection("pothole_reports").doc(nextTask.id), {
          assigned_to: staffData?.fsid,
          assigned_name: staffData?.name,
          status: "Assigned",
        });

        await batch.commit();
        logger.info(`[onTaskResolved] ✅ Chained task ${nextTask.id} to staff ${staffId}`);

      } catch (error) {
        logger.error(`[onTaskResolved] ❌ Error chaining task after ${reportId}:`, error);
      }
    }
    return null;
  }
);

/**
 * ==========================================
 * TRIGGER 4: STAFF CLOCKS IN
 * Action: Worker goes on-duty -> Search backlog -> Assign task
 * ==========================================
 */
export const onStaffAvailable = onDocumentUpdated(
  "field_staff/{staffId}",
  async (event) => {
    const data = event.data;
    if (!data) return null;

    const before = data.before.data();
    const after = data.after.data();
    const staffId = event.params.staffId;

    const becameOnDuty = !before.duty_status && after.duty_status;

    if (becameOnDuty && after.assignedTask === "") {
      logger.info(`[onStaffAvailable] 🟢 Staff ${staffId} clocked in. Checking backlog...`);

      try {
        const staffLoc = after.location;

        // 🔥 ADDED .limit(50) to prevent Out-Of-Memory DB crashes!
        const pendingQuery = await db.collection("pothole_reports")
          .where("status", "==", "Pending")
          .limit(50)
          .get();

        if (pendingQuery.empty) {
          logger.info(`[onStaffAvailable] 🏖️ No backlog tasks pending for ${staffId}.`);
          return null;
        }

        let nextTask: any = null;
        let minDistance = Infinity;

        pendingQuery.forEach((doc) => {
          const rData = doc.data();
          if (staffLoc && rData.location) {
            const dist = getDistance(staffLoc.latitude, staffLoc.longitude, rData.location.lat, rData.location.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nextTask = { id: doc.id, ...rData };
            }
          }
        });

        if (!nextTask) nextTask = { id: pendingQuery.docs[0].id, ...pendingQuery.docs[0].data() };

        logger.info(`[onStaffAvailable] 🎯 Assigning backlog task ${nextTask.id} to ${staffId}`);

        const batch = db.batch();
        batch.update(db.collection("field_staff").doc(staffId), { assignedTask: nextTask.id });
        batch.update(db.collection("pothole_reports").doc(nextTask.id), {
          assigned_to: after.fsid,
          assigned_name: after.name,
          status: "Assigned",
        });
        
        await batch.commit();
        logger.info(`[onStaffAvailable] ✅ Backlog assignment successful.`);
      } catch (error) {
        logger.error(`[onStaffAvailable] ❌ Error assigning duty backlog to ${staffId}:`, error);
      }
    }
    return null;
  }
);