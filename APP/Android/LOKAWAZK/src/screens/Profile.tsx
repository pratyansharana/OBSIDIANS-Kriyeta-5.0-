import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Firebase/FirebaseConfig';

const ProfileScreen = () => {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'pothole_reports'));

      let total = 0;
      let pending = 0;
      let resolved = 0;

      snapshot.forEach(doc => {
        const data = doc.data();

        total++;

        if (data.status === 'Resolved') {
          resolved++;
        } else {
          pending++;
        }
      });

      setStats({ total, pending, resolved });
    } catch (err) {
      console.log('Profile Firestore Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Logout not connected yet.');
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: '#888', marginTop: 10 }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>

      {/* Header */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>OP</Text>
        </View>

        <Text style={styles.name}>Operator</Text>
        <Text style={styles.email}>field_staff@lokawazk.app</Text>
      </View>

      {/* Stats (DYNAMIC) */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.resolved}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>App Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 15,
  },

  loader: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#151515',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  email: {
    color: '#888',
    marginTop: 4,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#151515',
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#888',
    marginTop: 5,
    fontSize: 12,
  },

  menu: {
    backgroundColor: '#151515',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },

  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },

  menuText: {
    color: '#fff',
    fontSize: 15,
  },

  logoutBtn: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});