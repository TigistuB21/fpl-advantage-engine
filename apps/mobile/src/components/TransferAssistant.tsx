import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSquadStore } from '../store/useSquadStore';
import { PlayerPrediction } from '@fpl-engine/shared';

export const TransferAssistant: React.FC = () => {
  const {
    bank,
    freeTransfers,
    transferSuggestions,
    aiOptimizedSquad,
    fetchTransferSuggestions,
    applyPlannedTransfer,
  } = useSquadStore();

  const [loading, setLoading] = useState<boolean>(false);
  const [appliedIndices, setAppliedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (!transferSuggestions && !aiOptimizedSquad) {
      setLoading(true);
      fetchTransferSuggestions().finally(() => setLoading(false));
    }
  }, []);

  const transfersToRender =
    transferSuggestions?.transfers || aiOptimizedSquad?.transfers || [];

  const netXpGain =
    transferSuggestions?.net_xp_gain || aiOptimizedSquad?.net_xp_gain || 0.0;

  const handleApply = (
    index: number,
    playerOut: PlayerPrediction,
    playerIn: PlayerPrediction
  ) => {
    const costOutM = (playerOut.now_cost || 50) / 10.0;
    const costInM = (playerIn.now_cost || 50) / 10.0;
    const priceDiff = Math.round((costInM - costOutM) * 10) / 10;

    applyPlannedTransfer(playerOut.player_id, playerIn, priceDiff);
    setAppliedIndices((prev) => [...prev, index]);
  };

  return (
    <View style={styles.container}>
      {/* Assistant Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🤖 AI Transfer Assistant</Text>
          <Text style={styles.subtext}>
            Bank: £{bank.toFixed(1)}m • Free Transfers: {freeTransfers}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setLoading(true);
            fetchTransferSuggestions().finally(() => setLoading(false));
          }}
        >
          <Text style={styles.refreshBtnText}>🔄 Recalculate</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.loadingText}>Evaluating DB Transfer Alternatives...</Text>
        </View>
      ) : transfersToRender.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            ✅ Current Squad is already optimal for Gameweek 1! No urgent transfers required.
          </Text>
        </View>
      ) : (
        <View style={styles.transferList}>
          {transfersToRender.map((t, idx) => {
            const isApplied = appliedIndices.includes(idx);
            const pOut = t.transferred_out;
            const pIn = t.transferred_in;

            const costOutM = ((pOut.now_cost || 50) / 10.0).toFixed(1);
            const costInM = ((pIn.now_cost || 50) / 10.0).toFixed(1);
            const deltaXp = (pIn.predicted_xp || 0) - (pOut.predicted_xp || 0);

            return (
              <View key={idx} style={[styles.transferCard, isApplied && styles.appliedCard]}>
                <View style={styles.cardMainRow}>
                  {/* Left: Player OUT */}
                  <View style={styles.playerSide}>
                    <View style={styles.outBadge}>
                      <Text style={styles.outBadgeText}>🔴 OUT</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.playerNameOut}>
                      {pOut.web_name}
                    </Text>
                    <Text style={styles.playerMeta}>
                      {pOut.team_short} • £{costOutM}m • {pOut.predicted_xp?.toFixed(1)} xP
                    </Text>
                  </View>

                  {/* Center: Delta Badge */}
                  <View style={styles.centerCol}>
                    <Text style={styles.arrowIcon}>➔</Text>
                    <View style={styles.deltaPill}>
                      <Text style={styles.deltaPillText}>
                        {deltaXp >= 0 ? `+${deltaXp.toFixed(1)}` : deltaXp.toFixed(1)} xP
                      </Text>
                    </View>
                  </View>

                  {/* Right: Player IN */}
                  <View style={styles.playerSideRight}>
                    <View style={styles.inBadge}>
                      <Text style={styles.inBadgeText}>🟢 IN</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.playerNameIn}>
                      {pIn.web_name}
                    </Text>
                    <Text style={styles.playerMeta}>
                      {pIn.team_short} • £{costInM}m • {pIn.predicted_xp?.toFixed(1)} xP
                    </Text>
                  </View>
                </View>

                {/* Bottom Action Row */}
                <TouchableOpacity
                  style={[styles.applyBtn, isApplied && styles.appliedBtn]}
                  disabled={isApplied}
                  onPress={() => handleApply(idx, pOut, pIn)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyBtnText}>
                    {isApplied ? '✅ APPLIED TO PITCH' : '⚡ Apply Transfer to Pitch'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={styles.summaryBar}>
            <Text style={styles.summaryLabel}>Total Net Expected Gain:</Text>
            <Text style={styles.summaryValue}>+{netXpGain.toFixed(1)} xP</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  subtext: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
  },
  emptyContainer: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
  },
  emptyText: {
    color: '#34d399',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
  },
  transferList: {
    gap: 10,
  },
  transferCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  appliedCard: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  playerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  outBadge: {
    backgroundColor: '#4c0519',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  outBadgeText: {
    color: '#fca5a5',
    fontSize: 8.5,
    fontWeight: '900',
  },
  inBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  inBadgeText: {
    color: '#6ee7b7',
    fontSize: 8.5,
    fontWeight: '900',
  },
  playerNameOut: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
  },
  playerNameIn: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '800',
  },
  playerMeta: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 2,
  },
  centerCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrowIcon: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '900',
  },
  deltaPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 4,
  },
  deltaPillText: {
    color: '#34d399',
    fontSize: 9.5,
    fontWeight: '900',
  },
  applyBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  appliedBtn: {
    backgroundColor: '#334155',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
  },
});
