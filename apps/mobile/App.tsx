import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  getTopPredictions,
  getChipOptimization,
  setApiBaseUrl,
  PlayerPrediction,
  ChipOptimizationResponse,
} from '@fpl-engine/shared';
import { SquadScreen } from './src/screens/SquadScreen';
import { ChipsScreen } from './src/screens/ChipsScreen';

// Ensure mobile app connects to PC's Wi-Fi IP address instead of mobile local device
setApiBaseUrl('http://172.16.131.188:8000');

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'squad'>('squad');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBadge}>NATIVE MOBILE v3.0</Text>
          <Text style={styles.headerTitle}>⚽ FPL Advantage Mobile</Text>
        </View>

        {/* Screen Navigation Tabs */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'squad' && styles.activeNavTab]}
            onPress={() => setActiveTab('squad')}
          >
            <Text style={[styles.navTabText, activeTab === 'squad' && styles.activeNavTabText]}>
              ⚽ 2D Pitch & Squad
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'overview' && styles.activeNavTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.navTabText, activeTab === 'overview' && styles.activeNavTabText]}>
              🎯 Chips & xP
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'squad' ? <SquadScreen /> : <ChipsScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    marginBottom: 12,
  },
  headerBadge: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  navTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeNavTab: {
    backgroundColor: '#10b981',
  },
  navTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  activeNavTabText: {
    color: '#000000',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  playerMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  xpBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  xpText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
  },
  chipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topChipBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topChipText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  chipName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  chipNote: {
    fontSize: 10,
    color: '#94a3b8',
  },
  chipMetrics: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  chipXp: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  chipDelta: {
    fontSize: 11,
    fontWeight: '700',
  },
});
