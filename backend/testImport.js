// Test import of SeatAvailabilityService
console.log('Starting test...');

try {
  const SeatAvailabilityService = require('./services/SeatAvailabilityService');
  console.log('Import successful!');
  console.log('Type:', typeof SeatAvailabilityService);
  console.log('Constructor?:', typeof SeatAvailabilityService === 'function');
  
} catch (error) {
  console.error('Import failed:', error.message);
}
