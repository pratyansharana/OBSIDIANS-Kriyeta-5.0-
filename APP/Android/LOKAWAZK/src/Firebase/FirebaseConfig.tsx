import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
 * Main function to upload the pothole report
 * Added userId parameter to handle data separation
 */
export const uploadPotholeReport = async (
  localFilePath: string, 
  latitude: number, 
  longitude: number,
  userId: string | undefined // 🔥 Added userId here
) => {
  try {
    console.log('☁️ Starting Firebase upload process...');

    // Step 1: Prepare the file for Storage
    const fileName = `potholes/pothole_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    const blob = await uriToBlob(localFilePath);

    // Step 2: Upload to Firebase Cloud Storage
    console.log('⬆️ Uploading image to Cloud Storage...');
    const uploadTask = await uploadBytesResumable(storageRef, blob);
    
    // Step 3: Get the public download URL of the uploaded image
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    console.log('✅ Image uploaded! URL:', downloadUrl);

    // Step 4: Save the metadata & URL to Firestore
    console.log('📝 Saving report to Firestore database...');
    const docRef = await addDoc(collection(db, 'pothole_reports'), {
      userId: userId || 'anonymous', // 🔥 Saved userId to the document
      location: {
        lat: latitude,
        lng: longitude
      },
      imageUrl: downloadUrl,
      status: 'unverified',
      timestamp: serverTimestamp(),
    });

    console.log('✅ Database record created with ID:', docRef.id);
    return true;

  } catch (error) {
    console.error('❌ Firebase Upload Failed:', error);
    return false;
  }
};