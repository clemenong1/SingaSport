const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for the new src directory structure
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Add alias support for @ imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/constants': path.resolve(__dirname, 'src/constants'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/lib': path.resolve(__dirname, 'src/lib'),
};

module.exports = config;