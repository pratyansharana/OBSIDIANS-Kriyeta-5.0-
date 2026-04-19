import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, 
  Image, Alert, SafeAreaView, Dimensions, TextInput, ScrollView 
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../Context/Themecontext';
import { uploadPotholeReport, auth } from '../Firebase/FirebaseConfig';

// 🔥 ADDED IMPORTS
import * as ImageManipulator from 'expo-image-manipulator';

const { width } = Dimensions.get('window');
const ISSUE_TYPES = ['Roads', 'Electricity', 'Sanitation', 'Garbage', 'Other'];

const ManualReportScreen = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  // Existing States
  const [hasPermissions, setHasPermissions] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // 🔥 NEW FORM STATES
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState('Roads');

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermission();
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setHasPermissions(cameraStatus === 'granted' && locationStatus.status === 'granted');

      if (locationStatus.status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }
    })();
  }, []);

  // 🔥 COMPRESSED PHOTO CAPTURE
  const takePhoto = async () => {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto({ qualityPrioritization: 'speed' });
        
        // Compress the image immediately
        const compressedImage = await ImageManipulator.manipulateAsync(
          `file://${photo.path}`,
          [{ resize: { width: 1080 } }], // Resize for speed/size
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        setPhotoUri(compressedImage.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take/compress picture.');
      }
    }
  };

  const submitReport = async () => {
    if (!photoUri || !location) return;

    setIsUploading(true);
    try {
      const userId = auth.currentUser?.uid;
      
      // Pass new form fields to your existing upload function
      const success = await uploadPotholeReport(
        photoUri,
        location.coords.latitude,
        location.coords.longitude,
        userId,
        description, 
        selectedType 
      );

      if (success) {
        Alert.alert('Success', 'Report submitted successfully!', [
          { text: 'OK', onPress: () => { setPhotoUri(null); setDescription(''); } }
        ]);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!hasPermissions) return null;
  if (device == null) return <ActivityIndicator />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>MANUAL REPORT</Text>
      </View>

      <View style={styles.cameraContainer}>
        {photoUri ? (
          // 🔥 FORM UI (Only shows after photo is taken)
          <ScrollView style={styles.formContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            
            <Text style={[styles.label, { color: theme.textPrimary }]}>Issue Type</Text>
            <View style={styles.typeGrid}>
              {ISSUE_TYPES.map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typePill, selectedType === type && { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={{ color: selectedType === type ? '#FFF' : theme.textPrimary }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.textPrimary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="Briefly describe the issue..."
              placeholderTextColor={theme.textSecondary}
              multiline
              onChangeText={setDescription}
            />

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: theme.primary }]} 
              onPress={submitReport}
              disabled={isUploading}
            >
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>SUBMIT REPORT</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary }}>Retake Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive={true} photo={true} />
        )}
      </View>

      {/* CAPTURE BUTTON */}
      {!photoUri && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={[styles.captureButtonOuter, { borderColor: theme.primary }]} onPress={takePhoto}>
            <View style={[styles.captureButtonInner, { backgroundColor: theme.primary }]} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 15, alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  cameraContainer: { flex: 1, width: '100%', overflow: 'hidden' },
  
  // Form Styles
  formContainer: { padding: 20 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typePill: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  input: { padding: 15, borderRadius: 10, height: 100, textAlignVertical: 'top', borderWidth: 1 },
  
  // Buttons
  primaryButton: { padding: 20, borderRadius: 100, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#FFF', fontWeight: '800' },
  
  controlsContainer: { paddingBottom: 40, alignItems: 'center', paddingTop: 20 },
  captureButtonOuter: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 54, height: 54, borderRadius: 27 },
});

export default ManualReportScreen;