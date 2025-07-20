import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/FirebaseConfig';
import { gameService } from '../services/gameService';
import { userService } from '../utils/userService';
import { GameSchedule, BasketballCourtExtended } from '../types';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onGameCreated: (game: GameSchedule) => void;
  selectedCourt?: BasketballCourtExtended | null;
}

export default function CreateGameModal({
  visible,
  onClose,
  onGameCreated,
  selectedCourt,
}: CreateGameModalProps) {
  const [courts, setCourts] = useState<BasketballCourtExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourts, setLoadingCourts] = useState(true);

  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [selectedCourtName, setSelectedCourtName] = useState<string>('');
  const [courtSearchQuery, setCourtSearchQuery] = useState<string>('');
  const [showCourtSelector, setShowCourtSelector] = useState(false);
  const [gameDate, setGameDate] = useState(new Date());
  const [gameTime, setGameTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [gameType, setGameType] = useState('pickup');
  const [showGameTypeSelector, setShowGameTypeSelector] = useState(false);
  const [skillLevel, setSkillLevel] = useState('all');
  const [showSkillLevelSelector, setShowSkillLevelSelector] = useState(false);
  const [description, setDescription] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadCourts();

      if (selectedCourt) {
        setSelectedCourtId(selectedCourt.place_id);
        setSelectedCourtName(selectedCourt.name);

        setGameDate(new Date());
        setGameTime(new Date());
        setMaxPlayers('10');
        setGameType('pickup');
        setSkillLevel('all');
        setDescription('');
      } else {
        resetForm();
      }
    }
  }, [visible, selectedCourt]);

  const loadCourts = async () => {
    try {
      setLoadingCourts(true);
      const courtsRef = collection(db, 'basketballCourts');
      const q = query(courtsRef, orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);

      const courtsData: BasketballCourtExtended[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        let latitude = 0;
        let longitude = 0;

        if (data.location) {
          if (data.location.latitude && data.location.longitude) {
            latitude = data.location.latitude;
            longitude = data.location.longitude;
          } else if (data.location._lat && data.location._long) {
            latitude = data.location._lat;
            longitude = data.location._long;
          }
        }

        courtsData.push({
          place_id: doc.id, // Use document ID as place_id (this is how it's stored)
          name: data.name || 'Unknown Court',
          latitude: latitude,
          longitude: longitude,
          address: data.address || 'Address not available',
          rating: data.rating,
          userRatingsTotal: data.userRatingsTotal,
          peopleNumber: data.peopleNumber || 0,
          geohash: data.geohash,
          openingHours: data.openingHours,
        } as BasketballCourtExtended);
      });

      setCourts(courtsData);
    } catch (error) {
      console.error('Error loading courts:', error);
      Alert.alert('Error', 'Failed to load courts');
    } finally {
      setLoadingCourts(false);
    }
  };

  const resetForm = () => {
    setSelectedCourtId('');
    setSelectedCourtName('');
    setCourtSearchQuery('');
    setShowCourtSelector(false);
    setGameDate(new Date());
    setGameTime(new Date());
    setMaxPlayers('10');
    setGameType('pickup');
    setShowGameTypeSelector(false);
    setSkillLevel('all');
    setShowSkillLevelSelector(false);
    setDescription('');
  };

  const validateForm = (): boolean => {
    console.log('🎮 Validating form...');
    
    if (!auth.currentUser) {
      console.error('🚨 No authenticated user found');
      Alert.alert('Error', 'You must be logged in to create a game');
      return false;
    }

    if (!selectedCourtId || selectedCourtId === '') {
      console.error('🚨 No court selected');
      Alert.alert('Error', 'Please select a basketball court');
      return false;
    }

    const scheduledDateTime = new Date(
      gameDate.getFullYear(),
      gameDate.getMonth(),
      gameDate.getDate(),
      gameTime.getHours(),
      gameTime.getMinutes()
    );

    const now = new Date();
    console.log('🎮 Scheduled time:', scheduledDateTime.toISOString());
    console.log('🎮 Current time:', now.toISOString());

    if (scheduledDateTime <= now) {
      console.error('🚨 Game time is not in the future');
      Alert.alert('Error', 'Game time must be in the future');
      return false;
    }

    const maxPlayersNum = parseInt(maxPlayers);
    console.log('🎮 Max players:', maxPlayersNum);
    
    if (isNaN(maxPlayersNum) || maxPlayersNum < 2 || maxPlayersNum > 20) {
      console.error('🚨 Invalid max players value');
      Alert.alert('Error', 'Maximum players must be between 2 and 20');
      return false;
    }

    console.log('🎮 Form validation passed');
    return true;
  };

  const handleCreateGame = async () => {
    if (!validateForm() || !auth.currentUser || loading) return;

    setLoading(true);
    try {
      console.log('🎮 Starting game creation...');
      console.log('🎮 Current user:', auth.currentUser.uid);
      console.log('🎮 Selected court ID:', selectedCourtId);
      
      const selectedCourtData = courts.find(court => court.place_id === selectedCourtId);
      if (!selectedCourtData) {
        console.error('🚨 Selected court not found in courts array');
        console.log('🎮 Available courts:', courts.map(c => ({ id: c.place_id, name: c.name })));
        throw new Error('Selected court not found');
      }

      console.log('🎮 Selected court data:', selectedCourtData);

      const scheduledDateTime = new Date(
        gameDate.getFullYear(),
        gameDate.getMonth(),
        gameDate.getDate(),
        gameTime.getHours(),
        gameTime.getMinutes()
      );

      console.log('🎮 Scheduled date/time:', scheduledDateTime.toISOString());

      const gameData: Omit<GameSchedule, 'id' | 'createdAt'> = {
        basketballCourt: selectedCourtId,
        courtName: selectedCourtData.name,
        address: selectedCourtData.address || 'Address not available',
        scheduledTime: scheduledDateTime,
        peopleAttending: 1, // Creator automatically joins
        createdBy: auth.currentUser.uid,
        rsvpUsers: [auth.currentUser.uid], // Creator automatically RSVP'd
        maxPlayers: parseInt(maxPlayers),
        gameType,
        ...(skillLevel !== 'all' && { skillLevel }), // Only include if not 'all'
        ...(description.trim() && { description: description.trim() }), // Only include if not empty
      };

      console.log('🎮 Game data to create:', gameData);

      const gameId = await gameService.createGameSchedule(gameData);
      console.log('🎮 Game created with ID:', gameId);

      // Award points for creating a game
      try {
        await userService.awardPointsForGameCreation(auth.currentUser.uid);
        console.log('🎮 Points awarded for game creation');
      } catch (pointsError) {
        console.error('🚨 Error awarding points for game creation:', pointsError);
        // Don't fail the game creation if points awarding fails
      }

      const createdGame: GameSchedule = {
        ...gameData,
        id: gameId,
        createdAt: new Date(),
      };

      onGameCreated(createdGame);
      resetForm();
      onClose();

      Alert.alert('Success', 'Game scheduled successfully! +10 points earned!');
    } catch (error: any) {
      console.error('🚨 Error creating game:', error);
      console.error('🚨 Full error object:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      Alert.alert('Error', error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const { type } = event;
    if (type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      setGameDate(selectedDate);
    }
    
    // Only close for Android after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const { type } = event;
    if (type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setGameTime(selectedTime);
    }
    
    // Only close for Android after selection
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCourtSelect = (court: BasketballCourtExtended) => {
    setSelectedCourtId(court.place_id);
    setSelectedCourtName(court.name);
    setCourtSearchQuery(court.name);
    setShowCourtSelector(false);
  };

  const filteredCourts = courts.filter(court =>
    court.name.toLowerCase().includes(courtSearchQuery.toLowerCase()) ||
    (court.address && court.address.toLowerCase().includes(courtSearchQuery.toLowerCase()))
  );

  const gameTypes = [
    { label: 'Pickup Game', value: 'pickup' },
    { label: 'Tournament', value: 'tournament' },
    { label: 'Practice', value: 'practice' },
    { label: 'Casual', value: 'casual' },
  ];

  const skillLevels = [
    { label: 'All Levels', value: 'all' },
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
  ];

  const getGameTypeLabel = (value: string) => gameTypes.find(gt => gt.value === value)?.label || 'Pickup Game';
  const getSkillLevelLabel = (value: string) => skillLevels.find(sl => sl.value === value)?.label || 'All Levels';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Game</Text>
          <TouchableOpacity
            onPress={handleCreateGame}
            disabled={loading}
            style={[styles.createButton, loading && styles.createButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Court Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basketball Court</Text>
            {loadingCourts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#d32f2f" />
                <Text style={styles.loadingText}>Loading courts...</Text>
              </View>
            ) : (
              <View style={styles.courtSelectorContainer}>
                <TouchableOpacity
                  style={styles.courtSearchInput}
                  onPress={() => setShowCourtSelector(true)}
                >
                  <Ionicons name="search-outline" size={20} color="#666" />
                  <Text style={[
                    styles.courtSearchText,
                    !selectedCourtName && styles.courtSearchPlaceholder
                  ]}>
                    {selectedCourtName || 'Search and select a court...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {showCourtSelector && (
                  <View style={styles.courtSelectorModal}>
                    <View style={styles.courtSelectorHeader}>
                      <View style={styles.searchInputContainer}>
                        <TextInput
                          style={styles.courtSearchField}
                          value={courtSearchQuery}
                          onChangeText={setCourtSearchQuery}
                          placeholder="Type to search courts..."
                          placeholderTextColor="#999"
                          autoFocus
                        />
                        {courtSearchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setCourtSearchQuery('')}
                            style={styles.clearSearchButton}
                          >
                            <Ionicons name="close-circle" size={18} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowCourtSelector(false)}
                        style={styles.courtSelectorClose}
                      >
                        <Ionicons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView 
                      style={styles.courtList} 
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                    >
                      {filteredCourts.length > 0 ? (
                        filteredCourts.map((court) => (
                          <TouchableOpacity
                            key={court.place_id}
                            style={[
                              styles.courtItem,
                              selectedCourtId === court.place_id && styles.courtItemSelected
                            ]}
                            onPress={() => handleCourtSelect(court)}
                          >
                            <View style={styles.courtItemContent}>
                              <Text style={styles.courtItemName}>{court.name}</Text>
                              {court.address && (
                                <Text style={styles.courtItemAddress}>{court.address}</Text>
                              )}
                              {court.rating && (
                                <View style={styles.courtItemRating}>
                                  <Ionicons name="star" size={14} color="#FFD700" />
                                  <Text style={styles.courtItemRatingText}>
                                    {court.rating.toFixed(1)} ({court.userRatingsTotal || 0} reviews)
                                  </Text>
                                </View>
                              )}
                            </View>
                            {selectedCourtId === court.place_id && (
                              <Ionicons name="checkmark-circle" size={20} color="#d32f2f" />
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.noResultsContainer}>
                          <Ionicons name="search-outline" size={48} color="#ccc" />
                          <Text style={styles.noResultsText}>No courts found</Text>
                          <Text style={styles.noResultsSubtext}>
                            Try adjusting your search terms
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Date and Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateTimeButton}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateTimeText}>{formatDate(gameDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={styles.dateTimeButton}
            >
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateTimeText}>{formatTime(gameTime)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={gameDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={gameTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}
            
            {/* Done button for iOS to manually close time picker */}
            {showTimePicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Game Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Settings</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Maximum Players</Text>
              <TextInput
                style={styles.numberInput}
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="number-pad"
                placeholder="10"
                maxLength={2}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Game Type</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowGameTypeSelector(!showGameTypeSelector)}
              >
                <Text style={styles.customPickerText}>{getGameTypeLabel(gameType)}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showGameTypeSelector && (
                <View style={styles.dropdownContainer}>
                  {gameTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.dropdownItem,
                        gameType === type.value && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setGameType(type.value);
                        setShowGameTypeSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        gameType === type.value && styles.dropdownItemTextSelected
                      ]}>
                        {type.label}
                      </Text>
                      {gameType === type.value && (
                        <Ionicons name="checkmark" size={16} color="#d32f2f" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Skill Level</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowSkillLevelSelector(!showSkillLevelSelector)}
              >
                <Text style={styles.customPickerText}>{getSkillLevelLabel(skillLevel)}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {showSkillLevelSelector && (
                <View style={styles.dropdownContainer}>
                  {skillLevels.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.dropdownItem,
                        skillLevel === level.value && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setSkillLevel(level.value);
                        setShowSkillLevelSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        skillLevel === level.value && styles.dropdownItemTextSelected
                      ]}>
                        {level.label}
                      </Text>
                      {skillLevel === level.value && (
                        <Ionicons name="checkmark" size={16} color="#d32f2f" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Add any additional details about the game..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => {
                // Scroll to bottom when description field is focused
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space at bottom to ensure description field is visible
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },

  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  dateTimeText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 100,
  },
  courtSelectorContainer: {
    position: 'relative',
  },
  courtSearchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  courtSearchText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  courtSearchPlaceholder: {
    color: '#999',
  },
  courtSelectorModal: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  courtSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  courtSearchField: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingRight: 32, // Make room for clear button
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtSelectorClose: {
    padding: 8,
  },
  courtList: {
    maxHeight: 250,
  },
  courtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courtItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  courtItemContent: {
    flex: 1,
  },
  courtItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  courtItemAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  courtItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtItemRatingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  customPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  customPickerText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownContainer: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});