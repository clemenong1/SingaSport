# SingaSport 🏀

A community-driven React Native app for finding and managing basketball courts across Singapore, featuring real-time court data, AI-powered image verification, and gamified community engagement.

## ✨ Key Features

### 🗺️ **Interactive Court Discovery**
- Real-time basketball court locations across Singapore
- Live crowd counting with geofencing technology
- Court search and filtering by location, amenities, and status
- Detailed court information with photos and reports

### 🤖 **AI-Powered Image Verification**
- **OpenAI Vision Integration**: Uses GPT-4V to verify report accuracy
- **Real-time Verification**: Instant feedback on photo submissions
- **Smart Matching**: AI analyzes if photos match report descriptions
- **Cost-Optimized**: Built-in rate limiting and compression
- **Fallback Support**: Traditional upload when AI is unavailable

### 🏀 **Game Scheduling & Community**
- Create and join basketball games at any court
- Real-time RSVP system with capacity management
- Game filtering by skill level, type, and schedule
- Community-driven court maintenance reporting

### 🏆 **Gamification System**
- **Base Points**: 10 points for reports, 15 for verifications
- **AI Verification Bonus**: Extra 5 points per AI-verified photo
- **Real-time Updates**: Instant point notifications
- **Community Leaderboard**: Coming soon

### 📊 **Advanced Reporting System**
- **Court Issue Reporting**: Report maintenance needs, crowding, surface issues
- **AI Verification**: Photos automatically verified for accuracy
- **Community Verification**: Other users can verify reports with photos
- **Status Tracking**: Open, investigating, resolved status workflow
- **Real-time Updates**: Live report synchronization

## 🛠️ Technical Architecture

### **Frontend**: React Native with Expo Router
- File-based routing for intuitive navigation
- TypeScript for type safety and better development experience
- Real-time UI updates with optimistic rendering

### **Backend**: Firebase Ecosystem
- **Firestore**: NoSQL database for scalable data storage
- **Firebase Storage**: Optimized image storage with temporary/permanent separation
- **Firebase Auth**: Secure user authentication and profile management
- **Real-time Listeners**: Live data synchronization across all users

### **AI Integration**: OpenAI Vision API
- **Model**: GPT-4V for advanced image analysis
- **Custom Prompts**: Basketball court-specific verification prompts
- **Error Handling**: Comprehensive retry logic and graceful degradation
- **Cost Controls**: Request deduplication, rate limiting, and image compression

### **Geofencing**: Location-based Features
- **Background Location Tracking**: Continuous court proximity monitoring
- **Dynamic People Counting**: Automatic court occupancy updates
- **Notification System**: Alerts for court entry/exit events

## 🏗️ Project Structure

```
SingaSport/
├── app/                               # Expo Router screens
│   ├── (tabs)/                       # Main navigation tabs
│   │   ├── main.tsx                  # Interactive map with real-time data
│   │   ├── two.tsx                   # Game scheduling & community
│   │   └── three.tsx                 # User profile & settings
│   ├── auth/                         # Authentication flow
│   ├── courts/                       # Court-related screens
│   │   ├── court-info.tsx           # Detailed court information
│   │   ├── report-page.tsx          # AI-powered report submission
│   │   ├── reports-list.tsx         # Community reports & verification
│   │   └── search.tsx               # Court search & discovery
│   └── profile/                      # User profile management
├── src/
│   ├── components/                   # Reusable UI components
│   │   ├── AIVerificationStatusComponent.tsx     # AI verification UI
│   │   ├── AIVerificationIntegratedUpload.tsx    # Complete upload flow
│   │   ├── VerifyReportComponent.tsx              # Report verification
│   │   └── CreateGameModal.tsx                    # Game creation
│   ├── services/                     # Business logic & API services
│   │   ├── aiVisionService.ts        # OpenAI Vision integration
│   │   ├── tempStorageService.ts     # Temporary image management
│   │   ├── FirebaseConfig.ts         # Firebase setup
│   │   └── gameService.ts            # Game scheduling
│   ├── utils/                        # Utility functions
│   │   └── userService.ts            # User profile & points management
│   ├── types/                        # TypeScript definitions
│   │   └── index.ts                  # AI verification & app types
│   └── constants/                    # App constants & configuration
└── assets/                           # Static assets (images, fonts)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android) or Xcode (for iOS)
- OpenAI API key
- Firebase project with Firestore, Storage, and Authentication enabled

### Installation

1. **Clone and Install**
    ```bash
git clone <repository-url>
cd SingaSport
    npm install
    ```

2. **Environment Setup**
Create a `.env` file with required API keys:
    ```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Maps API
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# OpenAI Integration
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

3. **Start Development Server**
```bash
npx expo start --clear --tunnel
```

### Testing AI Verification

