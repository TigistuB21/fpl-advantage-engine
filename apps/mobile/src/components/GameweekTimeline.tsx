import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSquadStore } from '../store/useSquadStore';

const GAMEWEEKS = [1, 2, 3, 4, 5];

export const GameweekTimeline: React.FC = () => {
  const { targetGameweek, setTargetGameweek, getTotalProjectedXp } = useSquadStore();

  const totalXp = getTotalProjectedXp();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>📅 Gameweek Horizon</Text>
        <View style={styles.gwBadge}>
          <Text style={styles.gwBadgeText}>GW{targetGameweek}: {totalXp.toFixed(1)} xP</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {GAMEWEEKS.map((gw) => {
          const isActive = targetGameweek === gw;

          return (
            <TouchableOpacity
              key={gw}
              style={[styles.gwPill, isActive && styles.activeGwPill]}
              onPress={() => setTargetGameweek(gw)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gwText, isActive && styles.activeGwText]}>GW {gw}</Text>
              {isActive && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gwBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gwBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    gap: 8,
    alignItems: 'center',
  },
  gwPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    minWidth: 64,
  },
  activeGwPill: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.04 }],
  },
  gwText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  activeGwText: {
    color: '#ffffff',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
    marginTop: 2,
  },
});
