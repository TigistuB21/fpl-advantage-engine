import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { PlayerPrediction } from '@fpl-engine/shared';
import { useSquadStore } from '../store/useSquadStore';

interface PlayerCardProps {
  player: PlayerPrediction;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isBench?: boolean;
  isSelected?: boolean;
  isTransferredIn?: boolean;
  isTransferredOut?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCaptain,
  isViceCaptain,
  isBench,
  isSelected,
  isTransferredIn,
  isTransferredOut,
  compact,
  onPress,
  onLongPress,
}) => {
  const { targetGameweek } = useSquadStore();

  const fixtures = player.upcoming_fixtures?.[targetGameweek] || [];
  const isBlank = fixtures.length === 0 && player.upcoming_fixtures != null;
  const isDgw = fixtures.length >= 2;

  // Calculate target Gameweek xP
  let targetXp = player.predicted_xp || 0.0;
  if (fixtures.length > 0) {
    targetXp = fixtures.reduce((acc, f) => acc + (f.xp || 0), 0);
  } else if (isBlank) {
    targetXp = 0.0;
  }

  // Fixture Opponent Subtext
  let fixtureText = `${player.team_short} • ${player.element_type}`;
  if (isBlank) {
    fixtureText = 'BLANK GW';
  } else if (isDgw) {
    fixtureText = `${fixtures[0].opponent}(${fixtures[0].is_home ? 'H' : 'A'}) + ${fixtures[1].opponent}(${fixtures[1].is_home ? 'H' : 'A'})`;
  } else if (fixtures.length === 1) {
    fixtureText = `${fixtures[0].opponent} (${fixtures[0].is_home ? 'H' : 'A'})`;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.card,
        compact && styles.compactCard,
        isBench && styles.benchCard,
        isSelected && styles.selectedCard,
        isDgw && styles.dgwCard,
        isBlank && styles.bgwCard,
        isTransferredIn && styles.transferredInCard,
        isTransferredOut && styles.transferredOutCard,
      ]}
    >
      {/* Captain / Vice Captain Badge */}
      {isCaptain && (
        <View style={styles.captainBadge}>
          <Text style={styles.captainText}>C</Text>
        </View>
      )}
      {isViceCaptain && (
        <View style={styles.viceCaptainBadge}>
          <Text style={styles.captainText}>V</Text>
        </View>
      )}

      {/* DGW Badge */}
      {isDgw && (
        <View style={styles.dgwBadge}>
          <Text style={styles.dgwBadgeText}>DGW</Text>
        </View>
      )}

      {/* BGW Badge */}
      {isBlank && (
        <View style={styles.bgwBadge}>
          <Text style={styles.bgwBadgeText}>BLANK</Text>
        </View>
      )}

      {/* Transfer In / Out Badge Indicator */}
      {isTransferredIn && (
        <View style={styles.transferInTag}>
          <Text style={styles.transferTagText}>IN</Text>
        </View>
      )}
      {isTransferredOut && (
        <View style={styles.transferOutTag}>
          <Text style={styles.transferTagText}>OUT</Text>
        </View>
      )}

      {/* Selection Glow Indicator */}
      {isSelected && (
        <View style={styles.swapTag}>
          <Text style={styles.swapTagText}>SWAP</Text>
        </View>
      )}

      {/* Shirt / Role Icon Container */}
      <View style={styles.shirtIconContainer}>
        <Text style={[styles.shirtEmoji, compact && styles.compactShirtEmoji, isBlank && styles.bgwEmoji]}>
          {player.element_type === 'GKP' ? '🧤' : '👕'}
        </Text>
      </View>

      {/* Player Name */}
      <Text
        numberOfLines={1}
        style={[
          styles.nameText,
          compact && styles.compactNameText,
          isBlank && styles.bgwNameText,
          isTransferredOut && styles.nameStrikeThrough,
        ]}
      >
        {player.web_name}
      </Text>

      {/* Team Short / Fixture Opponent */}
      <Text numberOfLines={1} style={[styles.teamPosText, compact && styles.compactTeamPosText, isBlank && styles.bgwText]}>
        {fixtureText}
      </Text>

      {/* Predicted xP Badge Pill */}
      <View style={[styles.xpPill, isDgw && styles.dgwXpPill, isBlank && styles.bgwXpPill]}>
        <Text style={[styles.xpText, compact && styles.compactXpText, isDgw && styles.dgwXpText, isBlank && styles.bgwXpText]}>
          {targetXp.toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 66,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 2,
    marginVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  compactCard: {
    width: 54,
    paddingVertical: 3,
    paddingHorizontal: 2,
    marginHorizontal: 1,
  },
  benchCard: {
    backgroundColor: '#0f172a',
    borderColor: '#475569',
  },
  selectedCard: {
    borderColor: '#38bdf8',
    borderWidth: 2.5,
    backgroundColor: '#0369a1',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  dgwCard: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    backgroundColor: '#3b2005',
  },
  bgwCard: {
    opacity: 0.55,
    borderColor: '#475569',
    backgroundColor: '#111827',
  },
  transferredInCard: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
    borderWidth: 1.5,
  },
  transferredOutCard: {
    borderColor: '#f43f5e',
    backgroundColor: '#4c0519',
    opacity: 0.8,
  },
  captainBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#f59e0b',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  viceCaptainBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#94a3b8',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  dgwBadge: {
    position: 'absolute',
    top: -6,
    left: -4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  dgwBadgeText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  bgwBadge: {
    position: 'absolute',
    top: -6,
    left: -4,
    backgroundColor: '#475569',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  bgwBadgeText: {
    color: '#f8fafc',
    fontSize: 7.5,
    fontWeight: '900',
  },
  captainText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  swapTag: {
    position: 'absolute',
    top: -6,
    left: -4,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  swapTagText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  transferInTag: {
    position: 'absolute',
    top: -6,
    left: -4,
    backgroundColor: '#10b981',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  transferOutTag: {
    position: 'absolute',
    top: -6,
    left: -4,
    backgroundColor: '#f43f5e',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  transferTagText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  shirtIconContainer: {
    marginBottom: 1,
  },
  shirtEmoji: {
    fontSize: 14,
  },
  compactShirtEmoji: {
    fontSize: 12,
  },
  bgwEmoji: {
    opacity: 0.5,
  },
  nameText: {
    color: '#f8fafc',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  compactNameText: {
    fontSize: 8.5,
  },
  bgwNameText: {
    color: '#94a3b8',
  },
  nameStrikeThrough: {
    textDecorationLine: 'line-through',
    color: '#fca5a5',
  },
  teamPosText: {
    color: '#94a3b8',
    fontSize: 7.5,
    fontWeight: '600',
    marginTop: 1,
    marginBottom: 2,
    textAlign: 'center',
  },
  compactTeamPosText: {
    fontSize: 7,
  },
  bgwText: {
    color: '#64748b',
    fontWeight: '700',
  },
  xpPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  dgwXpPill: {
    backgroundColor: '#7c2d12',
    borderColor: '#f59e0b',
  },
  bgwXpPill: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  xpText: {
    color: '#34d399',
    fontSize: 8.5,
    fontWeight: '900',
  },
  compactXpText: {
    fontSize: 7.5,
  },
  dgwXpText: {
    color: '#fbbf24',
  },
  bgwXpText: {
    color: '#64748b',
  },
});
