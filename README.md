# 📱 SingaSport

**We optimize public sports facility usage in Singapore by providing real-time availability,  
crowd data, and social features to enhance the playing experience and build a connected sporting community.**

---

This is a mobile application built using [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/). We will be using an Android emulator to test.
---

## 🚀 Getting Started

### ✅ Prerequisites

Before you begin, ensure you have the following installed and set up:

- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo account](https://expo.dev/signup)
- [Android Studio](https://developer.android.com/studio) (for Android emulator)

### 📦 Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/clemenong1/SingaSport.git
   cd your-repo-name
   ```

2. **Install dependencies (if needed):**

   ```bash
   npm install
   ```

3. **Run the app on Android emulator:**

   ```bash
   npx expo run:android
   ```

   > This will automatically launch the Android Studio emulator. You can then either **log in** or **create a new account** to use the app.

4. **OR run the app on your physical device (Expo Go):**

   - Download the **Expo Go** app from the App Store (iOS) or Play Store (Android).
   - Start the development server:

     ```bash
     npx expo start
     ```
   OR
   
     ```bash
     npx expo start
     ```

   - Scan the QR code displayed in the terminal which opens the Expo Go App.

---

## 🛠️ Project Structure

```
SINGASPORT/
├── .expo/
├── .vscode/
│   └── settings.json
├── android/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── three.tsx
│   │   └── two.tsx
│   ├── screens/
│   │   ├── _layout.tsx
│   │   ├── editprofile.tsx
│   │   ├── index.tsx
│   │   ├── modal.tsx
│   │   └── resetToRoot.tsx
├── assets/
├── components/
├── constants/
├── ios/
├── tasks/
├── .gitattributes
├── .gitignore
├── app.json
├── eas.json
├── expo-env.d.ts
├── FirebaseConfig.ts
├── metro.config.js
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
```

---
