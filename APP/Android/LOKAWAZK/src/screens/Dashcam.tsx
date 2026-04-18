import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { LocationObjectCoords } from 'expo-location'; 
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';

// 🔥 PROJECT IMPORTS
import { addToQueue, processQueue, initDB } from '../services/QueueService';
import { usePotholeDetection } from '../services/Detection'; 
import { uploadPotholeReport, auth } from '../Firebase/FirebaseConfig'; 

const { width, height } = Dimensions.get('window');
const db = SQLite.openDatabaseSync('pothole_queue.db');

export default function Dashcam() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  // --- HUD & COUNTER STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [sessionCount, setSessionCount] = useState(0); 
  const [pendingSync, setPendingSync] = useState(0);    

  // Initialize DB, Listeners, and HUD refresh
  useEffect(() => {
    const setup = async () => {
      await initDB(); 
      await refreshPendingCount();
    };

    setup();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      if (state.isConnected) {
        processQueue().then(() => refreshPendingCount());
      }
    });

    if (!hasPermission) requestPermission();
    
    // Asynchronous interval to keep HUD updated
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [hasPermission, requestPermission]);

  /**
   * Helper to query SQLite for the current queue size
   * Uses Async method to prevent Java NullPointer on busy DB
   */
  const refreshPendingCount = async () => {
    try {
      if (!db) return;
      const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM upload_queue');
      setPendingSync(result?.count || 0);
    } catch (e) {
      // Gracefully handle busy database state
      console.log("DB Context busy...");
    }
  };

  /**
   * 💾 Snapshot, Saving, and Queuing logic
   * Now strictly enforces UserID injection
   */
  const handlePotholeCapture = async (coords: LocationObjectCoords | null) => {
    if (!cameraRef.current) return;

    // Capture most recent UID for data separation
    const currentUserId = auth.currentUser?.uid;
    
    setSessionCount(prev => prev + 1);

    try {
      const photo = await cameraRef.current.takePhoto({ enableShutterSound: false });
      const sourcePath = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const fileName = `pothole_${Date.now()}.jpg`;
      const permanentPath = `${FileSystem.documentDirectory}${fileName}`;

      // 1. Move to permanent storage
      await FileSystem.copyAsync({ from: sourcePath, to: permanentPath });

      if (!coords) {
        console.warn('⚠️ No GPS. Detection saved locally but not queued.');
        return;
      }

      const netState = await NetInfo.fetch();

      if (netState.isConnected) {
        // 2. Attempt Online Upload with UserID
        const success = await uploadPotholeReport(
          permanentPath, 
          coords.latitude, 
          coords.longitude, 
          currentUserId
        );
        
        if (!success) {
          // Fallback to queue if firebase upload task fails
          addToQueue(permanentPath, coords.latitude, coords.longitude, currentUserId);
        }
      } else {
        // 3. Offline: Add to SQLite Queue
        addToQueue(permanentPath, coords.latitude, coords.longitude, currentUserId);
      }

      refreshPendingCount();

    } catch (error) {
      console.error('❌ Capture Pipeline Error:', error);
    }
  };

  // ✅ Core Detection Logic
  const { detections, modelState, frameProcessor } = usePotholeDetection({
    onPotholeConfirmed: handlePotholeCapture,
  });

  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00FF00" />
        <Text style={{color: 'white', marginTop: 10}}>Initializing Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      />

      {/* 🎯 AI Bounding Boxes */}
      {detections.map((det, index) => (
        <View key={index} style={[styles.box, {
          left: det.x * width,
          top: det.y * height,
          width: det.w * width,
          height: det.h * height,
        }]}>
          <Text style={styles.label}>{Math.round(det.score * 100)}%</Text>
        </View>
      ))}

      {/* 📊 HUD / METRICS OVERLAY */}
      <View style={styles.topBar}>
        <View style={styles.statusRow}>
           <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00FF00' : '#FF3B30' }]} />
           <Text style={styles.statusText}>{isOnline ? 'SYSTEM ONLINE' : 'OFFLINE - QUEUING'}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TRIP DETECTIONS</Text>
            <Text style={styles.statValue}>{sessionCount}</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statLabel}>PENDING SYNC</Text>
            <Text style={[styles.statValue, { color: pendingSync > 0 ? '#FFD700' : '#FFF' }]}>
              {pendingSync}
            </Text>
          </View>
        </View>

        <Text style={styles.debugText}>AI Model: {modelState} | User: {auth.currentUser?.displayName || 'Unknown'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  box: { position: 'absolute', borderWidth: 3, borderColor: '#00FF00', borderRadius: 4 },
  label: { color: 'black', backgroundColor: '#00FF00', fontSize: 14, fontWeight: 'bold', paddingHorizontal: 4 },
  
  // HUD STYLING
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: 'bold' },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 2 },
  
  debugText: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 5 },
});