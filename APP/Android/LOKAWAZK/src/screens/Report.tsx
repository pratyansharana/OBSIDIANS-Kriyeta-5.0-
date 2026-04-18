import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const ReportScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detection Reports</Text>
      <Text style={styles.text}>Review validated road hazard logs.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  text: { color: '#888', textAlign: 'center' }
});

export default ReportScreen;