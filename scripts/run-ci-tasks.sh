#!/usr/bin/env bash

# Set necessary environment variables
export INTEGRATION_DISCOURSE_TOKEN=$(cat /run/secrets/integration_discourse_token)
export INTEGRATION_DISCOURSE_USERNAME=$(cat /run/secrets/integration_discourse_username)

# Run tasks
scripts/delete-test-data.js || true
npm run test:integration
