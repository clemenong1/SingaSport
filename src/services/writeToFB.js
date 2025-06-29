import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { targets } from '../lib/target.js';
import dotenv from 'dotenv';
dotenv.config();
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env');

import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./singasport-cd006-firebase-adminsdk-fbsvc-ac174f92e1.json', 'utf8'));

admin.initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function getBasketballCourtsNear(lat, lng, radius = 1500) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=basketball%20court&type=point_of_interest&key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    return [];
  }

  return data.results;
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,rating,user_ratings_total&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return {
        openingHours: data.result.opening_hours?.weekday_text || null,
        rating: data.result.rating || null,
        userRatingsTotal: data.result.user_ratings_total || null,
      };
    }
  } catch (error) {return {
    openingHours: null,
    rating: null,
    userRatingsTotal: null,
  };
}

async function storeAllBasketballCourts() {
  let processedCount = 0;
  let totalCourts = 0;

  for (const { lat, lng } of targets) {
    const courts = await getBasketballCourtsNear(lat, lng);
    totalCourts += courts.length;

    for (const court of courts) {
      const {
        place_id,
        name,
        vicinity: address,
        geometry: {
          location: { lat: placeLat, lng: placeLng },
        },
      } = court;

      const details = await getPlaceDetails(place_id);

      await new Promise(resolve => setTimeout(resolve, 100));

      const geoPoint = new GeoPoint(placeLat, placeLng);
      const geohash = geohashForLocation([placeLat, placeLng]);

      const docRef = db.collection('basketballCourts').doc(place_id);
      await docRef.set({
        name,
        address,
        location: geoPoint,
        geohash,
        peopleNumber: 0,
        openingHours: details.openingHours,
        rating: details.rating,
        userRatingsTotal: details.userRatingsTotal,
        geofenceRadius: 30,
        updatedAt: new Date().toISOString(),
      });

    }

    processedCount++;
  }

}

storeAllBasketballCourts().catch(console.error);
