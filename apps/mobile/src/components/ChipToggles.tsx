import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSquadStore, ActiveChipType } from '../store/useSquadStore';

interface ChipOption {
  id: ActiveChipType;
  label: string;
  name: string;
  color: string;
}

const CHIP_OPTIONS: ChipOption[] = [
  { id: 'TC', label: 'TC', name: 'Triple Captain', color: '#f59e0b' },
  { id: 'BB', label: 'BB', name: 'Bench Boost', color: '#10b981' },
  { id: 'FH', label: 'FH', name: 'Free Hit', color: '#38bdf8' },
  { id: 'WC', label: 'WC', name: 'Wildcard', color: '#a855f7' },
];

export const ChipToggles: React.FC = () => {
  const { activeChip, setActiveChip, getTotalProjectedXp, chipOptimization } = useSquadStore();

  const totalXp = getTotalProjectedXp();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>🎯 Select Active Chip Strategy</Text>
        <View style={styles.xpPill}>
          <Text style={styles.xpPillText}>Total {totalXp.toFixed(1)} xP</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        {CHIP_OPTIONS.map((chip) => {
          const isActive = activeChip === chip.id;

          const scenarioKeyMap: Record<string, string> = {
            TC: 'Triple Captain',
            BB: 'Bench Boost',
            FH: 'Free Hit',
            WC: 'Free Hit',
          };

          const scenario = chipOptimization?.chips.find(
            (c) => c.chip_name === scenarioKeyMap[chip.id]
          );

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
              onPress={() => setActiveChip(chip.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipLabel, isActive && styles.activeChipText]}>
                {chip.label}
              </Text>
              <Text style={[styles.chipName, isActive && styles.activeChipText]}>
                {chip.name}
              </Text>

              {scenario && scenario.xp_delta > 0 && !isActive && (
                <View style={styles.deltaBadge}>
                  <Text style={styles.deltaText}>+{scenario.xp_delta.toFixed(1)}</Text>
                </View>
              )}

              {isActive && (
                <View style={styles.activeIndicator}>
                  <Text style={styles.activeIndicatorText}>ACTIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chip Impact Explanation Banner */}
      {activeChip !== 'NONE' && (
        <View style={styles.impactBanner}>
          <Text style={styles.impactTitle}>
            ⚡ {activeChip === 'TC' && 'Triple Captain Activated (Captain xP × 3)'}
            {activeChip === 'BB' && 'Bench Boost Activated (+100% Bench xP Included)'}
            {activeChip === 'FH' && 'Free Hit Activated (Unlimited GW Transfers)'}
            {activeChip === 'WC' && 'Wildcard Activated (Permanent Squad Overhaul)'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  xpPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  xpPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  chipButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  chipLabel: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '900',
  },
  chipName: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  activeChipText: {
    color: '#000000',
  },
  deltaBadge: {
    marginTop: 4,
    backgroundColor: '#eab308',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  deltaText: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: '900',
  },
  activeIndicator: {
    marginTop: 4,
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeIndicatorText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  impactBanner: {
    marginTop: 10,
    backgroundColor: '#1e1b4b',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  impactTitle: {
    color: '#c7d2fe',
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
  },
});
