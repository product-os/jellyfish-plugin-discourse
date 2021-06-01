# Jellyfish Discourse Plugin

Provides a sync integration for Discourse.

# Usage

Below is an example how to use this library:

```js
import { cardMixins } from '@balena/jellyfish-core';
import DiscoursePlugin from '@balena/jellyfish-plugin-discourse';

const plugin = new DiscoursePlugin();

// Load cards from this plugin, can use custom mixins
const cards = plugin.getCards(context, cardMixins);
console.dir(cards);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-plugin-discourse/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-plugin-discourse
