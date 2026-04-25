import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  SafeAreaView, StatusBar, Pressable, ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { theme, themeName, toggleTheme } = useAppTheme();

  const [totalPotholes, setTotalPotholes] = useState(0);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, 'pothole_reports'));
        setTotalPotholes(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching count:", error);
      }
    };
    fetchCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsCameraStarting(false);
    }, [])
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  }, []);

  const handleDashcam = () => {
    setIsCameraStarting(true);
    setTimeout(() => navigation.navigate('Dashcam' as never), 150);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.status as any} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Good {greeting}
          </Text>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {auth.currentUser?.displayName || 'Pratyansha!'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.avatar, { backgroundColor: theme.surface }]}
        >
          {/* Theme Toggle Icon: Moon or Sun Unicode */}
          <Text style={{ fontSize: 22, color: theme.textPrimary }}>
            {themeName === 'light' ? '\u263D' : '\u2600'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* HERO CARD */}
      <View style={[
        styles.heroCard,
        {
          backgroundColor: theme.surface,
          shadowColor: '#000',
        }
      ]}>
        <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
          Total Reports
        </Text>

        <View style={styles.heroRow}>
          <Text style={[styles.bigNumber, { color: theme.textPrimary }]}>
            {totalPotholes}
          </Text>

          <View style={styles.progressWrapper}>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              78%
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.progressFill, { width: '78%', backgroundColor: theme.primary }]} />
            </View>
          </View>
        </View>
      </View>

      {/* MINI CARDS */}
      <View style={styles.row}>
        <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.miniLabel, { color: theme.textSecondary }]}>
            Detections
          </Text>
          <Text style={[styles.miniValue, { color: theme.textPrimary }]}>
            {totalPotholes}
          </Text>
          <View style={styles.miniBar}>
            <View style={[styles.progressFill, { width: '45%', backgroundColor: theme.primary }]} />
          </View>
        </View>

        <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.miniLabel, { color: theme.textSecondary }]}>
            Accuracy
          </Text>
          <Text style={[styles.miniValue, { color: theme.textPrimary }]}>
            92%
          </Text>
          <View style={styles.miniBar}>
            <View style={[styles.progressFill, { width: '92%', backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>

      {/* DASHCAM BUTTON */}
      <Pressable
        onPress={handleDashcam}
        style={({ pressed }) => [
          styles.dashcam,
          {
            backgroundColor: theme.primary,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          }
        ]}
      >
        {isCameraStarting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {/* Car Unicode Symbol */}
            <Text style={{ fontSize: 30, color: '#FFFFFF' }}>
              {'\uD83D\uDE97'}
            </Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.dashTitle, { color: '#FFFFFF' }]}>
                Start Dashcam
              </Text>
              <Text style={[styles.dashSub, { color: '#FFFFFF', opacity: 0.8 }]}>
                Real-time detection
              </Text>
            </View>
          </>
        )}
      </Pressable>

      {/* ACTIONS */}
      <View style={styles.row}>
        <Pressable
          style={[styles.actionCard, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('ManualReport' as never)}
        >
          {/* Document Unicode Symbol */}
          <Text style={{ fontSize: 24, color: theme.primary }}>
            {'\uD83D\uDCC4'}
          </Text>
          <Text style={[styles.actionText, { color: theme.textPrimary }]}>
            Report Manually
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionCard, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate('Mydetections' as never)}
        >
          {/* Chart Unicode Symbol */}
          <Text style={{ fontSize: 24, color: theme.primary }}>
            {'\uD83D\uDCC8'}
          </Text>
          <Text style={[styles.actionText, { color: theme.textPrimary }]}>
            Reports
          </Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 30,
  },
  greeting: { fontSize: 13 },
  name: { fontSize: 28, fontWeight: '900' },
  avatar: {
    padding: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  cardLabel: { fontSize: 12 },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigNumber: {
    fontSize: 44,
    fontWeight: '900',
  },
  progressWrapper: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressTrack: {
    width: 70,
    height: 6,
    borderRadius: 6,
  },
  progressFill: {
    height: 6,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  miniCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
  },
  miniLabel: { fontSize: 12 },
  miniValue: { fontSize: 20, fontWeight: '800', marginVertical: 6 },
  miniBar: {
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 4,
  },
  dashcam: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 22,
    marginBottom: 18,
  },
  dashTitle: { fontSize: 16, fontWeight: '800' },
  dashSub: { fontSize: 12 },
  actionCard: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  actionText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});