1. **Set up Emulator Location** (VP Sheltered Basketball Court for testing):
```bash
# Android Emulator coordinates
Latitude: 1.4292847
Longitude: 103.7974001

# Or via ADB
adb emu geo fix 103.7974001 1.4292847
```

2. **Test Report Submission**:
   - Navigate to any court → "Report an Issue"
   - Describe a condition (e.g., "Court is crowded", "Slippery floor")
   - Take/select a photo → AI will verify if it matches your description
   - Successful verification earns bonus points!

3. **Test Verification Flow**:
   - View existing reports → "Verify This Report"
   - Submit verification photo → AI ensures it matches the original report
   - Earn points for successful AI-verified verifications

## 🤖 AI Verification System

### **How It Works**

1. **Image Upload**: Photos uploaded to temporary Firebase Storage
2. **AI Analysis**: OpenAI Vision API analyzes image against report description
3. **Verification**: AI determines if photo matches reported condition
4. **Feedback**: Users receive detailed feedback and confidence scores
5. **Storage**: Verified photos moved to permanent storage, others deleted

### **Supported Report Types**

- **Court Conditions**: crowded, empty, partially occupied
- **Surface Issues**: slippery floor, wet court, damaged surface
- **Equipment Problems**: broken hoop, missing net, damaged backboard
- **Environmental**: poor lighting, court closed, no lighting
- **Cleanliness**: dirty court, trash on court, well-maintained

### **AI Verification Features**

- **Basketball Court Detection**: Ensures photos show actual basketball courts
- **Condition Matching**: Verifies reported conditions are visible
- **Confidence Scoring**: Provides 0-100% confidence ratings
- **Detailed Feedback**: Explains verification decisions to users
- **Error Handling**: Graceful degradation when AI is unavailable

### **Cost Optimization**

- **Request Deduplication**: Prevents duplicate API calls
- **Rate Limiting**: 20 requests/minute, 100 requests/hour
- **Image Compression**: Automatic compression before analysis
- **Smart Caching**: Temporary storage with automatic cleanup

## 🏆 Gamification System

### **Point Structure**
- **Report Submission**: 10 base points
- **Report Verification**: 15 base points
- **AI Verification Bonus**: +5 points per verified photo
- **Game Creation**: 10 points
- **Game Participation**: 5 points

### **Community Benefits**
- Encourages accurate reporting
- Rewards quality photo submissions
- Builds trust through AI verification
- Promotes active community participation

## 🔧 Configuration

### **Firebase Setup**
1. Create Firebase project with Firestore, Storage, Authentication
2. Enable Google sign-in provider
3. Configure security rules for collections:
   - `basketballCourts/{courtId}/reports/{reportId}`
   - `basketballCourts/{courtId}/reports/{reportId}/verifications/{verificationId}`
   - `userProfiles/{userId}`

### **OpenAI API Setup**
1. Get API key from OpenAI platform
2. Add to environment variables
3. Monitor usage and costs in OpenAI dashboard
4. Adjust rate limits in `aiVisionService.ts` if needed

### **Google Maps Integration**
1. Enable Maps SDK and Places API
2. Configure API keys for iOS/Android
3. Set up billing account for production use

## 📱 Platform-Specific Features

### **iOS**
- Native Maps integration with custom markers
- Background location permissions for geofencing
- Push notifications for court events

### **Android** 
- Google Maps integration with clustering
- Background location with Android 12+ optimizations
- Material Design 3 components

## 🚢 Deployment

### **Expo Application Services (EAS)**
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for production
eas build --platform all --profile production

# Submit to app stores
eas submit --platform all
```

### **Environment Variables for Production**
- Set all `EXPO_PUBLIC_*` variables in EAS secrets
- Configure different Firebase projects for staging/production
- Monitor OpenAI API usage and set billing alerts

## 🔒 Security & Privacy

### **Data Protection**
- User photos stored securely in Firebase Storage
- Temporary images automatically deleted after verification
- No personal data shared with OpenAI API

### **API Security**
- Rate limiting prevents API abuse
- Request deduplication reduces costs
- Graceful degradation maintains functionality

### **User Privacy**
- Location data used only for geofencing
- Photos analyzed locally before API transmission
- User consent required for all data collection

## 📊 Monitoring & Analytics

### **Performance Metrics**
- AI verification success rates
- API response times and error rates
- User engagement with verified reports
- Point distribution and gamification effectiveness

### **Cost Monitoring**
- OpenAI API usage and costs
- Firebase Storage and Firestore usage
- Real-time alerts for budget overruns

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/ai-enhancement`)
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive error handling
- Include unit tests for AI verification logic
- Update README for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4V API powering our verification system
- **Firebase** for reliable backend infrastructure
- **Expo** for React Native development platform
- **Singapore Sports Community** for inspiration and feedback

---

**Built with ❤️ for the Singapore basketball community**

For questions, support, or feedback, please open an issue or contact the development team.
