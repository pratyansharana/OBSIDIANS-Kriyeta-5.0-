import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';

const ReportDetailScreen = () => {
  const { theme } = useAppTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();

  // Extract the reportId from navigation parameters
  const { reportId } = route.params;

  // Local State Management
  const [report, setReport] = useState<any>(null);
  const [workerDetails, setWorkerDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeWorker: any;

    const fetchReport = async () => {
      try {
        const docRef = doc(db, 'pothole_reports', reportId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setReport(data);

          // Listen for Worker Details if assigned to a field staff member
          if (data.assigned_to) {
            const workerRef = doc(db, 'field_staff', data.assigned_to);

            unsubscribeWorker = onSnapshot(workerRef, (snap) => {
              if (snap.exists()) {
                setWorkerDetails(snap.data());
              }
            });
          }
        }
      } catch (e) {
        console.error("Error fetching report details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeWorker) unsubscribeWorker();
    };
  }, [reportId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return '#22c55e'; // Green
      case 'Manual_Review_Required': return '#f59e0b'; // Amber
      case 'Rejected': return '#6b7280'; // Gray
      default: return '#ef4444'; // Red
    }
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textPrimary }}>Report not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* 1. HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 26, color: theme.textPrimary }}>{'\u2190'}</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Report Insight
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* 2. FIELD STAFF SECTION */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Field Staff Tracking
      </Text>
      
      <View style={[styles.card, { backgroundColor: theme.surface, borderLeftWidth: 4, borderLeftColor: theme.primary }]}>
        {workerDetails ? (
          <View>
            <View style={styles.rowBetween}>
              <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 16 }}>
                {workerDetails.name || 'Assigned Worker'}
              </Text>
              <View style={[styles.activeIndicator, { backgroundColor: workerDetails.isOnline ? '#22c55e' : '#6b7280' }]} />
            </View>
            
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }}>
              Current Status: {workerDetails.status || 'On Duty'}
            </Text>

            <View style={styles.locationInfo}>
               <Text style={{ color: theme.primary, fontSize: 18 }}>{'\u2316'}</Text> 
               <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>
                 Coords: {workerDetails.location?.latitude?.toFixed(4)}, {workerDetails.location?.longitude?.toFixed(4)}
               </Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center' }}>
            {'\u23F3'} Waiting for staff assignment...
          </Text>
        )}
      </View>

      {/* 3. IMAGE EVIDENCE */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 25 }]}>
        Detection Evidence
      </Text>
      <Image source={{ uri: report.imageUrl }} style={styles.image} />

      {report.completionImage && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Completion Evidence
          </Text>
          <Image source={{ uri: report.completionImage }} style={styles.image} />
        </>
      )}

      {/* 4. STATUS & UPVOTES */}
      <View style={[styles.rowBetween, { marginTop: 10, marginBottom: 15 }]}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(report.status) },
          ]}
        >
          <Text style={styles.statusText}>{report.status}</Text>
        </View>

        <View style={styles.upvoteBox}>
          <Text style={{ fontSize: 18, color: theme.primary }}>{'\uD83D\uDC4D'}</Text>
          <Text style={{ color: theme.textPrimary, marginLeft: 8, fontWeight: '800', fontSize: 16 }}>
            {report.upvotes || 0}
          </Text>
        </View>
      </View>

      {/* 5. REPORT DETAILS */}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Detail label="Reported Via" value={report.reportedVia} theme={theme} />
        <Detail label="Pothole Latitude" value={report.location?.lat?.toFixed(6)} theme={theme} />
        <Detail label="Pothole Longitude" value={report.location?.lng?.toFixed(6)} theme={theme} />
      </View>

      {/* 6. AI AUDIT INSIGHTS */}
      {report.ai_audit_notes && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginLeft: 0, marginBottom: 8 }]}>
             AI Audit Insight {'\u2728'}
          </Text>
          <Text style={[styles.auditText, { color: theme.textSecondary }]}>
            {report.ai_audit_notes}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const Detail = ({ label, value, theme }: any) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
    </Text>
    <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 15, marginTop: 2 }}>
      {value || 'Not Available'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 20,
    alignItems: 'center'
  },
  backBtn: { padding: 5 },
  title: { fontSize: 22, fontWeight: '900' },
  
  image: { 
    width: '92%', 
    height: 240, 
    borderRadius: 24, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  
  sectionTitle: { 
    marginLeft: 22, 
    marginBottom: 8, 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 1.2 
  },
  
  card: { 
    marginHorizontal: 20, 
    padding: 20, 
    borderRadius: 22, 
    marginTop: 8, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  activeIndicator: { width: 12, height: 12, borderRadius: 6 },
  locationInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },

  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25, marginLeft: 22 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  upvoteBox: { flexDirection: 'row', alignItems: 'center', marginRight: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  auditText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});

export default ReportDetailScreen;