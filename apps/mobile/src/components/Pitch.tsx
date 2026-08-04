import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { PlayerPrediction } from '@fpl-engine/shared';
import { PlayerCard } from './PlayerCard';
import { useSquadStore } from '../store/useSquadStore';

interface PitchProps {
  starters: PlayerPrediction[];
  bench: PlayerPrediction[];
  captainId?: number;
  viceCaptainId?: number;
  transferredInIds?: number[];
  transferredOutIds?: number[];
  onPlayerPress?: (player: PlayerPrediction) => void;
}

export const Pitch: React.FC<PitchProps> = ({
  starters,
  bench,
  captainId,
  viceCaptainId,
  transferredInIds = [],
  transferredOutIds = [],
  onPlayerPress,
}) => {
  const {
    selectedPlayerId,
    setSelectedPlayerId,
    swapPlayers,
    setCustomCaptainId,
    setCustomViceCaptainId,
  } = useSquadStore();

  const gkpList = starters.filter((p) => p.element_type === 'GKP');
  const defList = starters.filter((p) => p.element_type === 'DEF');
  const midList = starters.filter((p) => p.element_type === 'MID');
  const fwdList = starters.filter((p) => p.element_type === 'FWD');

  const formationStr = `${defList.length}-${midList.length}-${fwdList.length}`;

  const selectedPlayer =
    starters.find((p) => p.player_id === selectedPlayerId) ||
    bench.find((p) => p.player_id === selectedPlayerId);

  const isSelectedStarter = starters.some((p) => p.player_id === selectedPlayerId);

  const handleCardTap = (player: PlayerPrediction) => {
    if (onPlayerPress) {
      onPlayerPress(player);
    }

    if (selectedPlayerId === null) {
      // Tap 1: Select Player A
      setSelectedPlayerId(player.player_id);
    } else if (selectedPlayerId === player.player_id) {
      // Tap 2 on same player: Unselect
      setSelectedPlayerId(null);
    } else {
      // Tap 2 on different player: Execute Swap
      const success = swapPlayers(selectedPlayerId, player.player_id);
      if (!success) {
        setSelectedPlayerId(null);
      }
    }
  };

  const handleCardLongPress = (player: PlayerPrediction, isStarter: boolean) => {
    if (isStarter) {
      setCustomCaptainId(player.player_id);
    }
  };

  const handleMakeCaptain = () => {
    if (selectedPlayerId && isSelectedStarter) {
      setCustomCaptainId(selectedPlayerId);
      setSelectedPlayerId(null);
    }
  };

  const handleMakeViceCaptain = () => {
    if (selectedPlayerId && isSelectedStarter) {
      setCustomViceCaptainId(selectedPlayerId);
      setSelectedPlayerId(null);
    }
  };

  const renderRow = (players: PlayerPrediction[], keyPrefix: string) => (
    <View key={keyPrefix} style={styles.pitchRow}>
      {players.map((player) => (
        <PlayerCard
          key={player.player_id}
          player={player}
          compact={players.length >= 5}
          isSelected={selectedPlayerId === player.player_id}
          isCaptain={player.player_id === captainId}
          isViceCaptain={player.player_id === viceCaptainId}
          isTransferredIn={transferredInIds.includes(player.player_id)}
          isTransferredOut={transferredOutIds.includes(player.player_id)}
          onPress={() => handleCardTap(player)}
          onLongPress={() => handleCardLongPress(player, true)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 2D Green Tactical Pitch */}
      <View style={styles.pitchField}>
        {/* Formation Header Badge Overlay */}
        <View style={styles.formationBadge}>
          <Text style={styles.formationText}>FORMATION {formationStr}</Text>
        </View>

        {/* Selected Player Action Sub-Bar */}
        {selectedPlayer ? (
          <View style={styles.actionSubBar}>
            <Text style={styles.selectedPlayerName}>
              {selectedPlayer.web_name} ({selectedPlayer.element_type})
            </Text>
            <View style={styles.actionBtnRow}>
              {isSelectedStarter && (
                <>
                  <TouchableOpacity style={styles.captainActionBtn} onPress={handleMakeCaptain}>
                    <Text style={styles.captainActionText}>👑 (C)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viceActionBtn} onPress={handleMakeViceCaptain}>
                    <Text style={styles.viceActionText}>🛡️ (V)</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={() => setSelectedPlayerId(null)}
              >
                <Text style={styles.cancelActionText}>✖</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>
              💡 Tap player to swap/assign (C)/(V) • Long-press starter for Captain
            </Text>
          </View>
        )}

        {/* Center Field Markings */}
        <View style={styles.halfwayLine} />
        <View style={styles.centerCircle} />

        {/* Pitch Lines - Position Rows */}
        <View style={styles.pitchRowsContainer}>
          {renderRow(gkpList, 'gkp')}
          {renderRow(defList, 'def')}
          {renderRow(midList, 'mid')}
          {renderRow(fwdList, 'fwd')}
        </View>
      </View>

      {/* Substitute Bench Container */}
      <View style={styles.benchContainer}>
        <View style={styles.benchHeader}>
          <Text style={styles.benchTitle}>🪑 SUBSTITUTES (BENCH)</Text>
          <Text style={styles.benchSubtext}>4 Players</Text>
        </View>
        <View style={styles.benchRow}>
          {bench.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              isBench
              compact={bench.length >= 5}
              isSelected={selectedPlayerId === player.player_id}
              isCaptain={player.player_id === captainId}
              isViceCaptain={player.player_id === viceCaptainId}
              isTransferredIn={transferredInIds.includes(player.player_id)}
              isTransferredOut={transferredOutIds.includes(player.player_id)}
              onPress={() => handleCardTap(player)}
              onLongPress={() => handleCardLongPress(player, false)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  pitchField: {
    backgroundColor: '#064e3b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#059669',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 390,
  },
  formationBadge: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 20,
  },
  formationText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  instructionBanner: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 20,
  },
  instructionText: {
    color: '#cbd5e1',
    fontSize: 8.5,
    fontWeight: '700',
  },
  actionSubBar: {
    position: 'absolute',
    top: 28,
    left: 8,
    right: 8,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPlayerName: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  captainActionBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  captainActionText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  viceActionBtn: {
    backgroundColor: '#94a3b8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viceActionText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  cancelActionBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelActionText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  halfwayLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ translateX: -45 }, { translateY: -45 }],
  },
  pitchRowsContainer: {
    flex: 1,
    justifyContent: 'space-around',
    zIndex: 10,
    marginTop: 40,
  },
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    flexWrap: 'nowrap',
  },
  benchContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  benchTitle: {
    color: '#cbd5e1',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  benchSubtext: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '600',
  },
  benchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
