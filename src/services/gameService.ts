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

  /**
   * Create a new game schedule
   */
  async createGameSchedule(gameData: Omit<GameSchedule, 'id' | 'createdAt'>): Promise<string> {
    try {
      const gameScheduleData = {
        ...gameData,
        createdAt: serverTimestamp(),
        scheduledTime: Timestamp.fromDate(gameData.scheduledTime),
      };

      const docRef = await addDoc(collection(db, 'gameSchedules'), gameScheduleData);
      
      // Update the basketball court's gameSchedules array
      await this.updateCourtGameSchedules(gameData.basketballCourt, docRef.id, 'add');
      
      console.log('✅ Game schedule created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating game schedule:', error);
      throw new Error('Failed to create game schedule');
    }
  }

  /**
   * Get all upcoming game schedules
   */
  async getUpcomingGameSchedules(): Promise<GameSchedule[]> {
    try {
      const now = new Date();
      const gamesRef = collection(db, 'gameSchedules');
      const q = query(
        gamesRef,
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
          createdAt: data.createdAt.toDate(),
        } as GameSchedule);
      });

      console.log(`📅 Fetched ${games.length} upcoming games`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching upcoming games:', error);
      throw new Error('Failed to fetch upcoming games');
    }
  }

  /**
   * Set up real-time listener for game schedules
   */
  subscribeToGameSchedules(callback: (games: GameSchedule[]) => void): () => void {
    try {
      const now = new Date();
      const gamesRef = collection(db, 'gameSchedules');
      const q = query(
        gamesRef,
        where('scheduledTime', '>=', Timestamp.fromDate(now)),
        orderBy('scheduledTime', 'asc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
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

        console.log(`🔄 Real-time update: ${games.length} upcoming games`);
        callback(games);
      }, (error) => {
        console.error('❌ Error in real-time listener:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up real-time listener:', error);
      throw new Error('Failed to set up real-time listener');
    }
  }

  /**
   * RSVP to a game (join or leave)
   */
  async toggleRSVP(gameId: string, userId: string, isJoining: boolean): Promise<boolean> {
    try {
      const gameRef = doc(db, 'gameSchedules', gameId);
      const gameDoc = await getDoc(gameRef);
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as GameSchedule;

      // Check if game is in the future
      const gameTime = gameData.scheduledTime instanceof Timestamp 
        ? gameData.scheduledTime.toDate() 
        : gameData.scheduledTime;
      
      if (gameTime <= new Date()) {
        throw new Error('Cannot RSVP to past games');
      }

      // Check capacity if joining
      if (isJoining && gameData.maxPlayers && gameData.peopleAttending >= gameData.maxPlayers) {
        throw new Error('Game is at maximum capacity');
      }

      // Perform batch update for consistency
      const batch = writeBatch(db);

      if (isJoining) {
        // Check if user is already RSVP'd
        if (gameData.rsvpUsers.includes(userId)) {
          throw new Error('User already RSVP\'d to this game');
        }

        batch.update(gameRef, {
          peopleAttending: increment(1),
          rsvpUsers: arrayUnion(userId)
        });
      } else {
        // Check if user is actually RSVP'd
        if (!gameData.rsvpUsers.includes(userId)) {
          throw new Error('User has not RSVP\'d to this game');
        }

        batch.update(gameRef, {
          peopleAttending: increment(-1),
          rsvpUsers: arrayRemove(userId)
        });
      }

      await batch.commit();

      console.log(`✅ RSVP ${isJoining ? 'added' : 'removed'} successfully for game ${gameId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating RSVP:`, error);
      throw error;
    }
  }

  /**
   * Update basketball court's gameSchedules array
   */
  private async updateCourtGameSchedules(courtId: string, gameId: string, action: 'add' | 'remove'): Promise<void> {
    try {
      // First try to find the court document by place_id
      const courtsRef = collection(db, 'basketballCourts');
      const q = query(courtsRef, where('place_id', '==', courtId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(`⚠️ Court with place_id ${courtId} not found`);
        return;
      }

      // Update the first matching court document
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

      console.log(`✅ Court ${courtId} gameSchedules updated: ${action}ed ${gameId}`);
    } catch (error) {
      console.error(`❌ Error updating court gameSchedules:`, error);
      // Don't throw here as this is a secondary operation
    }
  }

  /**
   * Delete a game schedule (only by creator)
   */
  async deleteGameSchedule(gameId: string, userId: string): Promise<boolean> {
    try {
      const gameRef = doc(db, 'gameSchedules', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const gameData = gameDoc.data() as GameSchedule;

      // Check if user is the creator
      if (gameData.createdBy !== userId) {
        throw new Error('Only the game creator can delete this game');
      }

      // Delete the game document
      await deleteDoc(gameRef);

      // Remove from court's gameSchedules array
      await this.updateCourtGameSchedules(gameData.basketballCourt, gameId, 'remove');

      console.log(`✅ Game schedule ${gameId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting game schedule:`, error);
      throw error;
    }
  }

  /**
   * Get games created by a specific user
   */
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

      console.log(`👤 Fetched ${games.length} games for user ${userId}`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching user games:', error);
      throw new Error('Failed to fetch user games');
    }
  }

  /**
   * Get games by court ID
   */
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

      console.log(`🏀 Fetched ${games.length} games for court ${courtId}`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching games by court:', error);
      throw new Error('Failed to fetch games by court');
    }
  }

  /**
   * Check if user has RSVP'd to a specific game
   */
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
      console.error('❌ Error checking RSVP status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gameService = GameService.getInstance(); 