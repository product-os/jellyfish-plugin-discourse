# Jellyfish Discourse Plugin

Provides a sync integration for Discourse.

# Usage

Below is an example how to use this library:

```js
import { cardMixins } from '@balena/jellyfish-core';
import { DiscoursePlugin } from '@balena/jellyfish-plugin-discourse';

const plugin = new DiscoursePlugin();

// Load cards from this plugin, can use custom mixins
const cards = plugin.getCards(context, cardMixins);
console.dir(cards);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-plugin-discourse

# Testing

Unit tests can be easily run with the command `npm test`.

The integration tests require Postgres and Redis instances. The simplest way to run the tests locally is with `docker-compose`.

```
$ git secret reveal
$ npm run test:compose
```

You can also run tests locally against Postgres and Redis instances running in `docker-compose`:
```
$ git secret reveal
$ npm run compose
$ export INTEGRATION_DISCOURSE_TOKEN=$(cat .balena/secrets/integration_discourse_token)
$ export INTEGRATION_DISCOURSE_USERNAME=$(cat .balena/secrets/integration_discourse_username)
$ export INTEGRATION_DISCOURSE_SIGNATURE_KEY=$(cat .balena/secrets/integration_discourse_signature_key)
$ REDIS_HOST=localhost POSTGRES_HOST=localhost npx jest test/integration/sync/discourse.spec.ts
```

You can also access these Postgres and Redis instances:
```
$ PGPASSWORD=docker psql -hlocalhost -Udocker
$ redis-cli -h localhost
```
