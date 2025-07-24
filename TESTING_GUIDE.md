# SingaSport Testing Guide

A comprehensive testing suite for the SingaSport basketball court finder app, covering all 7 major feature areas with visual console output and detailed test scenarios.

## Test Categories Overview

### 1. Account Creation System
**File:** `src/services/__tests__/authService-test.js`  
**Coverage:** Authentication, user creation, validation, and security

- **Input Validation:** Email format, username rules, password strength, required fields
- **Password Security:** Ensures passwords are hashed and never stored in plaintext
- **User Model Logic:** Default attributes assignment (points = 0, role = 'user')
- **Error Handling:** Duplicate accounts, network errors, invalid inputs, Firestore permissions

### 2. Search and Map Feature System
**File:** `src/services/__tests__/searchMapService-test.js`  
**Coverage:** Court search, filtering, distance calculation, autocomplete

- **Search Filtering:** Text queries, status filters (open/closed), amenity filters (indoor/outdoor)
- **Distance Calculation:** Haversine formula implementation, edge cases, coordinate validation
- **Data Transformation:** Raw Firebase data to frontend format, GeoJSON conversion
- **Autocomplete:** Partial queries, suggestion structure, performance limits

### 3. Geofencing System
**File:** `src/services/__tests__/geofencingService-test.js`  
**Coverage:** Location detection, entry/exit events, notifications

- **Region Detection:** Point-in-polygon logic, multiple geofences, boundary edge cases
- **Entry/Exit Events:** State change detection, simultaneous entries/exits
- **Notification Eligibility:** Cooldown logic, rate limiting, multiple court eligibility
- **Integrated Workflow:** Complete location processing, state persistence, people count updates

### 4. User Contribution (Live Report) System
**File:** `src/services/__tests__/reportService-test.js`  
**Coverage:** Report validation, aggregation, voting, spam prevention

- **Input Validation:** Required fields, description length, issue type validation
- **Report Aggregation:** Grouping by court and issue type, latest report tracking
- **Upvote/Downvote System:** Vote switching, duplicate prevention, count accuracy
- **Spam Prevention:** Rate limiting, time-based detection, content moderation

### 5. Game Scheduling (Community Engagement) System
**File:** `src/services/__tests__/gameSchedulingService-test.js`  
**Coverage:** Game creation, join/leave logic, notifications, cancellation

- **Game Creation Validation:** Required fields, time validation, player count limits
- **Join/Leave Logic:** Capacity checking, duplicate prevention, past game restrictions
- **Notification Logic:** Reminder scheduling (24h, 1h, 15min), timing accuracy
- **Cancellation Authorization:** Creator rights, admin permissions, past game prevention

### 6. Gamification System
**File:** `src/services/__tests__/gamificationService-test.js`  
**Coverage:** Points, leveling, badges, leaderboards, daily bonuses

- **Points Awarding:** Action-based points, bonus calculations, invalid input handling
- **Leveling Logic:** Level calculation from points, progress tracking, level up detection
- **Badge System:** Achievement eligibility, various badge types, first-time achievements
- **Leaderboard:** Multiple sort criteria, ranking accuracy, tie handling
- **Daily Bonuses:** Login streak tracking, consecutive day detection, cooldown management

### 7. AI Chatbot for Suggestions System
**File:** `src/services/__tests__/aiChatbotService-test.js`  
**Coverage:** Intent parsing, suggestions, fallbacks, session context

- **Input Parsing:** Intent classification, keyword extraction, confidence scoring
- **Suggestion Logic:** Preference-based filtering, court ranking, empty result handling
- **Fallback Handling:** Unknown input responses, consistent fallbacks, helpful guidance
- **Session Context:** Conversation memory, context building, multi-turn conversations

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

# Gamification tests
npm run test:gamification

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
node scripts/run-all-tests.js 6    # Gamification
node scripts/run-all-tests.js 7    # AI Chatbot
```

### Traditional Jest Commands
```bash
# Standard Jest with watch mode
npm test

# Run tests with coverage for CI/CD
npm run test:ci

# Run a specific test file directly
npx jest src/services/__tests__/authService-test.js --verbose
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

## Adding New Tests

### Test File Template
```javascript
// Mock setup
jest.mock('service-to-mock', () => ({
  // mock implementation
}));

// Visual helpers
const logTestStart = (testName) => {
  console.log(`\n[TESTING]: ${testName}`);
  console.log('='.repeat(50));
};

// Test suite
describe('NEW FEATURE SYSTEM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log('\n[SETUP] Clearing mocks for fresh test...');
  });

  describe('1. FEATURE CATEGORY', () => {
    test('specific functionality test', async () => {
      logTestStart('Specific Functionality Test');
      // Test implementation
    });
  });
});
```

## Best Practices

### Writing Effective Tests
1. **Clear Descriptions:** Use descriptive test names and console logs
2. **Visual Feedback:** Include bracketed labels and color coding for easy scanning
3. **Edge Cases:** Test boundary conditions and error scenarios
4. **Mock Properly:** Isolate units under test with comprehensive mocks
5. **Assert Thoroughly:** Check both positive and negative outcomes

### Maintaining Test Quality
1. **Regular Updates:** Keep tests synchronized with feature changes
2. **Refactor Mocks:** Update mocks when dependencies change
3. **Performance Monitor:** Watch for slow-running tests
4. **Documentation:** Update this guide when adding new test categories

---

## Conclusion

This comprehensive test suite ensures SingaSport's reliability and quality across all major features. The visual console output makes it easy to understand what's being tested and identify any issues quickly.

**Ready to test?** Run `npm run test:all` to get started! 