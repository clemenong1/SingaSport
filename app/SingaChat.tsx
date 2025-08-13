import React, { useState, useRef } from 'react';
import * as Location from 'expo-location';
import type { ListRenderItemInfo } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db } from '../src/services/FirebaseConfig';
import { collection, getDocs, query, orderBy, limit as fbLimit } from 'firebase/firestore';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function SingaChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am Singa, your personal assistant. Ask me anything about basketball courts, recent reports, or recommendations!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    })();
  }, []);

  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // TODO: Fetch recent court reports/distances from Firebase for context
    const context = await getCourtContext();

    const systemPrompt = `You are Singa, an AI assistant for basketball players in Singapore. You have access to recent court reports and distances. 

CRITICAL RULES:
1. ONLY recommend courts that are listed in the context as "Available suitable courts"
2. NEVER recommend courts with broken equipment, slippery conditions, or other safety issues
3. If a user asks for a "nice court" or "good court", only suggest courts with high suitability scores
4. If no suitable courts are available, explain that all nearby courts have reported issues

If the user asks for recommendations, use the following context:\n${context}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...[...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
          ],
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error connecting to the AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real court data and recent reports from Firebase
  async function getCourtContext() {
    if (!userLocation) return 'User location not available.';
    try {
      const courtsSnapshot = await getDocs(collection(db, 'basketballCourts'));
      const courts = courtsSnapshot.docs.map(doc => {
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
        return {
          id: doc.id,
          name: data.name || 'Unknown Court',
          latitude,
          longitude,
          address: data.address || '',
        };
      });
      // Calculate distance for each court
      const courtsWithDistance = courts.map(court => ({
        ...court,
        distance: calculateDistanceKm(userLocation.latitude, userLocation.longitude, court.latitude, court.longitude)
      }));
      // Sort by distance and take 10 nearest for better filtering
      const nearestCourts = courtsWithDistance
        .filter(c => c.latitude && c.longitude)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      // For each court, fetch up to 3 most recent reports and analyze suitability
      const courtAnalyses = await Promise.all(nearestCourts.map(async (court) => {
        const reportsRef = collection(db, 'basketballCourts', court.id, 'reports');
        const reportsQuery = query(reportsRef, orderBy('reportedAt', 'desc'), fbLimit(3));
        const reportsSnapshot = await getDocs(reportsQuery);
        const reports = reportsSnapshot.docs.map(doc => doc.data());
        
        // Analyze court suitability based on reports
        let isSuitable = true;
        let suitabilityScore = 100; // Start with perfect score
        let reportSummary = '';
        let issues: string[] = [];
        
        if (reports.length === 0) {
          reportSummary = 'No recent reports - court appears to be in good condition.';
        } else {
          // Check each report for problems that would make court unsuitable
          reports.forEach((report, idx) => {
            const description = (report.description || '').toLowerCase();
            const status = (report.status || '').toLowerCase();
            
            // Check for major issues that make court unsuitable
            if (description.includes('broken') || description.includes('damaged') || 
                description.includes('slippery') || description.includes('wet') ||
                description.includes('closed') || status.includes('closed') ||
                description.includes('unusable') || description.includes('dangerous') ||
                description.includes('maintenance') || description.includes('construction')) {
              isSuitable = false;
              issues.push(`Report ${idx + 1}: ${report.description || 'No description'}`);
            }
            
            // Check for minor issues that reduce suitability score
            if (description.includes('crowded') || description.includes('busy')) {
              suitabilityScore -= 20;
            }
            if (description.includes('dirty') || description.includes('trash')) {
              suitabilityScore -= 15;
            }
            if (description.includes('poor lighting')) {
              suitabilityScore -= 10;
            }
            
            // Add to summary
            if (idx === 0) {
              reportSummary = `Recent: ${report.description ? report.description.substring(0, 80) : 'No description'}`;
            }
          });
        }
        
        return {
          ...court,
          isSuitable,
          suitabilityScore: Math.max(0, suitabilityScore),
          reportSummary,
          issues,
          hasIssues: issues.length > 0
        };
      }));

      // Filter to only suitable courts and sort by suitability score (then distance)
      const suitableCourts = courtAnalyses
        .filter(court => court.isSuitable)
        .sort((a, b) => {
          // First sort by suitability score (higher is better)
          if (b.suitabilityScore !== a.suitabilityScore) {
            return b.suitabilityScore - a.suitabilityScore;
          }
          // Then by distance (closer is better)
          return a.distance - b.distance;
        })
        .slice(0, 5); // Take top 5 suitable courts

      if (suitableCourts.length === 0) {
        return 'No suitable courts found nearby. All nearby courts have reported issues that make them unsuitable for play. Please check back later or consider traveling to courts further away.';
      }

      // Create context string for AI
      const courtSummaries = suitableCourts.map(court => {
        let summary = `${court.name} (${court.distance.toFixed(2)}km away)`;
        if (court.suitabilityScore < 100) {
          summary += ` - Suitability: ${court.suitabilityScore}%`;
        }
        summary += `: ${court.reportSummary}`;
        return summary;
      });

      return `Available suitable courts:\n${courtSummaries.join('\n')}\n\nIMPORTANT: Only recommend these courts as they have been verified as suitable for play. Do NOT recommend courts with broken equipment, slippery conditions, or other safety issues. If a user asks for a "nice court", prioritize courts with higher suitability scores.`;
    } catch (err) {
      return 'Could not fetch court data.';
    }
  }

  const renderItem = ({ item }: ListRenderItemInfo<{ role: string; content: string }>) => (
    <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.aiMessage]}>
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/main')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Ionicons name="chatbubble-ellipses" size={24} color="#007BFF" style={{ marginRight: 8, marginLeft: 4 }} />
          <Text style={styles.headerTitle}> Find a court that best suits you! </Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(_, idx) => idx.toString()}
          style={styles.chatArea}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Singa anything..."
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  chatArea: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3f2fd',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    height: 56,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007BFF',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
}); 