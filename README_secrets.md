# Secure Secret Management

This project uses **AWS Secrets Manager** to securely store and retrieve all sensitive secrets and API keys at runtime.

## How it works
- Secrets are stored in AWS Secrets Manager, not in `.env` or code.
- The app fetches secrets at runtime using the helper in `src/utils/secretHelper.ts`.
- Secrets are decrypted in-memory only and never written to disk.

## Usage Example
```ts
import { getSecret } from './src/utils/secretHelper';

async function main() {
  const apiKey = await getSecret('my-api-key');
  // Use apiKey securely...
}
```

## Setup
1. Store your secrets in AWS Secrets Manager.
2. Set up AWS credentials and region for your app (see AWS SDK docs).
3. Replace all direct `process.env.SECRET` usages with `await getSecret('secret-name')`.

## Migration
- Remove all plaintext secrets from `.env` and code.
- Remove any TODOs about secret management.

---
For other cloud providers, use their respective SDKs and follow a similar pattern.
