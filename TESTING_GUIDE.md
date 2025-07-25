# SingaSport Testing Guide

A comprehensive testing suite for the SingaSport basketball court finder app, covering all 7 major feature areas with **28 individual test cases** providing visual console output and detailed test scenarios.

## Test Categories Overview

### 1. Account Creation System (3 tests)
**File:** `src/services/__tests__/authService-test.js`  
**Coverage:** Authentication, user creation, validation, and security

**Test Details:**
- **Input Validation:** Email format, username rules, password strength, required fields
- **User Model Logic:** Default attributes assignment (points = 0, role = 'user')

### 2. Search and Map Feature System (3 tests)
**File:** `src/services/__tests__/searchMapService-test.js`  
**Coverage:** Court search, filtering, distance calculation, autocomplete

**Test Details:**
- **Search Filtering:** Text queries, status filters (open/closed), amenity filters (indoor/outdoor)
- **Distance Calculation:** Haversine formula implementation, edge cases, coordinate validation

### 3. Geofencing System (3 tests)
**File:** `src/services/__tests__/geofencingService-test.js`  
**Coverage:** Location detection, entry/exit events, notifications

**Test Details:**
- **Region Detection:** Point-in-polygon logic, multiple geofences, boundary edge cases
- **Entry/Exit Events:** State change detection, simultaneous entries/exits

### 4. User Contribution (Live Report) System (4 tests)
**File:** `src/services/__tests__/reportService-test.js`  
**Coverage:** Report validation, aggregation, voting, spam prevention

**Test Details:**
- **Input Validation:** Required fields, description length, issue type validation
- **Spam Prevention:** Rate limiting, time-based detection, content moderation

### 5. Game Scheduling (Community Engagement) System (4 tests)
**File:** `src/services/__tests__/gameSchedulingService-test.js`  
**Coverage:** Game creation, join/leave logic, notifications, cancellation

**Test Details:**
- **Game Creation Validation:** Required fields, time validation, player count limits
- **Join/Leave Logic:** Capacity checking, duplicate prevention, past game restrictions
- **Notification Logic:** Reminder scheduling (24h, 1h, 15min), timing accuracy
- **Cancellation Authorization:** Creator rights, admin permissions, past game prevention

### 6. User Profile and Points System (7 tests)
**File:** `src/utils/__tests__/userService-test.js`  
**Coverage:** User profile management, points awarding, profile creation

**Test Details:**
- **Profile Creation:** Default points initialization, required fields, user data validation
- **Points System:** Action-based point awarding, increment handling, user existence checks
- **Action Rewards:** Specific point values for different user actions (reports, games, verification)
- **Error Handling:** Non-existent users, invalid point amounts, database errors

### 7. AI Chatbot for Suggestions System (4 tests)
**File:** `src/services/__tests__/aiChatbotService-test.js`  
**Coverage:** Intent parsing, suggestions, fallbacks, session context

**Test Details:**
- **Input Parsing:** Intent classification, keyword extraction, confidence scoring
- **Suggestion Logic:** Preference-based filtering, court ranking, empty result handling
- **Fallback Handling:** Unknown input responses, consistent fallbacks, helpful guidance

## How to Run Tests

### Run All Tests
```bash
# Run the complete test suite with visual output
npm run test:all

# Alternative using the script directly
node scripts/run-all-tests.js
```

### Run Individual Test Suites
```bash
# Account Creation tests
npm run test:auth

# Search and Map tests
npm run test:search

# Geofencing tests
npm run test:geofencing

# User Contribution (Reports) tests
npm run test:reports

# Game Scheduling tests
npm run test:games

# User Profile and Points tests
npm run test:userprofile

# AI Chatbot tests
npm run test:chatbot
```

### Run Specific Test Suite by Number
```bash
# Run by test suite number (1-7)
node scripts/run-all-tests.js 1    # Account Creation
node scripts/run-all-tests.js 2    # Search and Map
node scripts/run-all-tests.js 3    # Geofencing
node scripts/run-all-tests.js 4    # User Contribution
node scripts/run-all-tests.js 5    # Game Scheduling
node scripts/run-all-tests.js 6    # User Profile & Points
node scripts/run-all-tests.js 7    # AI Chatbot
```

