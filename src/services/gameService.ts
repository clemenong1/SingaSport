import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  serverTimestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './FirebaseConfig';
import { GameSchedule } from '../types';

export class GameService {
  private static instance: GameService;

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  async createGameSchedule(gameData: Omit<GameSchedule, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('🎮 Creating game with data:', {
        ...gameData,
        scheduledTime: gameData.scheduledTime.toISOString()
      });

      // Remove undefined values to prevent Firestore errors
      const cleanedGameData = Object.fromEntries(
        Object.entries(gameData).filter(([_, value]) => value !== undefined)
      );

      const gameScheduleData = {
        ...cleanedGameData,
        createdAt: serverTimestamp(),
        scheduledTime: Timestamp.fromDate(gameData.scheduledTime),
      };

      console.log('🎮 Processed game data for Firestore (undefined values removed):', {
        ...gameScheduleData,
        scheduledTime: gameScheduleData.scheduledTime.toDate().toISOString(),
        createdAt: 'serverTimestamp()'
      });

      const docRef = await addDoc(collection(db, 'gameSchedules'), gameScheduleData);
      console.log('🎮 Game created successfully with ID:', docRef.id);

      await this.updateCourtGameSchedules(gameData.basketballCourt, docRef.id, 'add');
      console.log('🎮 Updated court game schedules');

      return docRef.id;
    } catch (error) {
      console.error('💥 Error creating game schedule:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to create game schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllGameSchedules(): Promise<GameSchedule[]> {
    try {
      console.log('🔍 Fetching ALL games from collection...');
      
      const gamesRef = collection(db, 'gameSchedules');
      const querySnapshot = await getDocs(gamesRef);
      console.log('📊 Total documents in collection:', querySnapshot.size);
      
      const games: GameSchedule[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 All games - Document data:', {
          id: doc.id,
          scheduledTime: data.scheduledTime,
          scheduledTimeType: typeof data.scheduledTime,
          courtName: data.courtName,
          address: data.address,
          maxPlayers: data.maxPlayers,
          allFields: Object.keys(data)
        });
        
        try {
          let scheduledTime: Date;
          if (data.scheduledTime && typeof data.scheduledTime.toDate === 'function') {
            scheduledTime = data.scheduledTime.toDate();
          } else if (data.scheduledTime instanceof Date) {
            scheduledTime = data.scheduledTime;
          } else if (typeof data.scheduledTime === 'string') {
            scheduledTime = new Date(data.scheduledTime);
          } else {
            console.warn('Unknown scheduledTime format:', data.scheduledTime);
            scheduledTime = new Date();
          }
          
          const game = {
            id: doc.id,
            basketballCourt: data.basketballCourt || '',
            courtName: data.courtName || 'Unknown Court',
            address: data.address || 'Unknown Address',
            scheduledTime: scheduledTime,
            peopleAttending: data.peopleAttending || 0,
            createdBy: data.createdBy || '',
            createdAt: data.createdAt ? 
              (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) 
              : new Date(),
            rsvpUsers: data.rsvpUsers || [],
            maxPlayers: data.maxPlayers,
            gameType: data.gameType,
            skillLevel: data.skillLevel,
            description: data.description,
          } as GameSchedule;
          
          games.push(game);
          console.log('✅ Successfully parsed game:', game.id, 'scheduled for:', game.scheduledTime.toISOString());
        } catch (parseError) {
          console.error('❌ Error parsing game document:', doc.id, parseError);
        }
      });

