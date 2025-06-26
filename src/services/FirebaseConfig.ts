// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmuuOXT6dRUStt4-8502jYXO2c25OfLwI",
  authDomain: "singasport-cd006.firebaseapp.com",
  projectId: "singasport-cd006",
  storageBucket: "singasport-cd006.firebasestorage.app",
  messagingSenderId: "166758109207",
  appId: "1:166758109207:web:d12304df252ecf55364c52"
};

const app = initializeApp(firebaseConfig);

// For React Native, this is usually the most reliable approach
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
