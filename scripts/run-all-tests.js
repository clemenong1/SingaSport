#!/usr/bin/env node

// Test runner script for SingaSport comprehensive test suite
// Runs all 7 test categories with visual output and summaries

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test suites configuration
const testSuites = [
  {
    name: 'Account Creation',
    file: 'src/services/__tests__/authService-test.js',
    icon: '[AUTH]',
    description: 'Authentication, user creation, validation, and security'
  },
  {
    name: 'Search and Map Feature',
    file: 'src/services/__tests__/searchMapService-test.js',
    icon: '[SEARCH]',
    description: 'Court search, filtering, distance calculation, autocomplete'
  },
  {
    name: 'Geofencing',
    file: 'src/services/__tests__/geofencingService-test.js',
    icon: '[GEO]',
    description: 'Location detection, entry/exit events, notifications'
  },
  {
    name: 'User Contribution (Reports)',
    file: 'src/services/__tests__/reportService-test.js',
    icon: '[REPORTS]',
    description: 'Report validation, aggregation, voting, spam prevention'
  },
  {
    name: 'Game Scheduling',
    file: 'src/services/__tests__/gameSchedulingService-test.js',
    icon: '[GAMES]',
    description: 'Game creation, join/leave logic, notifications, cancellation'
  },
  {
    name: 'User Profile & Points',
    file: 'src/utils/__tests__/userService-test.js',
    icon: '[USER]',
    description: 'User profile management, points awarding, profile creation'
  },
  {
    name: 'AI Chatbot',
    file: 'src/services/__tests__/aiChatbotService-test.js',
    icon: '[AI]',
    description: 'Intent parsing, suggestions, fallbacks, session context'
  }
];

// Utility functions
function printHeader(text, icon = '[TEST]') {
  const line = '='.repeat(60);
  console.log(`\n${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${icon} ${text}${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}\n`);
}

function printSubHeader(text, icon = '[INFO]') {
  console.log(`${colors.yellow}${icon} ${text}${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(40)}${colors.reset}`);
}

function printSuccess(text) {
  console.log(`${colors.green}[PASS] ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}[FAIL] ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.blue}[INFO] ${text}${colors.reset}`);
}

function printTestSuiteInfo(suite, index) {
  console.log(`${colors.bright}${suite.icon} ${index + 1}. ${suite.name}${colors.reset}`);
  console.log(`   ${colors.dim}${suite.description}${colors.reset}`);
  console.log(`   ${colors.dim}File: ${suite.file}${colors.reset}\n`);
}

// Main execution function
async function runAllTests() {
  const startTime = Date.now();
  
  printHeader('SINGASPORT COMPREHENSIVE TEST SUITE', '[TEST]');
  
  console.log(`${colors.bright}Testing Framework:${colors.reset} Jest with Expo preset`);
  console.log(`${colors.bright}Test Suites:${colors.reset} ${testSuites.length} categories`);
  console.log(`${colors.bright}Visual Output:${colors.reset} Enabled with detailed console logs\n`);
  
  // Check if we should run individual suites or all
  const args = process.argv.slice(2);
  const runSpecific = args.length > 0 && args[0] !== 'all';
  
  if (runSpecific) {
    const suiteNumber = parseInt(args[0]);
    if (suiteNumber >= 1 && suiteNumber <= testSuites.length) {
      await runSingleTestSuite(testSuites[suiteNumber - 1], suiteNumber);
      return;
    } else {
      printError(`Invalid test suite number. Please use 1-${testSuites.length} or 'all'`);
      printAvailableTests();
      return;
    }
  }
  
  printSubHeader('Available Test Suites');
  testSuites.forEach((suite, index) => {
    printTestSuiteInfo(suite, index);
  });
  
  console.log(`${colors.yellow}[START] Starting test execution...${colors.reset}\n`);
  
  const results = [];
  
  // Run each test suite
  for (let i = 0; i < testSuites.length; i++) {
    const suite = testSuites[i];
    const result = await runSingleTestSuite(suite, i + 1);
    results.push(result);
    
    // Add spacing between test suites
    if (i < testSuites.length - 1) {
      console.log('\n' + '─'.repeat(60) + '\n');
    }
  }
  
  // Print final summary
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  printFinalSummary(results, totalTime);
}

async function runSingleTestSuite(suite, index) {
  const startTime = Date.now();
  
  printSubHeader(`Running ${suite.name} Tests`, suite.icon);
  console.log(`${colors.dim}${suite.description}${colors.reset}\n`);
  
  try {
    // Run the specific test file
    const command = `npx jest "${suite.file}" --verbose --no-coverage`;
    
    console.log(`${colors.dim}Command: ${command}${colors.reset}\n`);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    printSuccess(`${suite.name} tests completed in ${duration}s`);
    
    return { 
      name: suite.name, 
      success: true, 
      duration: parseFloat(duration),
      icon: suite.icon
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    printError(`${suite.name} tests failed after ${duration}s`);
    
    return { 
      name: suite.name, 
      success: false, 
      duration: parseFloat(duration),
      icon: suite.icon,
      error: error.message
    };
  }
}

function printFinalSummary(results, totalTime) {
  printHeader('TEST EXECUTION SUMMARY', '[SUMMARY]');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalTests = results.length;
  
  // Overall stats
  console.log(`${colors.bright}[STATS] Overall Results:${colors.reset}`);
  console.log(`   Total Test Suites: ${totalTests}`);
  console.log(`   ${colors.green}Successful: ${successful.length}${colors.reset}`);
  console.log(`   ${colors.red}Failed: ${failed.length}${colors.reset}`);
  console.log(`   Total Time: ${totalTime}s\n`);
  
  // Individual results
  console.log(`${colors.bright}[RESULTS] Individual Results:${colors.reset}`);
  results.forEach((result, index) => {
    const status = result.success ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    const time = `${result.duration}s`;
    console.log(`   ${result.icon} ${index + 1}. ${result.name}: ${status} (${time})`);
  });
  
  if (failed.length > 0) {
    console.log(`\n${colors.bright}[FAILED] Failed Test Suites:${colors.reset}`);
    failed.forEach(result => {
      console.log(`   ${result.icon} ${result.name}`);
      if (result.error) {
        console.log(`      ${colors.dim}Error: ${result.error}${colors.reset}`);
      }
    });
  }
  
  // Final status
  if (failed.length === 0) {
    printSuccess(`All ${totalTests} test suites passed!`);
    console.log(`\n${colors.green}${colors.bright}[READY] SingaSport is ready for production!${colors.reset}`);
  } else {
    printError(`${failed.length} out of ${totalTests} test suites failed`);
    console.log(`\n${colors.yellow}[ACTION] Please fix failing tests before deployment${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printAvailableTests() {
  printSubHeader('Available Test Suites');
  testSuites.forEach((suite, index) => {
    console.log(`   ${index + 1}. ${suite.icon} ${suite.name}`);
  });
  console.log(`\nUsage: node scripts/run-all-tests.js [1-${testSuites.length}|all]`);
  console.log(`Examples:`);
  console.log(`   node scripts/run-all-tests.js     # Run all tests`);
  console.log(`   node scripts/run-all-tests.js 1   # Run only Account Creation tests`);
  console.log(`   node scripts/run-all-tests.js 3   # Run only Geofencing tests`);
}

// Handle script arguments and execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printHeader('SINGASPORT TEST RUNNER HELP', '[HELP]');
    printAvailableTests();
    process.exit(0);
  }
  
  runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      printError(`Unexpected error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  runSingleTestSuite,
  testSuites
}; 