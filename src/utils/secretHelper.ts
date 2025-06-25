// Secure secret fetcher using AWS Secrets Manager
import AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Fetch a secret value from AWS Secrets Manager by name.
 * Throws if the secret is not found.
 */
export async function getSecret(secretName: string): Promise<string> {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  if ('SecretString' in data && data.SecretString) {
    return data.SecretString;
  }
  throw new Error(`Secret not found: ${secretName}`);
}
