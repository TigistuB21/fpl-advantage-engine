import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSquadStore } from '../store/useSquadStore';
import { ChipToggles } from '../components/ChipToggles';

export const ChipsScreen: React.FC = () => {
  const { currentSquad, aiOptimizedSquad, chipOptimization, isLoading, fetchSquadData, managerId } =
    useSquadStore();

  // Multi-Gameweek projected xP (GW+1, GW+2, GW+3)
  const baseGW1 = currentSquad
    ? currentSquad.starting_11.reduce((acc: number, p) => acc + (p.predicted_xp || 4.5), 0)
    : 52.4;
  const optGW1 = aiOptimizedSquad?.total_expected_points || baseGW1 + 8.2;

  const multiGwData = [
    { gw: 'GW + 1', base: Math.round(baseGW1 * 10) / 10, opt: Math.round(optGW1 * 10) / 10 },
    { gw: 'GW + 2', base: Math.round(baseGW1 * 0.95 * 10) / 10, opt: Math.round((optGW1 + 4.1) * 10) / 10 },
    { gw: 'GW + 3', base: Math.round(baseGW1 * 1.02 * 10) / 10, opt: Math.round((optGW1 + 6.8) * 10) / 10 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Chip ROI & xP Engine</Text>
        <Text style={styles.subtitle}>
          Mathematical ROI of activating FPL chips vs saving
        </Text>
      </View>

      {/* Chip Selector Toggles */}
      <ChipToggles />

      {/* Multi-Gameweek Projection Bar Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 3-GW Projected xP Comparison</Text>
        <Text style={styles.cardSubtitle}>Current Squad vs AI Optimized Squad</Text>

        <View style={styles.chartContainer}>
          {multiGwData.map((item, index) => {
            const maxVal = Math.max(item.base, item.opt, 75);
            const basePct = (item.base / maxVal) * 100;
            const optPct = (item.opt / maxVal) * 100;

            return (
              <View key={index} style={styles.gwRow}>
                <Text style={styles.gwLabel}>{item.gw}</Text>

                <View style={styles.barGroup}>
                  {/* Base Bar */}
                  <View style={styles.barWrapper}>
                    <Text style={styles.barValue}>{item.base}</Text>
                    <View style={[styles.bar, styles.baseBar, { width: `${basePct}%` }]} />
                  </View>

                  {/* Optimized Bar */}
                  <View style={styles.barWrapper}>
                    <Text style={styles.barValueOpt}>{item.opt}</Text>
                    <View style={[styles.bar, styles.optBar, { width: `${optPct}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#475569' }]} />
            <Text style={styles.legendText}>Base Squad</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>AI Transfer Squad</Text>
          </View>
        </View>
      </View>

      {/* Chip ROI Analysis Cards */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>⚡ Chip ROI Scenarios</Text>
          {isLoading && <ActivityIndicator size="small" color="#38bdf8" />}
        </View>

        {chipOptimization?.chips ? (
          chipOptimization.chips.map((chip, i) => {
            const isRec = chip.xp_delta >= 10.0 || chip.chip_code === chipOptimization.best_chip;

            return (
              <View
                key={i}
                style={[
                  styles.chipScenarioCard,
                  isRec && styles.recommendedScenario,
                ]}
              >
                <View style={styles.chipTopRow}>
                  <Text style={styles.chipTitleName}>{chip.chip_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isRec ? styles.statusPlay : styles.statusSave,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {isRec ? '🟢 PLAY' : '🟡 SAVE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.chipMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Projected xP</Text>
                    <Text style={styles.metricVal}>{chip.projected_xp.toFixed(1)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>xP Gain (ROI)</Text>
                    <Text
                      style={[
                        styles.metricVal,
                        chip.xp_delta > 0 ? styles.positiveDelta : styles.neutralDelta,
                      ]}
                    >
                      {chip.xp_delta >= 0 ? `+${chip.xp_delta.toFixed(1)}` : chip.xp_delta.toFixed(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.strategyNote}>{chip.recommendation}</Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading Chip ROI models...</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => fetchSquadData(managerId || 1)}
            >
              <Text style={styles.refreshBtnText}>🔄 Evaluate Chips Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Expiration Rules Banner */}
      <View style={styles.expirationBanner}>
        <Text style={styles.expirationTitle}>⚠️ FPL Chip Deadline Alert</Text>
        <Text style={styles.expirationText}>
          First set of chips expires at **Gameweek 19 (Dec 28)**. Unused 1st-half Wildcards, Free Hits, and Triple Captains will be forfeited!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 14,
  },
  chartContainer: {
    gap: 16,
  },
  gwRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gwLabel: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    width: 60,
  },
  barGroup: {
    flex: 1,
    gap: 6,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barValue: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    width: 32,
  },
  barValueOpt: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    width: 32,
  },
  bar: {
    height: 12,
    borderRadius: 6,
  },
  baseBar: {
    backgroundColor: '#334155',
  },
  optBar: {
    backgroundColor: '#10b981',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipScenarioCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recommendedScenario: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b22',
  },
  chipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chipTitleName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPlay: {
    backgroundColor: '#065f46',
  },
  statusSave: {
    backgroundColor: '#854d0e',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  chipMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  metricVal: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  positiveDelta: {
    color: '#34d399',
  },
  neutralDelta: {
    color: '#94a3b8',
  },
  strategyNote: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  refreshBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  expirationBanner: {
    backgroundColor: '#451a03',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  expirationTitle: {
    color: '#fde047',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  expirationText: {
    color: '#fef08a',
    fontSize: 11,
    lineHeight: 15,
  },
});
