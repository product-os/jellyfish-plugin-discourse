#!/usr/bin/env bash

npx jest --forceExit test/integration/index.spec.ts && \
	npx jest --runInBand --forceExit test/integration/translate.spec.ts
