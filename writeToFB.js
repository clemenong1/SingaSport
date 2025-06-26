// IMPORTS
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { config } from 'dotenv';
import { targets } from './targets.js'; // Ensure this file exports the full targets array

// LOAD ENV VARIABLES
config();
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY in .env');

// INITIALIZE FIREBASE
const serviceAccount = require('./serviceAccountKey.json'); // Make sure this file exists

admin.initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// FUNCTION TO SEARCH PLACES NEAR COORDINATE
async function getBasketballCourtsNear(lat, lng, radius = 1500) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=basketball%20court&type=point_of_interest&key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    console.warn(`No results or error at lat:${lat}, lng:${lng}`, data.status);
    return [];
  }

  return data.results;
}

// MAIN FUNCTION
async function storeAllBasketballCourts() {
  for (const { lat, lng } of targets) {
    const courts = await getBasketballCourtsNear(lat, lng);

    for (const court of courts) {
      const {
        place_id,
        name,
        vicinity: address,
        geometry: {
          location: { lat: placeLat, lng: placeLng },
        },
      } = court;

      const geoPoint = new GeoPoint(placeLat, placeLng);
      const geohash = geohashForLocation([placeLat, placeLng]);

      const docRef = db.collection('basketballCourts').doc(place_id);
      await docRef.set({
        name,
        address,
        location: geoPoint,
        geohash,
        peopleNumber: 0,
      });

      console.log(`Stored: ${name} (${place_id})`);
    }
  }

  console.log('✅ All courts processed.');
}

// RUN SCRIPT
storeAllBasketballCourts().catch(console.error);
