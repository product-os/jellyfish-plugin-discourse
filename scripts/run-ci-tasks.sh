#!/usr/bin/env bash

# Run tasks
scripts/delete-test-data.js || true
npm run test:integration
