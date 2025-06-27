// Browser-compatible secret helper
// In a real application, secrets should be fetched from your backend API
// This is a simplified version for the frontend

/**
 * Fetch a secret value from environment or backend API.
 * In production, this should call your backend API to get secrets securely.
 */
export async function getSecret(secretName: string): Promise<string> {
  // For browser environment, we'll use environment variables if available
  // or throw an error to request proper backend integration
  const envValue = import.meta.env[`VITE_${secretName}`];
  
  if (envValue) {
    return envValue;
  }
  
  // In production, this should make an API call to your backend
  throw new Error(`Secret not configured: ${secretName}. Please configure VITE_${secretName} environment variable or implement backend API call.`);
}
