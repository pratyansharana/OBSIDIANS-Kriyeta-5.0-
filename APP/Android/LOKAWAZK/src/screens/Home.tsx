import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, FlatList,
  SafeAreaView, StatusBar, Dimensions, Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '../Firebase/FirebaseConfig';
import { useAppTheme } from '../Context/Themecontext';

const { width } = Dimensions.get('window');

type Category = {
  id: string;
  title: string;
};

const CATEGORIES: Category[] = [
  { id: '1', title: 'Electricity' },
  { id: '2', title: 'Sanitation' },
  { id: '3', title: 'Garbage' },
  { id: '4', title: 'Roads' },
  { id: '5', title: 'My detections' },
  { id: '6', title: 'Other' },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { theme, themeName, toggleTheme } = useAppTheme();

  const [selectedCategory, setSelectedCategory] = useState('My detections');
  const [totalPotholes, setTotalPotholes] = useState(0);

  // 🔥 Optimized Firestore fetch
  useEffect(() => {
    const fetchCount = async () => {
      const snapshot = await getCountFromServer(collection(db, 'pothole_reports'));
      setTotalPotholes(snapshot.data().count);
    };
    fetchCount();
  }, []);

  // 🧠 Memoized greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  }, []);

  // ⚡ Handlers
  const handleDashcam = useCallback(() => {
    navigation.navigate('Dashcam' as never);
  }, []);

  const handleCategoryPress = useCallback((title: string) => {
    setSelectedCategory(title);
    if (title === 'My detections') {
      navigation.navigate('Mydetections' as never);
    }
  }, []);

  // 🧩 Render Item
  const renderItem = useCallback(({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item.title;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: isSelected ? theme.primary : 'transparent',
            transform: [{ scale: pressed ? 0.96 : 1 }]
          }
        ]}
        onPress={() => handleCategoryPress(item.title)}
      >
        <Text style={[styles.cardText, { color: theme.textPrimary }]}>
          {item.title}
        </Text>

        {item.title === 'My detections' && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{totalPotholes}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [selectedCategory, theme, totalPotholes]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.status as any} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.smallText, { color: theme.textSecondary }]}>
            Good {greeting}
          </Text>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {auth.currentUser?.displayName || 'Operator'}
          </Text>
        </View>

        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
          <Text style={{ fontSize: 18 }}>
            {themeName === 'light' ? '🌙' : '☀️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
          Total Reports
        </Text>
        <Text style={[styles.statsValue, { color: theme.textPrimary }]}>
          {totalPotholes}
        </Text>
      </View>

      {/* DASHCAM CTA */}
      <Pressable
        onPress={handleDashcam}
        style={({ pressed }) => [
          styles.actionCard,
          {
            backgroundColor: theme.primary,
            transform: [{ scale: pressed ? 0.97 : 1 }]
          }
        ]}
      >
        <Text style={styles.actionTitle}>Start Dashcam</Text>
        <Text style={styles.actionSubtitle}>
          Real-time pothole detection
        </Text>
      </Pressable>

      {/* GRID */}
      <FlatList
        data={CATEGORIES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },

  smallText: { fontSize: 14 },
  name: { fontSize: 26, fontWeight: '800' },

  themeBtn: {
    padding: 10,
    borderRadius: 50,
  },

  statsCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  statsLabel: { fontSize: 13 },
  statsValue: { fontSize: 32, fontWeight: '900' },

  actionCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  actionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  actionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },

  listContent: {
    paddingHorizontal: 20,
  },

  card: {
    width: (width - 60) / 2,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
  },

  cardText: {
    fontSize: 14,
    fontWeight: '600',
  },

  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});