### Traditional Jest Commands
```bash
# Standard Jest with watch mode
npm test

# Run tests with coverage for CI/CD
npm run test:ci

# Run a specific test file directly
npx jest src/services/__tests__/authService-test.js
```

## Visual Test Output

The test suites provide rich visual feedback in the console:

### Console Output Features
- **Test Categories:** Clear section headers with labels and descriptions
- **Subtests:** Detailed breakdown of what each test validates
- **Pass/Fail Status:** Color-coded results (green [PASS] for pass, red [FAIL] for fail)
- **Progress Tracking:** Real-time test execution progress
- **Summary Reports:** Final statistics with timing and success rates

### Example Output
```
[TESTING]: Email Format Validation
==================================================
> Email: "valid@email.com" - Expected: Valid, Got: Valid
[PASS] Email validation correct
> Email: "invalid-email" - Expected: Invalid, Got: Invalid
[PASS] Email validation correct
```

## Test Structure and Patterns

### Mocking Strategy
All tests use comprehensive mocking for:
- **Firebase Services:** Firestore, Auth, Storage
- **External APIs:** OpenAI, Google Maps, Location services
- **React Native Modules:** AsyncStorage, Notifications, Image Picker

### Test Organization
Each test file follows this structure:
1. **Mock Setup:** Import and configure all necessary mocks
2. **Helper Functions:** Visual logging utilities for clear output
3. **Service Implementation:** Mock service logic for testing
4. **Test Suites:** Organized by feature area with descriptive names
5. **Cleanup:** AfterAll summaries and completion messages

### Visual Logging Helpers
```javascript
logTestStart('Feature Name')     // Test section header
logSubtest('Test description')   // Individual test description  
logTestResult(passed, message)   // Pass/fail with color coding
```

## Debugging and Troubleshooting

### Common Issues

#### 1. **"Cannot log after tests are done"**
- **Cause:** Async operations continuing after test completion
- **Solution:** Ensure all async operations are properly awaited
- **Example Fix:** Add `await` to all async service calls

#### 2. **Mock Function Errors**
- **Cause:** Mocks not properly reset between tests
- **Solution:** `jest.clearAllMocks()` in `beforeEach`

#### 3. **Import/Module Resolution Issues**
- **Cause:** Incorrect mock paths or circular dependencies
- **Solution:** Check mock declarations are before imports

### Test Debugging Commands
```bash
# Run with extra verbose output
npx jest --verbose --no-coverage

# Debug a specific test
npx jest --testNamePattern="specific test name"

# Run tests in band (no parallel execution)
npx jest --runInBand
```

## Test Coverage Goals

### Current Coverage Areas
- **User Authentication:** 100% of auth flows
- **Input Validation:** All form validation rules
- **Business Logic:** Core feature algorithms
- **Error Handling:** Exception scenarios and edge cases
- **Integration Points:** Service interactions

### Quality Metrics
- **Visual Feedback:** Every test provides clear console output
- **Real-world Scenarios:** Tests mirror actual user interactions
- **Edge Case Coverage:** Boundary conditions and error states
- **Performance Validation:** Efficiency checks for algorithms

## Continuous Integration

### CI/CD Integration
```bash
# Production-ready test command
npm run test:ci
```

This command:
- Runs all tests without watch mode
- Generates coverage reports
- Provides verbose output for CI logs
- Exits with proper status codes

### Pre-deployment Checklist
1. All 7 test suites pass
2. No console errors or warnings
3. Visual output confirms expected behavior
4. Edge cases properly handled
5. Error scenarios covered

## Conclusion

This comprehensive test suite ensures SingaSport's reliability and quality across all major features with **28 individual test cases** spanning **7 test suites**. The visual console output makes it easy to understand what's being tested and identify any issues quickly.

**Test Coverage Breakdown:**
- 🔐 **Account Creation:** covering authentication and user creation
- 🗺️ **Search & Map:** covering court search and location features  
- 📍 **Geofencing:** covering location detection and notifications
- 📝 **User Reports:** covering report submission and voting
- 🏀 **Game Scheduling:** covering game creation and participation
- 👤 **User Profile & Points:** covering profile management and points system
- 🤖 **AI Chatbot:** covering intent parsing and suggestions

**Ready to test?** Run `npm run test:all` to get started! 
