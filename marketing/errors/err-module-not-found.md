# ERR_MODULE_NOT_FOUND on startup

ES modules need full file extensions, and TypeScript does not always add them.

## The error

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module imported from dist/index.js
```

## Why it happens

ES modules need full file extensions, and TypeScript does not always add them.

## How to fix it

Use `.js` extensions in relative imports, or bundle with a tool such as `tsup`.

```
import { db } from "./db.js";
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
