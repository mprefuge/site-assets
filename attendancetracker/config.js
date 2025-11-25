/**
 * Configuration file for attendance tracker
 * Supports environment variables and GitHub secrets through process.env
 * Falls back to default values if environment variables are not set
 */

// Helper function to get environment variable or default value
function getEnvVar(key, defaultValue) {
  // In browser environment, check if variables are injected globally
  if (typeof window !== 'undefined' && window.ATTENDANCE_CONFIG) {
    return window.ATTENDANCE_CONFIG[key] !== undefined ? window.ATTENDANCE_CONFIG[key] : defaultValue;
  }
  // In Node.js environment, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] !== undefined ? process.env[key] : defaultValue;
  }
  return defaultValue;
}

// Configuration object
const attendanceConfig = {
  // API Configuration - use GitHub secrets for sensitive endpoints
  api: {
    // Main attendance tracker endpoint
    endpoint: getEnvVar('ENDPOINT', '')
  },
  
  // Style Configuration
  styles: {
    // Base URL for stylesheet resources
    styleEndpoint: getEnvVar('STYLEENDPOINT', '')
  }
};

// Export configuration for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = attendanceConfig;
} else if (typeof window !== 'undefined') {
  // Browser environment - attach to window object
  window.AttendanceConfig = attendanceConfig;
}
