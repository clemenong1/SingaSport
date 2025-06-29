import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { auth } from '../../src/services/FirebaseConfig';
import { gameService } from '../../src/services/gameService';
import { GameSchedule } from '../../src/types';
import CreateGameModal from '../../src/components/CreateGameModal';

interface GameCardProps {
  game: GameSchedule;
  currentUserId: string;
  onRSVP: (gameId: string, isJoining: boolean) => void;
  isLoading: boolean;
}

const GameCard = ({ game, currentUserId, onRSVP, isLoading }: GameCardProps) => {
  const isUserRSVPd = game.rsvpUsers?.includes(currentUserId) || false;
  const isGameFull = game.maxPlayers ? game.peopleAttending >= game.maxPlayers : false;
  const isGameCreator = game.createdBy === currentUserId;

  const formatDateTime = (date: Date): string => {
    const today = new Date();
    const gameDate = new Date(date);
    
    // Check if game is today
    const isToday = gameDate.toDateString() === today.toDateString();
    
    // Check if game is tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = gameDate.toDateString() === tomorrow.toDateString();
    
    const timeString = gameDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeString}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeString}`;
    } else {
      const dateString = gameDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `${dateString} at ${timeString}`;
    }
  };

  const getGameTypeColor = (gameType?: string): string => {
    switch (gameType) {
      case 'tournament': return '#FF6B35';
      case 'practice': return '#4ECDC4';
      case 'casual': return '#45B7D1';
      default: return '#96CEB4'; // pickup
    }
  };

  const getSkillLevelDisplay = (skillLevel?: string): string => {
    if (!skillLevel) return 'All Levels';
    return skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);
  };

  const handleRSVP = () => {
    if (isLoading || !game.id) return;
    
    if (!isUserRSVPd && isGameFull) {
      Alert.alert('Game Full', 'This game has reached maximum capacity.');
      return;
    }

    const action = isUserRSVPd ? 'leave' : 'join';
    const message = isUserRSVPd 
      ? 'Are you sure you want to leave this game?'
      : 'Would you like to join this game?';

    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Game`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: isUserRSVPd ? 'destructive' : 'default',
          onPress: () => onRSVP(game.id!, !isUserRSVPd),
        },
      ]
    );
  };

  return (
    <View style={styles.gameCard}>
      {/* Header with game type and time */}
      <View style={styles.gameHeader}>
        <View style={[styles.gameTypeBadge, { backgroundColor: getGameTypeColor(game.gameType) }]}>
          <Text style={styles.gameTypeText}>
            {game.gameType ? game.gameType.charAt(0).toUpperCase() + game.gameType.slice(1) : 'Pickup'}
          </Text>
        </View>
        <Text style={styles.gameTime}>{formatDateTime(game.scheduledTime)}</Text>
      </View>

      {/* Court information */}
      <View style={styles.courtInfo}>
        <View style={styles.courtMainInfo}>
          <Text style={styles.courtName}>{game.courtName}</Text>
          <Text style={styles.courtAddress} numberOfLines={2}>
            {game.address}
          </Text>
        </View>
        <Ionicons name="basketball-outline" size={32} color="#d32f2f" />
      </View>

      {/* Game details */}
      <View style={styles.gameDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {game.peopleAttending}{game.maxPlayers ? `/${game.maxPlayers}` : ''} players
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="trophy-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{getSkillLevelDisplay(game.skillLevel)}</Text>
        </View>
        {isGameCreator && (
          <View style={styles.detailItem}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={[styles.detailText, styles.creatorText]}>Creator</Text>
          </View>
        )}
      </View>

      {/* Description if available */}
      {game.description && (
        <Text style={styles.gameDescription} numberOfLines={2}>
          {game.description}
        </Text>
      )}

      {/* RSVP Button */}
      <TouchableOpacity
        style={[
          styles.rsvpButton,
          isUserRSVPd ? styles.rsvpButtonJoined : null,
          (isGameFull && !isUserRSVPd) ? styles.rsvpButtonDisabled : null,
          isLoading ? styles.rsvpButtonLoading : null,
        ]}
        onPress={handleRSVP}
        disabled={isLoading || Boolean(!isUserRSVPd && isGameFull)}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={isUserRSVPd ? "checkmark-circle" : "add-circle-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.rsvpButtonText}>
              {isUserRSVPd ? 'Joined' : isGameFull ? 'Full' : 'Join'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default function ContributeTab() {
  const [games, setGames] = useState<GameSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGames, setFilteredGames] = useState<GameSchedule[]>([]);

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'joined' | 'created'>('all');

  useEffect(() => {
    loadGames();
    
    // Set up real-time listener
    const unsubscribe = gameService.subscribeToGameSchedules((updatedGames) => {
      setGames(updatedGames);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter games based on search and filter type
  useEffect(() => {
    let filtered = games;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (game) =>
          game.courtName.toLowerCase().includes(query) ||
          game.address.toLowerCase().includes(query) ||
          game.gameType?.toLowerCase().includes(query) ||
          game.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (auth.currentUser && filterType !== 'all') {
      const userId = auth.currentUser.uid;
      if (filterType === 'joined') {
        filtered = filtered.filter((game) => game.rsvpUsers?.includes(userId) || false);
      } else if (filterType === 'created') {
        filtered = filtered.filter((game) => game.createdBy === userId);
      }
    }

    setFilteredGames(filtered);
  }, [games, searchQuery, filterType]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refreshGames();
      }
    }, [loading])
  );

  const loadGames = async () => {
    try {
      setLoading(true);
      const upcomingGames = await gameService.getUpcomingGameSchedules();
      setGames(upcomingGames);
    } catch (error) {
      console.error('Error loading games:', error);
      Alert.alert('Error', 'Failed to load games. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshGames = async () => {
    try {
      setRefreshing(true);
      const upcomingGames = await gameService.getUpcomingGameSchedules();
      setGames(upcomingGames);
    } catch (error) {
      console.error('Error refreshing games:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRSVP = async (gameId: string, isJoining: boolean) => {
    if (!auth.currentUser) return;

    try {
      setRsvpLoading(gameId);
      await gameService.toggleRSVP(gameId, auth.currentUser.uid, isJoining);
      
      // Update local state immediately for better UX
      setGames((prevGames) =>
        prevGames.map((game) => {
          if (game.id === gameId) {
            const updatedRsvpUsers = isJoining
              ? [...(game.rsvpUsers || []), auth.currentUser!.uid]
              : (game.rsvpUsers || []).filter((uid) => uid !== auth.currentUser!.uid);
            
            return {
              ...game,
              peopleAttending: game.peopleAttending + (isJoining ? 1 : -1),
              rsvpUsers: updatedRsvpUsers,
            };
          }
          return game;
        })
      );
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      Alert.alert('Error', error.message || 'Failed to update RSVP');
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleGameCreated = (newGame: GameSchedule) => {
    // Don't manually add the game since the real-time listener will handle it
    // This prevents duplicate entries
    console.log('✅ Game created successfully:', newGame.id);
  };

  const renderGameCard = ({ item }: { item: GameSchedule }) => (
    <GameCard
      game={item}
      currentUserId={auth.currentUser?.uid || ''}
      onRSVP={handleRSVP}
      isLoading={rsvpLoading === item.id}
    />
  );

  const renderFilterButton = (type: 'all' | 'joined' | 'created', label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filterType === type && styles.filterButtonActive]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[styles.filterButtonText, filterType === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    let message = 'No games found';
    let subMessage = 'Be the first to schedule a game!';

    if (filterType === 'joined') {
      message = 'No joined games';
      subMessage = 'Join some games to see them here';
    } else if (filterType === 'created') {
      message = 'No created games';
      subMessage = 'Create your first game to get started';
    } else if (searchQuery.trim()) {
      message = 'No matching games';
      subMessage = 'Try adjusting your search terms';
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="basketball-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>{message}</Text>
        <Text style={styles.emptyStateSubtitle}>{subMessage}</Text>
        {(filterType === 'all' || filterType === 'created') && !searchQuery.trim() && (
          <TouchableOpacity
            style={styles.createFirstGameButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createFirstGameButtonText}>Create Game</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d32f2f" />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with search and create button */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search games..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All Games')}
        {renderFilterButton('joined', 'Joined')}
        {renderFilterButton('created', 'Created')}
      </View>

      {/* Games list */}
      <FlatList
        data={filteredGames}
        renderItem={renderGameCard}
        keyExtractor={(item, index) => item.id || `game-${index}`}
        contentContainerStyle={[
          styles.gamesList,
          filteredGames.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGames}
            colors={['#d32f2f']}
            tintColor="#d32f2f"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Game Modal */}
      <CreateGameModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGameCreated={handleGameCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  createButton: {
    backgroundColor: '#d32f2f',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#d32f2f',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  gamesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gameTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courtMainInfo: {
    flex: 1,
  },
  courtName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  courtAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  gameDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  creatorText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  gameDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    borderRadius: 12,
  },
  rsvpButtonJoined: {
    backgroundColor: '#4CAF50',
  },
  rsvpButtonDisabled: {
    backgroundColor: '#ccc',
  },
  rsvpButtonLoading: {
    opacity: 0.7,
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createFirstGameButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstGameButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});