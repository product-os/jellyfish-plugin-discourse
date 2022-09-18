# Jellyfish Discourse Plugin

Provides a sync integration for Discourse.

# Usage

Below is an example how to use this library:

```typescript
import { discoursePlugin } from '@balena/jellyfish-plugin-discourse';
import { PluginManager } from '@balena/jellyfish-worker';

// Load contracts from this plugin
const pluginManager = new PluginManager([discoursePlugin()]);
const contracts = pluginManager.getCards();
console.dir(contracts);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-plugin-discourse

# Testing

Unit tests can be easily run with the command `npm test`.

You can run integration tests locally against Postgres and Redis instances running in `docker-compose`:
```bash
git submodule update --init
git secret reveal -f
npm run compose
export INTEGRATION_DISCOURSE_TOKEN=$(cat .balena/secrets/integration_discourse_token)
export INTEGRATION_DISCOURSE_USERNAME=$(cat .balena/secrets/integration_discourse_username)
REDIS_HOST=localhost POSTGRES_HOST=localhost npx jest test/integration/mirror.spec.ts
```

You can also access these Postgres and Redis instances:
```bash
PGPASSWORD=docker psql -hlocalhost -Udocker
redis-cli -h localhost
```
