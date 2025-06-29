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
      const gameScheduleData = {
        ...gameData,
        createdAt: serverTimestamp(),
        scheduledTime: Timestamp.fromDate(gameData.scheduledTime),
      };

      const docRef = await addDoc(collection(db, 'gameSchedules'), gameScheduleData);

      await this.updateCourtGameSchedules(gameData.basketballCourt, docRef.id, 'add');

      return docRef.id;
    } catch (error) {
      throw new Error('Failed to create game schedule');
    }
  }

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
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        } as GameSchedule);
      });

      return games;
    } catch (error) {
      throw new Error('Failed to fetch upcoming games');
    }
  }

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

        callback(games);
      }, (error) => {
        console.error('Error in real-time listener:', error);
      });

      return unsubscribe;
    } catch (error) {
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
