// Browser-compatible stub for Node.js 'net' module
// This provides the isIP function that ccxt dependencies require

export function isIP(input) {
  // Simple IP validation for browser environment
  // Returns 0 for invalid, 4 for IPv4, 6 for IPv6
  if (typeof input !== 'string') return 0;
  
  // IPv4 regex pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex pattern (simplified)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  if (ipv4Pattern.test(input)) return 4;
  if (ipv6Pattern.test(input)) return 6;
  
  return 0;
}

// Export other net module functions as stubs if needed
export function isIPv4(input) {
  return isIP(input) === 4;
}

export function isIPv6(input) {
  return isIP(input) === 6;
}