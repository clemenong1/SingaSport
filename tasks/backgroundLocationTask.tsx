// backgroundLocationTask.ts
import * as TaskManager from 'expo-task-manager';
import geolib from 'geolib';
import type { TaskManagerTaskBody } from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import * as Notifications from 'expo-notifications';

export const LOCATION_TASK_NAME = 'background-location-task';

interface Court {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

const basketballCourts: Court[] = [
  { id: 'VP Sheltered Basketball Court', latitude: 1.4296513, longitude: 103.7974786, radius: 100 },
  { id: 'court2', latitude: 1.305, longitude: 103.805, radius: 100 },
];

// To track if user is inside geofence to avoid duplicate logs
const insideStates: Record<string, boolean> = {};

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async (taskData: TaskManagerTaskBody<{ locations: LocationObject[] }>) => {
    const { data, error } = taskData;

    if (error !== null) {
      console.error('Background location task error:', error);
      return;
    }

    if (data && data.locations.length > 0) {
      const latestLocation = data.locations[0];

      for (const court of basketballCourts) {
        const isInside = geolib.isPointWithinRadius(
          {
            latitude: latestLocation.coords.latitude,
            longitude: latestLocation.coords.longitude,
          },
          {
            latitude: court.latitude,
            longitude: court.longitude,
          },
          court.radius
        );

        if (isInside && !insideStates[court.id]) {
          insideStates[court.id] = true;
          console.log(`Entered geofence: ${court.id}`);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Entered ${court.id}`,
              body: `You are inside the geofence for ${court.id}`,
            },
            trigger: null,
          });

        } else if (!isInside && insideStates[court.id]) {
          insideStates[court.id] = false;
          console.log(`Exited geofence: ${court.id}`);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Exited ${court.id}`,
              body: `You left the geofence for ${court.id}`,
            },
            trigger: null,
          });
        }
      }
    }
  }
);

