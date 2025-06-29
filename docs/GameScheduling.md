# Basketball Game Scheduling System

## Overview

The SingaSport app now includes a complete basketball game scheduling and RSVP system that allows users to create, discover, and join basketball games at courts across Singapore.

## Architecture

### Components

1. **ContributeTab** (`app/(tabs)/two.tsx`) - Main interface displaying game feed
2. **CreateGameModal** (`src/components/CreateGameModal.tsx`) - Game creation interface  
3. **GameService** (`src/services/gameService.ts`) - Firebase operations
4. **Types** (`src/types/index.ts`) - TypeScript interfaces

### Database Structure

#### Collection: `gameSchedules`
```javascript
{
  basketballCourt: "placeId_of_court", // references basketball court
  courtName: "Court Name", // for display
  address: "Full address of the court",
  scheduledTime: timestamp, // when the game is scheduled
  peopleAttending: 0, // number incremented/decremented on RSVP
  createdBy: "userId", // who created the game
  createdAt: timestamp,
  rsvpUsers: ["userId1", "userId2"], // array of user IDs who RSVP'd
  maxPlayers: 10, // optional maximum capacity
  gameType: "pickup", // pickup, tournament, practice, casual
  skillLevel: "intermediate", // beginner, intermediate, advanced, or undefined for all
  description: "Optional game description"
}
```

#### Updated Collection: `basketballCourts`
```javascript
{
  // existing fields...
  gameSchedules: ["gameScheduleId1", "gameScheduleId2"] // array of document IDs
}
```

## Features

### Game Discovery
- **Real-time feed** of upcoming games sorted chronologically
- **Search functionality** by court name, address, game type, or description
- **Filter options**: All Games, Joined Games, Created Games
- **Pull-to-refresh** for latest updates
- **Live updates** via Firestore listeners

### Game Creation
- **Court selection** from existing basketball courts database
- **Date & time picker** with validation for future games only
- **Game settings**: max players (2-20), game type, skill level
- **Optional description** for additional details
- **Form validation** with user-friendly error messages

### RSVP System
- **Join/Leave functionality** with confirmation dialogs
- **Capacity management** - prevents joining full games
- **Real-time updates** of player counts
- **Creator auto-join** - game creators automatically RSVP
- **Visual indicators** for joined/full games

### User Experience
- **Intuitive card design** with color-coded game types
- **Smart date formatting** (Today, Tomorrow, specific dates)
- **Loading states** for all async operations
- **Empty states** with appropriate messaging
- **Creator badges** to identify game organizers

## API Reference

### GameService Methods

#### `createGameSchedule(gameData)`
Creates a new game schedule and updates court references.

```typescript
const gameData = {
  basketballCourt: "placeId",
  courtName: "Court Name",
  address: "Full Address",
  scheduledTime: new Date(),
  peopleAttending: 1,
  createdBy: "userId",
  rsvpUsers: ["userId"],
  maxPlayers: 10,
  gameType: "pickup",
  skillLevel: "intermediate",
  description: "Optional description"
};

const gameId = await gameService.createGameSchedule(gameData);
```

#### `getUpcomingGameSchedules()`
Fetches all upcoming games sorted by scheduled time.

```typescript
const games = await gameService.getUpcomingGameSchedules();
```

#### `subscribeToGameSchedules(callback)`
Sets up real-time listener for game updates.

```typescript
const unsubscribe = gameService.subscribeToGameSchedules((games) => {
  setGames(games);
});

// Clean up listener
return () => unsubscribe();
```

#### `toggleRSVP(gameId, userId, isJoining)`
Join or leave a game with validation.

```typescript
await gameService.toggleRSVP(gameId, userId, true); // Join
await gameService.toggleRSVP(gameId, userId, false); // Leave
```

#### `deleteGameSchedule(gameId, userId)`
Delete a game (creator only).

```typescript
await gameService.deleteGameSchedule(gameId, userId);
```

#### `getUserGames(userId)`
Get games created by a specific user.

```typescript
const userGames = await gameService.getUserGames(userId);
```

#### `getGamesByCourtId(courtId)`
Get upcoming games for a specific court.

```typescript
const courtGames = await gameService.getGamesByCourtId(courtId);
```

## Game Types & Colors

- **Pickup** (`#96CEB4`) - Casual pickup games
- **Tournament** (`#FF6B35`) - Competitive tournament play
- **Practice** (`#4ECDC4`) - Skill development sessions
- **Casual** (`#45B7D1`) - Relaxed social games

## Skill Levels

- **All Levels** - Open to everyone
- **Beginner** - New to basketball
- **Intermediate** - Some experience
- **Advanced** - Skilled players

## Error Handling

The system includes comprehensive error handling for:
- **Network issues** during Firebase operations
- **User permissions** and authentication
- **Game capacity** validation
- **Time validation** (no past games)
- **User state** (already joined/left)
- **Database constraints** and consistency

## Performance Optimizations

- **Real-time listeners** instead of polling
- **Optimistic updates** for immediate UI feedback
- **Batch operations** for consistent database updates
- **Efficient queries** with proper indexing
- **Loading states** to improve perceived performance

## Security Features

- **User authentication** required for all operations
- **Creator-only deletion** of games
- **Server-side timestamps** to prevent time manipulation
- **Input validation** on both client and server
- **Atomic operations** for data consistency

## Integration Examples

### From Court Info Screen
```typescript
// Pass selected court to create modal
<CreateGameModal
  visible={showModal}
  selectedCourt={court}
  onGameCreated={handleGameCreated}
  onClose={() => setShowModal(false)}
/>
```

### From Map Screen
```typescript
// Show games for specific court
const courtGames = await gameService.getGamesByCourtId(court.place_id);
```

### User Profile Integration
```typescript
// Show user's created games
const userGames = await gameService.getUserGames(auth.currentUser.uid);
```

## Future Enhancements

1. **Push notifications** for game reminders
2. **Game check-in** system for attendance tracking
3. **Player ratings** and feedback system
4. **Weather integration** for outdoor courts
5. **Group messaging** for game participants
6. **Recurring games** functionality
7. **Game cancellation** with notifications
8. **Advanced filtering** by distance, skill level, time

## Dependencies

- `@react-native-picker/picker` - Court and settings selection
- `@react-native-community/datetimepicker` - Date/time selection
- `firebase/firestore` - Database operations
- `expo-router` - Navigation
- `@expo/vector-icons` - UI icons

## Testing

The system should be tested with:
1. Multiple users creating and joining games
2. Real-time updates across different devices
3. Edge cases (full games, past times, network issues)
4. Different game types and skill levels
5. Search and filter functionality
6. RSVP state changes and validation

## Troubleshooting

### Common Issues

1. **Real-time updates not working**
   - Check Firestore security rules
   - Verify network connectivity
   - Ensure proper listener cleanup

2. **RSVP failures**
   - Verify user authentication
   - Check game capacity limits
   - Ensure game is in the future

3. **Court selection issues**
   - Verify basketball courts collection
   - Check court data structure
   - Ensure proper place_id mapping

This system provides a robust foundation for community-driven basketball game organization while maintaining data integrity and user experience standards. 