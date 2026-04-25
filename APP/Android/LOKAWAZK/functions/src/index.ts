import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const db = getFirestore();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

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

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

/**
 * ==========================================
 * TRIGGER 1: NEW REPORT CREATED (WITH AI FILTER)
 * ==========================================
 */
export const assignPotholeTask = onDocumentCreated(
  {
    document: "pothole_reports/{reportId}",
    secrets: [geminiApiKey], // Now has access to Gemini
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const reportData = snapshot.data();
    const reportId = event.params.reportId;

    // Skip if already assigned or already processed by AI
    if (reportData.assigned_to || reportData.status === "Rejected" || reportData.status === "Assigned") return null;

    logger.info(`[assignPotholeTask] 🤖 Running AI Pothole Validation on: ${reportId}`);

    try {
      // 1. AI VALIDATION
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
      });

      const base64Image = await fetchImageAsBase64(reportData.imageUrl);
      
      const prompt = `
        Analyze this image. Is it a legitimate road pothole that requires maintenance?
        Strictly reject: blurry photos, photos of clouds, grass, random objects, or people.
        Return JSON:
        {
          "isValid": boolean,
          "reason": "1-sentence explanation"
        }
      `;

      const result = await model.generateContent([
        prompt, 
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ]);
      
      const aiDecision = JSON.parse(result.response.text());

      if (!aiDecision.isValid) {
        logger.warn(`[assignPotholeTask] 🚫 Report ${reportId} rejected by AI. Reason: ${aiDecision.reason}`);
        await snapshot.ref.update({ 
          status: "Rejected", 
          ai_audit_notes: "AI Validation Failed: " + aiDecision.reason 
        });
        return null;
      }

      logger.info(`[assignPotholeTask] ✅ AI Validated report ${reportId}. Proceeding to assignment.`);

      // 2. ASSIGNMENT LOGIC (Only runs if AI says YES)
      const reportLat = reportData.location.lat;
      const reportLng = reportData.location.lng;

      const staffQuery = await db
        .collection("field_staff")
        .where("duty_status", "==", true)
        .where("assignedTask", "==", "")
        .get();

      if (staffQuery.empty) {
        logger.warn(`[assignPotholeTask] ⚠️ No free staff for ${reportId}. Marking as Pending.`);
        await snapshot.ref.update({ status: "Pending" });
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
        const batch = db.batch();
        batch.update(db.collection("field_staff").doc(nearestStaff.id), { assignedTask: reportId });
        batch.update(snapshot.ref, {
          assigned_to: nearestStaff.fsid,
          assigned_name: nearestStaff.name,
          status: "Assigned",
          ai_audit_notes: "AI Validated: " + aiDecision.reason
        });
        await batch.commit();
        logger.info(`[assignPotholeTask] ✅ Assignment committed for ${reportId}`);
      }
    } catch (error) {
      logger.error(`[assignPotholeTask] ❌ Error in assignment pipeline:`, error);
      await snapshot.ref.update({ status: "Manual_Review_Required", ai_audit_notes: "AI processing failed." });
    }
    return null;
  }
);

/**
 * ==========================================
 * TRIGGER 2: AI REPAIR VERIFICATION
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

    if (before.status !== "Pending_Verification" && after.status === "Pending_Verification") {
      logger.info(`[verifyRepair] 🤖 Initiating AI verification for report ${reportId}`);

      const originalImageUrl = after.imageUrl;
      const completionImage = after.completionImage;

      if (!originalImageUrl || !completionImage) {
        logger.error(`[verifyRepair] ❌ Missing images for ${reportId}. Rejecting.`);
        await event.data?.after.ref.update({ 
          status: "Flagged", 
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

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();
        const aiDecision = JSON.parse(responseText);

        if (aiDecision.verified === true) {
          await event.data?.after.ref.update({
            status: "Resolved",
            ai_audit_notes: aiDecision.reason,
            verified_at: FieldValue.serverTimestamp()
          });
        } else {
          await event.data?.after.ref.update({
            status: "Rejected",
            ai_audit_notes: aiDecision.reason
          });
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

      try {
        const staffDoc = await db.collection("field_staff").doc(staffId).get();
        if (!staffDoc.exists) return null;
        
        const staffData = staffDoc.data();
        const staffLoc = staffData?.location;

        const pendingQuery = await db.collection("pothole_reports")
          .where("status", "==", "Pending")
          .limit(50) 
          .get();

        const batch = db.batch();

        if (pendingQuery.empty) {
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

        batch.update(db.collection("field_staff").doc(staffId), { assignedTask: nextTask.id });
        batch.update(db.collection("pothole_reports").doc(nextTask.id), {
          assigned_to: staffData?.fsid,
          assigned_name: staffData?.name,
          status: "Assigned",
        });

        await batch.commit();
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
      try {
        const staffLoc = after.location;

        const pendingQuery = await db.collection("pothole_reports")
          .where("status", "==", "Pending")
          .limit(50)
          .get();

        if (pendingQuery.empty) return null;

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

        const batch = db.batch();
        batch.update(db.collection("field_staff").doc(staffId), { assignedTask: nextTask.id });
        batch.update(db.collection("pothole_reports").doc(nextTask.id), {
          assigned_to: after.fsid,
          assigned_name: after.name,
          status: "Assigned",
        });
        
        await batch.commit();
      } catch (error) {
        logger.error(`[onStaffAvailable] ❌ Error assigning duty backlog to ${staffId}:`, error);
      }
    }
    return null;
  }
);

/**
 * ==========================================
 * TRIGGER 5: USER CREDIT REWARD (FINAL)
 * ==========================================
 */
export const rewardUserOnApproval = onDocumentUpdated(
  "pothole_reports/{reportId}",
  async (event) => {
    const data = event.data;
    if (!data) return null;

    const before = data.before.data();
    const after = data.after.data();
    const reportId = event.params.reportId;

    // 🧠 Debug log
    logger.info(
      `[rewardUserOnApproval] 🔍 Status Change for ${reportId}: ${before.status} → ${after.status}`
    );

    // ✅ Only reward ONCE when status becomes "Resolved"
    if (
      before.status !== "Resolved" &&
      after.status === "Resolved" &&
      !after.rewarded
    ) {
      const userId = after.userId;

      if (!userId) {
        logger.error(
          `[rewardUserOnApproval] ❌ Missing userId for report ${reportId}`
        );
        return null;
      }

      try {
        const userRef = db.collection("users").doc(userId);

        // 🎯 Add credits safely
        await userRef.set(
          {
            credits: FieldValue.increment(10),
          },
          { merge: true }
        );

        // 🔒 Mark report as rewarded (prevents duplicate credits)
        await data.after.ref.update({
          rewarded: true,
        });

        logger.info(
          `[rewardUserOnApproval] 💰 +10 credits given to user ${userId} for report ${reportId}`
        );
      } catch (error) {
        logger.error(
          `[rewardUserOnApproval] ❌ Error while rewarding user:`,
          error
        );
      }
    }

    return null;
  }
);