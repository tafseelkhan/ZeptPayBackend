import crypto from 'crypto';
import ApiKey from '../models/Test/ApiKeys';

// 🔐 Random generator (premium)
const randomToken = (length = 32) =>
  crypto.randomBytes(length).toString('hex');

// 🔑 Build key like Stripe+
const buildKey = (
  type: 'pk-flixora' | 'sk-flixora',
  mode: 'test' | 'live'
) => {
  const rand = randomToken(24);
  return `${type}_${mode}_@zeptpay:tizzy-flixora-ecosystem_${rand}`;
};

export const createDefaultApiKeys = async (userId: string) => {
  const testKey = new ApiKey({
    userId,
    mode: 'test',
    label: 'This is your test key - use it for testing purposes only. do not use this key in production or share it with anyone. it is meant for development and testing environments only. remember to switch to your live key when you are ready to go live! here is a tip: keep your test keys secure and do not expose them publicly. consider using environment variables or a secrets manager to store them. if you believe your key has been compromised, regenerate it immediately.',
    publicKey: buildKey('pk-flixora', 'test'),
    secretKey: buildKey('sk-flixora', 'test'),
  });

  const liveKey = new ApiKey({
    userId,
    mode: 'live',
    label: 'This is your live key - handle with care! And do not share it with anyone. its like the password to your account. here is a tip: store it securely. this key allows access to your live environment, so keep it safe and do not expose it publicly. some more tips: consider using environment variables or a secrets manager to store it. if you believe your key has been compromised, regenerate it immediately. always use your live key in production environments only.',
    publicKey: buildKey('pk-flixora', 'live'),
    secretKey: buildKey('sk-flixora', 'live'),
  });

  await testKey.save();
  await liveKey.save();

  return {
    test: {
      publicKey: testKey.publicKey,
      secretKey: testKey.secretKey,
    },
    live: {
      publicKey: liveKey.publicKey,
      secretKey: liveKey.secretKey,
    },
  };
};
