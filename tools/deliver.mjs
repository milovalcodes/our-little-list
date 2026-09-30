// Manual backstop. It calls the exact Cloudflare delivery pass, rather than
// maintaining a second sender that can drift on mute, focus or quiet hours.
// GitHub Actions does not schedule this file; run it only by hand.
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

globalThis.crypto ??= webcrypto;

function websiteConfig() {
  const config = readFileSync(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const pick = key => config.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1];
  const household = readFileSync(new URL('../household.js', import.meta.url), 'utf8');
  const householdId = household.match(/HOUSEHOLD_ID\s*=\s*'([^']+)'/)?.[1];
  if (!pick('apiKey') || !pick('projectId') || !householdId || householdId.startsWith('REPLACE_WITH')) {
    throw new Error('website Firebase or household config is incomplete');
  }
  return { FIREBASE_API_KEY: pick('apiKey'), FIREBASE_PROJECT_ID: pick('projectId'), HOUSEHOLD_ID: householdId };
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}. Add it to the repository Actions secrets.`);
  return value;
}

try {
  const { deliver } = await import('../worker/src/index.js');
  const result = await deliver({
    ...websiteConfig(),
    LITTLE_EMAIL: required('LITTLE_EMAIL'),
    LITTLE_PASSWORD: required('LITTLE_PASSWORD'),
    VAPID_PUBLIC_KEY: required('VAPID_PUBLIC_KEY'),
    VAPID_PRIVATE_KEY: required('VAPID_PRIVATE_KEY'),
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || `mailto:${process.env.LITTLE_EMAIL}`
  });
  console.log(JSON.stringify(result));
} catch (problem) {
  console.error(problem.message || problem);
  process.exitCode = 1;
}
