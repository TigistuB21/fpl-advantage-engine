import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSquadStore, ActiveChipType } from '../store/useSquadStore';

interface ChipDef {
  id: ActiveChipType;
  label: string;
  name: string;
  color: string;
}

const CHIPS: ChipDef[] = [
  { id: 'WC', label: 'WC', name: 'Wildcard', color: '#a855f7' },
  { id: 'FH', label: 'FH', name: 'Free Hit', color: '#38bdf8' },
  { id: 'BB', label: 'BB', name: 'Bench Boost', color: '#10b981' },
  { id: 'TC', label: 'TC', name: 'Triple Captain', color: '#f59e0b' },
];

export const ChipActionRow: React.FC = () => {
  const { activeChip, toggleChip, getTotalProjectedXp } = useSquadStore();

  const totalXp = getTotalProjectedXp();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.sectionTitle}>🎯 Chip Strategy Simulator</Text>
        {activeChip !== 'NONE' && (
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{activeChip} ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.chipRow}>
        {CHIPS.map((chip) => {
          const isActive = activeChip === chip.id;

          return (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chipButton,
                isActive && {
                  backgroundColor: chip.color,
                  borderColor: '#ffffff',
                  transform: [{ scale: 1.04 }],
                },
              ]}
              onPress={() => toggleChip(chip.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipLabel, isActive && styles.activeChipText]}>
                {chip.label}
              </Text>
              <Text style={[styles.chipName, isActive && styles.activeChipText]}>
                {chip.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Chip Impact Explanation Pill */}
      {activeChip !== 'NONE' && (
        <View style={styles.impactBanner}>
          <Text style={styles.impactText}>
            {activeChip === 'TC' && '👑 Triple Captain: Captain xP × 3 included in total!'}
            {activeChip === 'BB' && '🪑 Bench Boost: All 15 players included in total!'}
            {activeChip === 'FH' && '⚡ Free Hit: Unconstrained 15-man squad transfers evaluated!'}
            {activeChip === 'WC' && '🃏 Wildcard: Permanent zero-hit 15-man transfer engine active!'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activePill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  chipButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  chipLabel: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '900',
  },
  chipName: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  activeChipText: {
    color: '#000000',
  },
  impactBanner: {
    marginTop: 8,
    backgroundColor: '#1e1b4b',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  impactText: {
    color: '#c7d2fe',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },
});
