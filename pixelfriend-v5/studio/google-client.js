'use strict';

function publisherRegistration(env) {
  const clientId = env.TOGGLE_GOOGLE_CLIENT_ID;
  const clientSecret = env.TOGGLE_GOOGLE_CLIENT_SECRET;
  if (typeof clientId !== 'string' || !/^[A-Za-z0-9.-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
      typeof clientSecret !== 'string' || !clientSecret.trim()) {
    throw new Error('The publisher must configure the Google Desktop client for this build.');
  }
  return { clientId, clientSecret };
}

module.exports = { publisherRegistration };
