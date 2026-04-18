import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { uploadPotholeReport } from '../Firebase/FirebaseConfig';

const db = SQLite.openDatabaseSync('pothole_queue.db');

/**
 * Initializes the local SQLite database.
 * Run this on app launch.
 */
export const initDB = () => {
  // Create a table to store detections waiting for upload
  // Added userId column to persist user ownership offline
  db.execSync(`
    CREATE TABLE IF NOT EXISTS upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      localUri TEXT,
      latitude REAL,
      longitude REAL,
      userId TEXT,
      timestamp TEXT
    );
  `);
};

/**
 * 1. Add to Queue
 * Saves detection data locally when the system is offline or upload fails.
 */
export const addToQueue = (uri: string, lat: number, lng: number, userId: string | undefined) => {
  try {
    db.runSync(
      'INSERT INTO upload_queue (localUri, latitude, longitude, userId, timestamp) VALUES (?, ?, ?, ?, ?)',
      [
        uri, 
        lat, 
        lng, 
        userId || 'anonymous', 
        new Date().toISOString()
      ]
    );
    console.log("📍 [Queue] Detection stored in local SQLite.");
  } catch (error) {
    console.error("❌ [Queue] Failed to save locally:", error);
  }
};

/**
 * 2. Process Queue
 * Uploads all locally stored detections to Firebase when internet returns.
 */
export const processQueue = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    console.log("📵 [Queue] Sync skipped: No internet connection.");
    return;
  }

  // Fetch all pending items
  const rows: any[] = db.getAllSync('SELECT * FROM upload_queue');
  
  if (rows.length === 0) {
    console.log("📦 [Queue] Sync skipped: Queue is empty.");
    return;
  }

  console.log(`🔄 [Queue] Starting sync for ${rows.length} items...`);

  for (const row of rows) {
    try {
      // Pass the row data back to your Firebase upload logic
      // Note: We include the stored userId to ensure the report stays with the right user
      const success = await uploadPotholeReport(
        row.localUri, 
        row.latitude, 
        row.longitude, 
        row.userId
      );
      
      if (success) {
        // Only delete from local DB if Firebase confirmed the record was created
        db.runSync('DELETE FROM upload_queue WHERE id = ?', [row.id]);
        console.log(`✅ [Queue] Item ${row.id} synced and cleared.`);
      } else {
        console.warn(`⚠️ [Queue] Firebase rejected item ${row.id}. Will retry later.`);
      }
    } catch (error) {
      console.error(`❌ [Queue] Critical error syncing item ${row.id}:`, error);
      // We break the loop on a critical error to prevent spamming failed requests
      break; 
    }
  }
};

/**
 * 3. Get Queue Count
 * Useful for updating the HUD in Dashcam.tsx
 */
export const getQueueCount = (): number => {
  try {
    const result: any = db.getFirstSync('SELECT COUNT(*) as count FROM upload_queue');
    return result?.count || 0;
  } catch (e) {
    return 0;
  }
};