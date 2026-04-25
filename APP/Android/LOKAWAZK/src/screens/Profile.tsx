import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const { theme } = useAppTheme();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);

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
      let creditsEarned = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        total++;

        if (data.status === 'Resolved') {
          resolved++;
          creditsEarned++; // 🪙 1 credit per legit report
        } else {
          pending++;
        }
      });

      setStats({ total, pending, resolved });
      setCredits(creditsEarned);
    } catch (err) {
      console.log('Profile Firestore Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADER */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Profile
        </Text>

        {/* PROFILE CARD */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {auth.currentUser?.displayName?.[0] || 'O'}
            </Text>
          </View>

          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {auth.currentUser?.displayName || 'Operator'}
          </Text>

          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {auth.currentUser?.email}
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <Stat label="Reports" value={stats.total} theme={theme} />
          <Stat label="Resolved" value={stats.resolved} theme={theme} />
          <Stat label="Pending" value={stats.pending} theme={theme} />
        </View>

        {/* 🪙 CREDITS CARD */}
        <TouchableOpacity
          style={[styles.creditsCard, { backgroundColor: theme.surface }]}
          onPress={() =>
            Alert.alert(
              'FASTag Wallet',
              'You earn credits for legit reports.\n\nSoon you can withdraw them to your FASTag wallet.'
            )
          }
        >
          <View style={styles.row}>
            <View style={[styles.coin, { backgroundColor: theme.primary }]}>
              <Text style={{ fontSize: 20 }}>🪙</Text>
            </View>

            <View style={{ marginLeft: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Credits
              </Text>
              <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800' }}>
                {credits}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        

        {/* MENU */}
        <View style={[styles.menu, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="list"
            text="My Reports"
            onPress={() => navigation.navigate('Mydetections' as never)}
            theme={theme}
          />

          <MenuItem
            icon="settings"
            text="Settings"
            onPress={() => Alert.alert('Coming soon')}
            theme={theme}
          />
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logout, { backgroundColor: '#FF3B30' }]}
          onPress={handleLogout}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

/* ---------- COMPONENTS ---------- */

const Stat = ({ label, value, theme }: any) => (
  <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
    <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>
      {value}
    </Text>
    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
      {label}
    </Text>
  </View>
);

const MenuItem = ({ icon, text, onPress, theme }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <Text style={{ marginLeft: 10, color: theme.textPrimary }}>
        {text}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
  </TouchableOpacity>
);

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    margin: 30,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },

  email: {
    fontSize: 12,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    margin: 20,
  },

  statBox: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },

  creditsCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  coin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  graphCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  graphRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  barWrapper: {
    width: 10,
    height: 60,
    justifyContent: 'flex-end',
  },

  bar: {
    width: 10,
    borderRadius: 4,
  },

  menu: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },

  menuItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logout: {
    margin: 20,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});