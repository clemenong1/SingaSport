import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/FirebaseConfig';
import { gameService } from '../services/gameService';
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
  const [gameDate, setGameDate] = useState(new Date());
  const [gameTime, setGameTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [gameType, setGameType] = useState('pickup');
  const [skillLevel, setSkillLevel] = useState('all');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      loadCourts();

      if (selectedCourt) {
        setSelectedCourtId(selectedCourt.place_id);

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
    setGameDate(new Date());
    setGameTime(new Date());
    setMaxPlayers('10');
    setGameType('pickup');
    setSkillLevel('all');
    setDescription('');
  };

  const validateForm = (): boolean => {
    if (!selectedCourtId || selectedCourtId === '') {
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

    if (scheduledDateTime <= new Date()) {
      Alert.alert('Error', 'Game time must be in the future');
      return false;
    }

    const maxPlayersNum = parseInt(maxPlayers);
    if (isNaN(maxPlayersNum) || maxPlayersNum < 2 || maxPlayersNum > 20) {
      Alert.alert('Error', 'Maximum players must be between 2 and 20');
      return false;
    }

    return true;
  };

  const handleCreateGame = async () => {
    if (!validateForm() || !auth.currentUser || loading) return;

    setLoading(true);
    try {
      const selectedCourtData = courts.find(court => court.place_id === selectedCourtId);
      if (!selectedCourtData) {
        throw new Error('Selected court not found');
      }

      const scheduledDateTime = new Date(
        gameDate.getFullYear(),
        gameDate.getMonth(),
        gameDate.getDate(),
        gameTime.getHours(),
        gameTime.getMinutes()
      );

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
        skillLevel: skillLevel === 'all' ? undefined : skillLevel,
        description: description.trim() || undefined,
      };

      const gameId = await gameService.createGameSchedule(gameData);

      const createdGame: GameSchedule = {
        ...gameData,
        id: gameId,
        createdAt: new Date(),
      };

      onGameCreated(createdGame);
      resetForm();
      onClose();

      Alert.alert('Success', 'Game scheduled successfully!');
    } catch (error: any) {
      console.error('Error creating game:', error);
      Alert.alert('Error', error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setGameDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setGameTime(selectedTime);
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Court Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basketball Court</Text>
            {loadingCourts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#d32f2f" />
                <Text style={styles.loadingText}>Loading courts...</Text>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCourtId}
                  onValueChange={setSelectedCourtId}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a court..." value="" />
                  {courts.map((court) => (
                    <Picker.Item
                      key={court.place_id}
                      label={court.name}
                      value={court.place_id}
                    />
                  ))}
                </Picker>
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={gameType}
                  onValueChange={setGameType}
                  style={styles.picker}
                >
                  <Picker.Item label="Pickup Game" value="pickup" />
                  <Picker.Item label="Tournament" value="tournament" />
                  <Picker.Item label="Practice" value="practice" />
                  <Picker.Item label="Casual" value="casual" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Skill Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={skillLevel}
                  onValueChange={setSkillLevel}
                  style={styles.picker}
                >
                  <Picker.Item label="All Levels" value="all" />
                  <Picker.Item label="Beginner" value="beginner" />
                  <Picker.Item label="Intermediate" value="intermediate" />
                  <Picker.Item label="Advanced" value="advanced" />
                </Picker>
              </View>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
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
});