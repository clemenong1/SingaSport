// IMPORTS
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { getFirestore, GeoPoint } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { targets } from '../lib/target.js';
import dotenv from 'dotenv';
// LOAD ENV VARIABLES (for Node.js script)
dotenv.config();
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env');


// INITIALIZE FIREBASE
import { readFileSync } from 'fs';
const serviceAccount = JSON.parse(readFileSync('./singasport-cd006-firebase-adminsdk-fbsvc-ac174f92e1.json', 'utf8'));

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

// FUNCTION TO GET PLACE DETAILS (for opening hours and ratings)
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
  } catch (error) {
    console.warn(`Error fetching details for place ${placeId}:`, error.message);
  }
  
  return {
    openingHours: null,
    rating: null,
    userRatingsTotal: null,
  };
}

// MAIN FUNCTION
async function storeAllBasketballCourts() {
  let processedCount = 0;
  let totalCourts = 0;

  for (const { lat, lng } of targets) {
    console.log(`Processing target ${processedCount + 1}/${targets.length}: ${lat}, ${lng}`);
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

      // Get additional details from Place Details API
      console.log(`Fetching details for: ${name}`);
      const details = await getPlaceDetails(place_id);
      
      // Add a small delay to avoid hitting API rate limits
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
        geofenceRadius: 30, // 30 meters as requested
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Stored: ${name} (Rating: ${details.rating || 'N/A'})`);
    }
    
    processedCount++;
  }

  console.log(`\n🎉 All courts processed!`);
  console.log(`📊 Summary:`);
  console.log(`   - Targets processed: ${processedCount}`);
  console.log(`   - Total courts found: ${totalCourts}`);
  console.log(`   - Fields included: name, address, location, geohash, peopleNumber, openingHours, rating, userRatingsTotal, geofenceRadius`);
}

// RUN SCRIPT
storeAllBasketballCourts().catch(console.error);
