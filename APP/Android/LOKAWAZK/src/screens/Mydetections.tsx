import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, 
  Image, SafeAreaView, ActivityIndicator, Dimensions 
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import * as SQLite from 'expo-sqlite';
import { auth, db } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { doc } from 'firebase/firestore';


const { width } = Dimensions.get('window');
const localDb = SQLite.openDatabaseSync('pothole_queue.db');

const MyDetections = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'synced' | 'offline'>('synced');
  const [syncedReports, setSyncedReports] = useState<any[]>([]);
  const [offlineReports, setOfflineReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Firebase Listener
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




  // 🔥 Offline Fetch
  const fetchOfflineData = async () => {
    try {
      const rows = await localDb.getAllAsync('SELECT * FROM upload_queue ORDER BY id DESC');
      setOfflineReports(rows);
    } catch (e) {
      console.log("SQLite Busy");
    }
  };

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
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (isSynced) {
            navigation.navigate('ReportDetail', { reportId: item.id });
          }
        }}
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          
          <Image 
            source={{ uri: isSynced ? item.imageUrl : item.localUri }} 
            style={styles.cardImage} 
          />

          <View style={styles.cardContent}>
            <Text style={[styles.status, { color: isSynced ? theme.primary : '#F59E0B' }]}>
              {isSynced ? item.status?.toUpperCase() || 'SYNCED' : 'OFFLINE'}
            </Text>

            <Text style={[styles.coords, { color: theme.textPrimary }]}>
              {lat?.toFixed(5)}, {lng?.toFixed(5)}
            </Text>

            <Text style={[styles.time, { color: theme.textSecondary }]}>
              {displayDate}
            </Text>
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          My Detections
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Track all potholes detected by your system — synced & offline queue
        </Text>
      </View>


      {/* TABS */}
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

      {/* LIST */}
      {loading && activeTab === 'synced' ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'synced' ? syncedReports : offlineReports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                NO DATA FOUND
              </Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
};

export default MyDetections;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    marginTop: 40, // ✅ top margin fix
    marginBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
  },

  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },

  tabText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
  },

  cardImage: {
    width: 110,
    height: 110,
  },

  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },

  status: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },

  coords: {
    fontSize: 13,
    fontWeight: '700',
  },

  time: {
    fontSize: 11,
    marginTop: 6,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },

  emptyText: {
    fontSize: 12,
    fontWeight: '800',
  },
});