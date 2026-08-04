import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Pitch } from '../components/Pitch';
import { ChipToggles } from '../components/ChipToggles';
import { TransferAssistant } from '../components/TransferAssistant';
import { GameweekTimeline } from '../components/GameweekTimeline';
import { ChipActionRow } from '../components/ChipActionRow';
import { useSquadStore } from '../store/useSquadStore';
import { PlayerPrediction } from '@fpl-engine/shared';

export const SquadScreen: React.FC = () => {
  const {
    managerId,
    isGuestMode,
    aiTeamOfTheWeek,
    currentSquad,
    aiOptimizedSquad,
    customCaptainId,
    customViceCaptainId,
    isLoading,
    error,
    getTotalProjectedXp,
    fetchSquadData,
    fetchTeamOfTheWeek,
    setManagerId,
  } = useSquadStore();

  const [inputManagerId, setInputManagerId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'current' | 'ai'>('current');

  useEffect(() => {
    if (isGuestMode) {
      if (!aiTeamOfTheWeek && !isLoading) {
        fetchTeamOfTheWeek();
      }
    } else if (managerId && !currentSquad && !isLoading) {
      fetchSquadData(managerId);
    }
  }, [isGuestMode, managerId]);

  const handleSubmitManagerId = () => {
    const num = parseInt(inputManagerId.trim(), 10);
    if (!isNaN(num) && num > 0) {
      setManagerId(num);
    }
  };

  const handleExitGuestMode = () => {
    setManagerId(null);
  };

  // Determine starting 11 & bench for Guest Mode vs Authenticated Mode
  let starting11: PlayerPrediction[] = [];
  let bench: PlayerPrediction[] = [];
  let captainId: number | undefined;
  let viceCaptainId: number | undefined;
  let transferredInIds: number[] = [];
  let transferredOutIds: number[] = [];

  if (isGuestMode) {
    starting11 = aiTeamOfTheWeek?.starting_11 || [];
    bench = aiTeamOfTheWeek?.bench || [];
    captainId = customCaptainId || aiTeamOfTheWeek?.captain_id;
    viceCaptainId = customViceCaptainId || aiTeamOfTheWeek?.vice_captain_id;
  } else {
    starting11 =
      activeMode === 'current'
        ? currentSquad?.starting_11 || []
        : aiOptimizedSquad?.starting_11 || currentSquad?.starting_11 || [];

    bench =
      activeMode === 'current'
        ? currentSquad?.bench || []
        : aiOptimizedSquad?.bench || currentSquad?.bench || [];

    const sortedByXp = [...starting11].sort(
      (a, b) => (b.predicted_xp || 0) - (a.predicted_xp || 0)
    );

    captainId =
      customCaptainId ||
      (activeMode === 'ai' && aiOptimizedSquad?.captain_id
        ? aiOptimizedSquad.captain_id
        : sortedByXp[0]?.player_id);

    viceCaptainId =
      customViceCaptainId ||
      (activeMode === 'ai' && aiOptimizedSquad?.vice_captain_id
        ? aiOptimizedSquad.vice_captain_id
        : sortedByXp[1]?.player_id);

    if (activeMode === 'ai' && aiOptimizedSquad?.transfers) {
      transferredInIds = aiOptimizedSquad.transfers.map((t) => t.transferred_in.player_id);
      transferredOutIds = aiOptimizedSquad.transfers.map((t) => t.transferred_out.player_id);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Banner */}
      <View style={styles.header}>
        {isGuestMode ? (
          <View style={styles.guestHeaderCard}>
            <View style={styles.guestBadgeRow}>
              <Text style={styles.guestBadge}>GUEST MODE</Text>
              <Text style={styles.totwBadge}>
                {aiTeamOfTheWeek ? `${aiTeamOfTheWeek.total_expected_points.toFixed(1)} xP` : 'ML ENGINE'}
              </Text>
            </View>
            <Text style={styles.title}>✨ AI Team of the Week</Text>
            <Text style={styles.subtitle}>
              Unconstrained £100m optimal starting 11 calculated by XGBoost expected points
            </Text>
          </View>
        ) : (
          <View style={styles.managerHeaderCard}>
            <View style={styles.managerTopRow}>
              <Text style={styles.managerTitle}>Manager #{managerId} Squad</Text>
              <TouchableOpacity style={styles.exitGuestBtn} onPress={handleExitGuestMode}>
                <Text style={styles.exitGuestBtnText}>Switch to Guest TOTW</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Tabs for Manager Mode */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeMode === 'current' && styles.activeTab]}
                onPress={() => setActiveMode('current')}
              >
                <Text style={[styles.tabText, activeMode === 'current' && styles.activeTabText]}>
                  ⚽ Current Lineup
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeMode === 'ai' && styles.activeTab]}
                onPress={() => setActiveMode('ai')}
              >
                <Text style={[styles.tabText, activeMode === 'ai' && styles.activeTabText]}>
                  🤖 AI Transfer Squad
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Onboarding Input Banner (Rendered when in Guest Mode) */}
      {isGuestMode && (
        <View style={styles.onboardingCard}>
          <Text style={styles.onboardingTitle}>🚀 See Your Squad's AI Optimization</Text>
          <Text style={styles.onboardingText}>
            Enter your FPL Manager ID below to load your baseline squad and get custom transfer suggestions.
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>ID #</Text>
            <TextInput
              style={styles.input}
              value={inputManagerId}
              onChangeText={setInputManagerId}
              keyboardType="numeric"
              placeholder="e.g. 1"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitManagerId}>
              <Text style={styles.submitBtnText}>Analyze My Squad ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recommended Transfers Summary Banner in Authenticated AI Mode */}
      {!isGuestMode && activeMode === 'ai' && aiOptimizedSquad?.transfers && aiOptimizedSquad.transfers.length > 0 && (
        <View style={styles.transferBanner}>
          <Text style={styles.transferBannerTitle}>
            💡 Recommended Transfers ({aiOptimizedSquad.transfers_made} Transfer{aiOptimizedSquad.transfers_made > 1 ? 's' : ''})
          </Text>

          {aiOptimizedSquad.transfers.map((t, idx) => (
            <View key={idx} style={styles.transferRow}>
              <Text style={styles.outText}>🔴 OUT: {t.transferred_out.web_name}</Text>
              <Text style={styles.arrowText}>➔</Text>
              <Text style={styles.inText}>🟢 IN: {t.transferred_in.web_name}</Text>
            </View>
          ))}

          <View style={styles.gainRow}>
            <Text style={styles.gainLabel}>Net Expected Gain:</Text>
            <Text style={styles.gainValue}>+{aiOptimizedSquad.net_xp_gain.toFixed(1)} xP</Text>
          </View>
        </View>
      )}

      {/* AI Transfer Assistant Component (Rendered only when a Manager ID is loaded) */}
      {!isGuestMode && <TransferAssistant />}

      {/* Interactive Chip Toggles Selector (Rendered only when a Manager ID is loaded) */}
      {!isGuestMode && <ChipToggles />}

      {/* Metrics Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{isGuestMode ? 'Formation' : 'Free Transfers'}</Text>
          <Text style={styles.metricVal}>
            {isGuestMode ? aiTeamOfTheWeek?.formation || '3-4-3' : currentSquad?.free_transfers ?? 1}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{isGuestMode ? 'Squad Cost' : 'Bank (ITB)'}</Text>
          <Text style={styles.metricVal}>
            {isGuestMode
              ? `£${aiTeamOfTheWeek?.total_cost ? (aiTeamOfTheWeek.total_cost / 10).toFixed(1) : '99.5'}m`
              : `£${currentSquad?.bank_m?.toFixed(1) ?? '1.5'}m`}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Projected xP</Text>
          <Text style={styles.metricValOpt}>
            {getTotalProjectedXp().toFixed(1)} xP
          </Text>
        </View>
      </View>

      {/* Loading state during transitions or 2D Pitch View */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            {isGuestMode ? 'Calculating ML Team of the Week...' : 'Loading Manager Squad & AI Optimization...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setManagerId(null)}>
            <Text style={styles.retryBtnText}>Return to Guest Mode</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Gameweek Horizon Timeline Selector */}
          <GameweekTimeline />

          {/* Chip Strategy Action Selector */}
          <ChipActionRow />

          <Pitch
            starters={starting11}
            bench={bench}
            captainId={captainId}
            viceCaptainId={viceCaptainId}
            transferredInIds={transferredInIds}
            transferredOutIds={transferredOutIds}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 10,
  },
  guestHeaderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  guestBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  guestBadge: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  totwBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  managerHeaderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  managerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  managerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  exitGuestBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exitGuestBtnText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  onboardingCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#6366f1',
    marginBottom: 12,
  },
  onboardingTitle: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  onboardingText: {
    color: '#c7d2fe',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputPrefix: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
    width: 80,
    textAlign: 'center',
    fontWeight: '800',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#10b981',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  activeTabText: {
    color: '#ffffff',
  },
  transferBanner: {
    backgroundColor: '#064e3b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 10,
  },
  transferBannerTitle: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  outText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
  },
  arrowText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  inText: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '800',
  },
  gainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.2)',
  },
  gainLabel: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  gainValue: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
  },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  metricValOpt: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 10,
  },
  errorContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
