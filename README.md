# 📱 SingaSport

**We optimize public sports facility usage in Singapore by providing real-time availability,  
crowd data, and social features to enhance the playing experience and build a connected sporting community.**

---

This is a mobile application built using [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/). 
---

## 🚀 Getting Started

### ✅ Prerequisites

Before you begin, ensure you have the following installed and set up:

- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo account](https://expo.dev/signup)

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

2. **Install dependencies (if needed):**

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
