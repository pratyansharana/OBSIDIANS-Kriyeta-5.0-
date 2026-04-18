import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 1️⃣ Add your Firebase Web Config here
const firebaseConfig = {
  apiKey: "AIzaSyBDE9akAZZ3MhL87TVBbWgMSgsNxyq9rOw",
  authDomain: "lokawazk-be431.firebaseapp.com",
  projectId: "lokawazk-be431",
  storageBucket: "lokawazk-be431.firebasestorage.app",
  messagingSenderId: "1006188739154",
  appId: "1:1006188739154:web:cb291f94e40fa99d417d8b",
  measurementId: "G-GJ4MJ7QHQ0"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Initialize and EXPORT your services ONCE right here
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Helper: Converts a local file URI (from expo-file-system) into a Blob
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error('URI to Blob conversion failed.'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

/**
 * Helper: Calculates the distance between two coordinates in METERS
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

/**
 * Main function to upload the pothole report with 10m spatial deduplication
 */
/**
 * Main function to upload the pothole report with 10m spatial deduplication
 */
export const uploadPotholeReport = async (
  localFilePath: string, 
  latitude: number | string, // Accept string just in case SQLite sends one
  longitude: number | string,
  userId: string | undefined
) => {
  try {
    console.log('☁️ Starting Firebase upload/deduplication process...');

    // 1. FORCE NUMBERS (Crucial fix for SQLite data)
    const numLat = Number(latitude);
    const numLng = Number(longitude);

    if (isNaN(numLat) || isNaN(numLng)) {
      console.error("❌ Invalid coordinates passed to upload process.");
      return false;
    }

    const RADIUS_LIMIT = 10; // meters
    // INCREASED to 0.0002 (~22 meters). This is a safe "search box".
    // Haversine will still filter it down to exactly 10m later.
    const LAT_OFFSET = 0.0002; 

    // ---------------------------------------------------------
    // STEP 1: FAST BOUNDING BOX QUERY
    // ---------------------------------------------------------
    const boundsQuery = query(
      collection(db, 'pothole_reports'),
      where('location.lat', '>=', numLat - LAT_OFFSET),
      where('location.lat', '<=', numLat + LAT_OFFSET)
    );

    const snapshot = await getDocs(boundsQuery);
    
    let closestReportId: string | null = null;
    let minDistance = RADIUS_LIMIT;

    // ---------------------------------------------------------
    // STEP 2: PRECISE HAVERSINE FILTERING
    // ---------------------------------------------------------
    snapshot.forEach((document) => {
      const data = document.data();
      
      // Ignore resolved reports so they get a fresh ticket
      if (data.status === 'Resolved') return;
      
      if (data.location && data.location.lng >= numLng - LAT_OFFSET && data.location.lng <= numLng + LAT_OFFSET) {
        const distance = getDistanceInMeters(numLat, numLng, data.location.lat, data.location.lng);
        
        if (distance <= RADIUS_LIMIT && distance < minDistance) {
          minDistance = distance;
          closestReportId = document.id;
        }
      }
    });

    // ---------------------------------------------------------
    // STEP 3: DEDUPLICATION DECISION
    // ---------------------------------------------------------
    if (closestReportId) {
      console.log(`📍 Found existing pothole ${minDistance.toFixed(1)}m away. Upvoting instead of creating.`);
      console.log(`🛠️ Target Document ID: ${closestReportId}`); 

      await updateDoc(doc(db, 'pothole_reports', closestReportId), {
        upvotes: increment(1),
        last_detected: serverTimestamp(),
      });
      
      console.log(`✅ Successfully pushed upvote to Firestore!`); 
      return true; 
    }

    // ---------------------------------------------------------
    // STEP 4: NO NEARBY REPORTS - UPLOAD IMAGE & CREATE NEW
    // ---------------------------------------------------------
    console.log(`🆕 No existing active reports within 10m. Creating new ticket...`);

    const fileName = `potholes/pothole_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    const blob = await uriToBlob(localFilePath);

    console.log('⬆️ Uploading image to Cloud Storage...');
    const uploadTask = await uploadBytesResumable(storageRef, blob);
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    console.log('✅ Image uploaded!');

    const docRef = await addDoc(collection(db, 'pothole_reports'), {
      userId: userId || 'anonymous',
      location: {
        lat: numLat,
        lng: numLng
      },
      imageUrl: downloadUrl,
      status: 'Pending',
      upvotes: 1,
      reportedVia: 'Dashcam',
      timestamp: serverTimestamp(),
      last_detected: serverTimestamp(),
    });

    console.log('✅ Database record created with ID:', docRef.id);
    return true;

  } catch (error: any) {
    // Print the exact error message to catch any Firestore Indexing issues
    console.error('❌ Firebase Upload Failed:', error.message || error);
    return false; 
  }
};