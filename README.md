# 📱 SingaSport

**We optimize public sports facility usage in Singapore by providing real-time availability,  
crowd data, and social features to enhance the playing experience and build a connected sporting community.
We are still currently developing additional features such as real time video footage of courts. After which, we will work on deploying our app to the App Store!**

---

This is a mobile application built using [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/). 
---

## 🚀 Getting Started

### ✅ Prerequisites

Before you begin, ensure you have the following installed and set up:

- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo account](https://expo.dev/signup)

### 📦 Testing (for testers)

1. **Clone the repository:**

    ```bash
    git clone https://github.com/clemenong1/SingaSport.git
    cd your-repo-name
    ```

2. **Install dependencies (if needed):**

    ```bash
    npm install
    ```

    Retrieving API Keys

    1. **Create a .env file in the project's root.**
    
    2. **Copy this into the file:**
    
        ```bash
        EXPO_PUBLIC_FIREBASE_API_KEY=your-key
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
        EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
        EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
        EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
        EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
    
        # Google Maps / Places API keys
        EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=YOUR_API_KEY 
        EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY=YOUR_API_KEY 
        EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY=YOUR_API_KEY 
    
        # OpenAI API Key
        EXPO_PUBLIC_OPENAI_API_KEY=YOUR_API_KEY
        ```

3. **Replace "YOUR_API_KEY" with your own api key. You will need to get your own Google Places, Google Maps IOS, Google Maps Android and OpenAI API Keys. Do not change the variable names in the .env file.**

4. **Firebase Setup**
    This app requires Firebase for Database, Storage, and Authentication.
    1. Create a Firebase project
    Go to Firebase Console.
    Click Add Project → Follow the prompts. 
    Then press Create Project.

    3. Enable Firebase services
        1. Authentication:
           Go to Build → Authentication → Get Started.
           Enable the following providers:
           Email/Password (or any others you used).
           Make sure Email/Password is enabled before clicking Save.
        2. Firestore Database:
        Go to Build → Firestore Database → Create Database.
        Choose Southeastasia1 for location if you are in Singapore. Else, choose the location best suited for where you are at.
        Choose Start in Test Mode (or your preferred rules) for development.
        3. Storage:
        Go to Build → Storage.
        You will have to link your Cloud Billing Account and upgrade to Blaze plan. 
        Set budget to 1SGD.
        Click on Get Started.
        Change the location to the same location as Firestore Database.
        Choose Start in test mode.

    4. Get your Firebase config
        1. Go to Project Settings → General → Your Apps.
        2. Register a new web app.
        3. Allow Firebase hosting.
        4. Copy the firebaseConfig object and place it in your .env file:
       ```bash
        EXPO_PUBLIC_FIREBASE_API_KEY=your-key
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
        EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
        EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
        EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
        EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
       ```
        5. Make sure .env is not committed to version control. Put it in gitignore
           
    5. Get Firebase service account JSON file
        1. Go to Firebase Console
        2. Open Firebase Console.
        3. Select your project (e.g., SingaSportTest).
        4. Click the ⚙️ gear icon next to Project Overview in the left sidebar.
        5. Navigate to Project Settings
        7. Select Project settings.
        8. Open Service Accounts Tab
        9. Generate a New Private Key
        10. Save the File A .json file will be downloaded — this is your service account key. Store it securely (never commit it to GitHub).
        11. Store this .json file in the root of your project directory
            
    6. Run writeToFB.js to add all basketball courts to database
        1. click src -> services -> writeToFB.js
        2. replace line 13 with
       ```bash
        const serviceAccount = JSON.parse(readFileSync('./XXX.json', 'utf8'));
       ```
        replace XXX with the name of the file you just saved in your root dir
        and then run
       ```bash
       node src/services/writeToFB.js
       ```
2. **Log into Expo account**

    ```bash
    npx expo login
    ```
    > You will be prompted to log into your Expo account, fill in the details.

5. **Run the app on your physical device (Expo Go):**

   - Download the **Expo Go** app from the App Store (iOS) or Play Store (Android).
   - Start the development server:

     ```bash
     npx expo start
     ```
     OR

     ```bash
     npx expo start --tunnel
     ```

   - Scan the QR code displayed in the terminal which opens the Expo Go App.

6. **OR Run the app on a simulator:**

    - Ensure that your simulators in the background is running
    - Click 'i' for IOS simulator or 'a' for android simulator.

## 🧪 Testing Geofence Feature

This section explains how to test the **Geofencing** and **Live Basketball Court Occupancy** features in the SingaSport app.

---

### 📍 Testing Geofencing & Court Occupancy for Milestone 2

Use these steps to simulate entering and exiting a geofenced basketball court zone using an emulator or physical device.

---

#### 1. Start the Expo Development Server

Clear cache and start the app using Expo’s tunnel (recommended for emulators and real devices):

```bash
npx expo start --clear --tunnel
```

---

#### 2. Set Android Emulator Location to VP Sheltered Basketball Court

```bash
# In Android Emulator:
# 1. Open the Extended Controls (three-dot menu on the emulator toolbar)
# 2. Go to "Location"
# 3. Enter the following coordinates and click 'Send'
#4. On the emulator, if the map does not reflect the coordinates you entered, it is okay. This is an emulator issue. Your location is still set as the coordinates in our app.

Latitude: 1.4292847
Longitude: 103.7974001
```

Alternatively, you can use ADB to set the location directly:

```bash
adb emu geo fix 103.7974001 1.4292847
```

---

#### 3. Simulate Arrival at the Court

```text
1. On your phone, open the app.
2. In the search bar, type: VP Sheltered Basketball Court
3. Tap the first result.
4. Wait 30–60 seconds.
5. The live count for the court should increase by 1.

🔄 If the count does not refresh automatically, press the back button and re-select the court.
```

---

#### 4. Simulate Leaving the Court

```text
1. Change your emulator’s location to a different coordinate (outside the geofence).

   Example:
   Latitude: 1.3521
   Longitude: 103.8198

   Or via ADB:
   adb emu geo fix 103.8198 1.3521

2. Wait 30–60 seconds.
3. The live count for VP Sheltered Basketball Court should decrease by 1.

🔄 If the count does not update immediately, press the back button and re-select the court.
```

---

### ✅ Notes

- Ensure location permissions are **granted** for the app on your device/emulator.
- Firestore’s real-time listener will sync the updated count as soon as the geofence event is triggered.
- You can verify updates in **Firebase Console → Firestore → courts/{courtId} → currentCount**.

> 💡 Tip: Use `adb emu geo fix <longitude> <latitude>` for fast GPS testing in emulators.

---

## 🛠️ Project Structure

```
SingaSport/
├── .expo/                          # Expo configuration files
├── .git/                           # Git repository files
├── .vscode/                        # VS Code settings
├── android/                        # Android native code
│   ├── app/
│   │   ├── build.gradle
│   │   ├── debug.keystore
│   │   └── src/
│   └── ...
├── ios/                            # iOS native code
│   ├── Podfile
│   ├── SingaSport/
│   │   ├── AppDelegate.swift
│   │   ├── Images.xcassets/
│   │   └── ...
│   └── SingaSport.xcodeproj/
├── app/                            # App screens (Expo Router)
│   ├── _layout.tsx                 # Root layout
│   ├── index.tsx                   # Landing/redirect page
│   ├── (tabs)/                     # Tab navigation screens
│   │   ├── _layout.tsx             # Tab layout
│   │   ├── main.tsx                # Map tab (main screen)
│   │   ├── two.tsx                 # Contribute tab (game scheduling)
│   │   └── three.tsx               # Profile tab
│   ├── auth/                       # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── complete-profile.tsx
│   ├── courts/                     # Court-related screens
│   │   ├── search.tsx
│   │   ├── court-info.tsx
│   │   └── report-page.tsx
│   └── profile/                    # Profile management
│       └── edit-profile.tsx
├── src/                            # Source code
│   ├── components/                 # Reusable React components
│   │   ├── __tests__/
│   │   ├── CreateGameModal.tsx     # Game creation modal
│   │   ├── EditScreenInfo.tsx
│   │   ├── ExternalLink.tsx
│   │   ├── StyledText.tsx
│   │   ├── Themed.tsx
│   │   ├── useClientOnlyValue.ts
│   │   ├── useColorScheme.ts
│   │   └── index.ts
│   ├── services/                   # Business logic & API services
│   │   ├── FirebaseConfig.ts       # Firebase configuration
│   │   ├── gameService.ts          # Game scheduling service
│   │   ├── writeToFB.js           # Firebase write utilities
│   │   └── index.ts
│   ├── constants/                  # App constants
│   │   ├── Colors.ts
│   │   └── index.ts
│   ├── hooks/                      # Custom React hooks
│   │   └── index.ts
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/                      # Utility functions
│   │   ├── userService.ts
│   │   └── index.ts
│   └── lib/                        # External libraries
│       └── target.js
├── assets/                         # Static assets
│   ├── fonts/
│   │   └── SpaceMono-Regular.ttf
│   └── images/
│       ├── adaptive-icon.png
│       ├── favicon.png
│       ├── icon.png
│       └── splash-icon.png

├── types/                          # Global type definitions
│   └── env.d.ts
├── node_modules/                   # Dependencies
├── .gitattributes                  # Git attributes
├── .gitignore                      # Git ignore rules
├── app.json                        # Expo app configuration
├── babel.config.js                 # Babel configuration
├── eas.json                        # Expo Application Services config
├── expo-env.d.ts                   # Expo environment types
├── metro.config.js                 # Metro bundler configuration
├── package.json                    # Dependencies and scripts
├── package-lock.json               # Locked dependency versions
├── README.md                       # Project documentation
└── tsconfig.json                   # TypeScript configuration
```

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with Expo Router
- **Backend**: Firebase Firestore (NoSQL database)
- **Authentication**: Firebase Auth
- **Navigation**: Expo Router with file-based routing
- **State Management**: React hooks (useState, useEffect)
- **Real-time Updates**: Firestore real-time listeners
- **Maps**: React Native Maps with custom markers
- **UI Components**: Custom components with React Native

### Key Features
- 🗺️ **Interactive Map**: Real-time basketball court locations across Singapore
- 👥 **Live Crowd Data**: Real-time people counting at courts
- 🏀 **Game Scheduling**: Create and join basketball games
- 📱 **Court Discovery**: Search and filter courts by location and amenities
- 👤 **User Profiles**: Authentication and profile management
- 📊 **Court Reports**: Report issues and maintenance needs
- 🔄 **Real-time Updates**: Live data synchronization across all users

### App Structure
- **Map Tab** (`main.tsx`): Interactive map with court locations and real-time data
- **Contribute Tab** (`two.tsx`): Basketball game scheduling and community features
- **Profile Tab** (`three.tsx`): User profile and account management
- **Authentication Flow**: Login, signup, and profile completion
- **Court Details**: Detailed court information, reports, and game schedules

---

## 🔧 Key Services

### GameService (`src/services/gameService.ts`)
Handles all basketball game scheduling functionality:
- Create and manage game schedules
- Real-time game updates via Firestore listeners
- RSVP system for joining/leaving games
- Game filtering and search capabilities

### Firebase Configuration (`src/services/FirebaseConfig.ts`)
- Firestore database connection
- Authentication setup
- Real-time listener configuration

---

## 📱 Screens Overview

### Main Navigation Tabs
1. **Map** - Interactive court map with real-time data
2. **Contribute** - Game scheduling and community features  
3. **Profile** - User account and settings

### Authentication Screens
- **Login** - User authentication
- **Signup** - New user registration
- **Complete Profile** - Profile setup after registration

### Court Screens
- **Search** - Find courts by location and filters
- **Court Info** - Detailed court information and amenities
- **Report Page** - Report court issues or maintenance needs

---
