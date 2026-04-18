import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, 
  Image, SafeAreaView, ActivityIndicator, Dimensions 
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import * as SQLite from 'expo-sqlite';
import { auth, db } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const localDb = SQLite.openDatabaseSync('pothole_queue.db');

const MyDetections = () => {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'synced' | 'offline'>('synced');
  const [syncedReports, setSyncedReports] = useState<any[]>([]);
  const [offlineReports, setOfflineReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Firebase Listener (Logic unchanged)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'pothole_reports'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSyncedReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Optimized Offline Fetch (Logic preserved, switched to Async to prevent NPE)
  const fetchOfflineData = async () => {
    try {
      // Switched to getAllAsync to handle DB locks gracefully
      const rows = await localDb.getAllAsync('SELECT * FROM upload_queue ORDER BY id DESC');
      setOfflineReports(rows);
    } catch (e) {
      console.log("SQLite Fetch Busy - Retrying on next focus");
    }
  };

  // Refresh offline data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOfflineData();
    }, [])
  );

  const renderReportItem = ({ item }: any) => {
    const isSynced = activeTab === 'synced';
    
    const displayDate = isSynced && item.timestamp?.seconds 
      ? new Date(item.timestamp.seconds * 1000).toLocaleString() 
      : item.timestamp || "Date Unknown";

    const lat = isSynced ? item.location?.lat : item.latitude;
    const lng = isSynced ? item.location?.lng : item.longitude;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image 
          source={{ uri: isSynced ? item.imageUrl : item.localUri }} 
          style={styles.cardImage} 
        />
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={[styles.cardTitle, { color: isSynced ? theme.primary : '#F59E0B' }]}>
              {isSynced ? `✅ ${item.status?.toUpperCase() || 'SYNCED'}` : '📵 PENDING SYNC'}
            </Text>
          </View>
          
          <Text style={[styles.cardSub, { color: theme.textPrimary }]}>
            LAT: {lat?.toFixed(5) || '0.000'}
          </Text>
          <Text style={[styles.cardSub, { color: theme.textPrimary }]}>
            LNG: {lng?.toFixed(5) || '0.000'}
          </Text>
          
          <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
            {displayDate}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'synced' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('synced')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'synced' ? '#FFF' : theme.textSecondary }]}>
            SYNCED ({syncedReports.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'offline' && { backgroundColor: theme.primary }]}
          onPress={() => {
            setActiveTab('offline');
            fetchOfflineData();
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'offline' ? '#FFF' : theme.textSecondary }]}>
            OFFLINE ({offlineReports.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && activeTab === 'synced' ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>LINKING TO CLOUD...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'synced' ? syncedReports : offlineReports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                NO {activeTab.toUpperCase()} DETECTIONS LOGGED
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 3,
  },
  cardImage: { width: 110, height: 110 },
  cardContent: { flex: 1, padding: 15, justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardSub: { fontSize: 13, fontWeight: '800', fontFamily: 'monospace' },
  cardTime: { fontSize: 10, marginTop: 6, fontWeight: '600' },
  emptyText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});

export default MyDetections;