import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { auth } from '../Firebase/FirebaseConfig';
import { addToQueue, processQueue } from '../services/QueueService'; 
// 👆 adjust path based on your project

const ManualReportingScreen = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCamera, setIsCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const cameraRef = useRef<Camera>(null);

  // ================= INIT LOCATION =================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location required');
          setLoading(false);
          return;
        }

        if (!hasPermission) {
          await requestPermission();
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ================= CAPTURE PHOTO =================
  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'auto',
      });

      setPhotoUri(`file://${photo.path}`);
      setIsCamera(false);
    } catch (e) {
      Alert.alert('Error', 'Camera failed');
    }
  };

  // ================= SUBMIT (QUEUE SYSTEM) =================
  const submitReport = async () => {
    if (!location || !photoUri) {
      Alert.alert('Missing data', 'Photo + location required');
      return;
    }

    try {
      setSubmitting(true);

      // 🔥 STEP 1: Add to SQLite queue
      addToQueue(
        photoUri,
        location.latitude,
        location.longitude,
        auth.currentUser?.uid
      );

      // 🔥 STEP 2: Try immediate sync (if internet available)
      await processQueue();

      Alert.alert(
        'Saved',
        'Report added to queue. It will sync automatically.'
      );

      setPhotoUri(null);
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to queue report');
    } finally {
      setSubmitting(false);
    }
  };

  // ================= CAMERA MODE =================
  if (isCamera && device) {
    return (
      <View style={styles.container}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
        />

        <View style={styles.cameraBar}>
          <TouchableOpacity onPress={() => setIsCamera(false)}>
            <Text style={{ color: '#fff' }}>CANCEL</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.capture} onPress={capturePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ================= LOADING =================
  if (loading || !location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00FF00" />
        <Text style={{ color: '#888', marginTop: 10 }}>
          Getting location...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* MAP (NO GOOGLE DEPENDENCY) */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onPress={(e) => setLocation(e.nativeEvent.coordinate)}
        showsUserLocation
      >
        <Marker
          coordinate={location}
          draggable
          onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
          pinColor="green"
        />
      </MapView>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Manual Report</Text>
        <Text style={styles.sub}>Offline-first queue system</Text>
      </View>

      {/* ACTION BAR */}
      <View style={styles.actionBar}>

        <TouchableOpacity
          style={styles.photoBox}
          onPress={() => setIsCamera(true)}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : (
            <Text style={{ color: '#fff' }}>+ Photo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submit}
          onPress={submitReport}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: '#000', fontWeight: 'bold' }}>
              Queue Report
            </Text>
          )}
        </TouchableOpacity>

      </View>

    </View>
  );
};

export default ManualReportingScreen;

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#000000aa',
    padding: 10,
    borderRadius: 10,
  },

  title: { color: '#fff', fontWeight: 'bold' },
  sub: { color: '#888', fontSize: 10 },

  actionBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },

  photoBox: {
    flex: 1,
    height: 55,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },

  preview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },

  submit: {
    flex: 1,
    height: 55,
    backgroundColor: '#00FF00',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },

  cameraBar: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  capture: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  captureInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
});