      console.log('🎯 Returning', games.length, 'total games');
      return games;
    } catch (error) {
      console.error('💥 Error in getAllGameSchedules:', error);
      throw new Error('Failed to fetch all games');
    }
  }

  async getUpcomingGameSchedules(): Promise<GameSchedule[]> {
    try {
      // First try to get all games to debug
      const allGames = await this.getAllGameSchedules();
      
      const now = new Date();
      console.log('🔍 Filtering games after:', now.toISOString());
      
      // Filter games manually to see what's happening
      const upcomingGames = allGames.filter(game => {
        const isUpcoming = game.scheduledTime > now;
        console.log(`Game ${game.id}: ${game.scheduledTime.toISOString()} > ${now.toISOString()} = ${isUpcoming}`);
        return isUpcoming;
      });
      
      console.log('🎯 Found', upcomingGames.length, 'upcoming games out of', allGames.length, 'total');
      
      // Sort by scheduled time
      upcomingGames.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      
      return upcomingGames;
    } catch (error) {
      console.error('💥 Error in getUpcomingGameSchedules:', error);
      throw new Error('Failed to fetch upcoming games');
    }
  }

  subscribeToGameSchedules(callback: (games: GameSchedule[]) => void): () => void {
    try {
      console.log('🔄 Setting up real-time subscription for all games...');
      
      const gamesRef = collection(db, 'gameSchedules');
      // Subscribe to all games, we'll filter on the client side
      const unsubscribe = onSnapshot(gamesRef, (querySnapshot) => {
        console.log('🔄 Real-time update: received', querySnapshot.size, 'documents');
        const allGames: GameSchedule[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('🔄 Real-time document:', {
            id: doc.id,
            scheduledTime: data.scheduledTime,
            scheduledTimeType: typeof data.scheduledTime,
            courtName: data.courtName
          });
          
          try {
            let scheduledTime: Date;
            if (data.scheduledTime && typeof data.scheduledTime.toDate === 'function') {
              scheduledTime = data.scheduledTime.toDate();
            } else if (data.scheduledTime instanceof Date) {
              scheduledTime = data.scheduledTime;
            } else if (typeof data.scheduledTime === 'string') {
              scheduledTime = new Date(data.scheduledTime);
            } else {
              console.warn('Unknown scheduledTime format in real-time:', data.scheduledTime);
              scheduledTime = new Date();
            }
            
            const game = {
              id: doc.id,
              basketballCourt: data.basketballCourt || '',
              courtName: data.courtName || 'Unknown Court',
              address: data.address || 'Unknown Address',
              scheduledTime: scheduledTime,
              peopleAttending: data.peopleAttending || 0,
              createdBy: data.createdBy || '',
              createdAt: data.createdAt ? 
                (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) 
                : new Date(),
              rsvpUsers: data.rsvpUsers || [],
              maxPlayers: data.maxPlayers,
              gameType: data.gameType,
              skillLevel: data.skillLevel,
              description: data.description,
            } as GameSchedule;
            
            allGames.push(game);
          } catch (parseError) {
            console.error('❌ Error parsing real-time document:', doc.id, parseError);
          }
        });

        // Filter for upcoming games
        const now = new Date();
        const upcomingGames = allGames.filter(game => {
          return game.scheduledTime > now;
        });
        
        // Sort by scheduled time
        upcomingGames.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

        console.log('🔄 Calling callback with', upcomingGames.length, 'upcoming games out of', allGames.length, 'total');
        callback(upcomingGames);
      }, (error) => {
        console.error('💥 Error in real-time listener:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('💥 Error setting up real-time listener:', error);
      throw new Error('Failed to set up real-time listener');
    }
  }

  async toggleRSVP(gameId: string, userId: string, isJoining: boolean): Promise<boolean> {
    try {
      const gameRef = doc(db, 'gameSchedules', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as GameSchedule;

      const gameTime = gameData.scheduledTime instanceof Timestamp
        ? gameData.scheduledTime.toDate()
        : gameData.scheduledTime;

      if (gameTime <= new Date()) {
        throw new Error('Cannot RSVP to past games');
      }

      if (isJoining && gameData.maxPlayers && gameData.peopleAttending >= gameData.maxPlayers) {
        throw new Error('Game is at maximum capacity');
      }

      const batch = writeBatch(db);

      if (isJoining) {
        if (gameData.rsvpUsers.includes(userId)) {
          throw new Error('User already RSVP\'d to this game');
        }

        batch.update(gameRef, {
          peopleAttending: increment(1),
          rsvpUsers: arrayUnion(userId)
        });
      } else {
        if (!gameData.rsvpUsers.includes(userId)) {
          throw new Error('User has not RSVP\'d to this game');
        }

        batch.update(gameRef, {
          peopleAttending: increment(-1),
          rsvpUsers: arrayRemove(userId)
        });
      }

      await batch.commit();

      return true;
    } catch (error) {
      throw error;
    }
  }

  private async updateCourtGameSchedules(courtId: string, gameId: string, action: 'add' | 'remove'): Promise<void> {
    try {
      const courtsRef = collection(db, 'basketballCourts');
      const q = query(courtsRef, where('place_id', '==', courtId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return;
      }

      const courtDoc = querySnapshot.docs[0];
      const courtRef = doc(db, 'basketballCourts', courtDoc.id);

      if (action === 'add') {
        await updateDoc(courtRef, {
          gameSchedules: arrayUnion(gameId)
        });
      } else {
        await updateDoc(courtRef, {
          gameSchedules: arrayRemove(gameId)
        });
      }

    } catch (error) {

    }
  }

  async deleteGameSchedule(gameId: string, userId: string): Promise<boolean> {
    try {
      const gameRef = doc(db, 'gameSchedules', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as GameSchedule;

      if (gameData.createdBy !== userId) {
        throw new Error('Only the game creator can delete this game');
      }

      await deleteDoc(gameRef);

      await this.updateCourtGameSchedules(gameData.basketballCourt, gameId, 'remove');

      return true;
    } catch (error) {
      throw error;
    }
  }

  async getUserGames(userId: string): Promise<GameSchedule[]> {
    try {
      const gamesRef = collection(db, 'gameSchedules');
      const q = query(
        gamesRef,
        where('createdBy', '==', userId),
        orderBy('scheduledTime', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const games: GameSchedule[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        games.push({
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime.toDate(),
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        } as GameSchedule);
      });

      return games;
    } catch (error) {
      throw new Error('Failed to fetch user games');
    }
  }

  async getGamesByCourtId(courtId: string): Promise<GameSchedule[]> {
    try {
      const now = new Date();
      const gamesRef = collection(db, 'gameSchedules');
      const q = query(
        gamesRef,
        where('basketballCourt', '==', courtId),
        where('scheduledTime', '>=', Timestamp.fromDate(now)),
        orderBy('scheduledTime', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const games: GameSchedule[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        games.push({
          id: doc.id,
          ...data,
          scheduledTime: data.scheduledTime.toDate(),
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        } as GameSchedule);
      });

      return games;
    } catch (error) {
      throw new Error('Failed to fetch games by court');
    }
  }

  async hasUserRSVPd(gameId: string, userId: string): Promise<boolean> {
    try {
      const gameRef = doc(db, 'gameSchedules', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        return false;
      }

      const gameData = gameDoc.data() as GameSchedule;
      return gameData.rsvpUsers.includes(userId);
    } catch (error) {
      return false;
    }
  }
}

export const gameService = GameService.getInstance();
