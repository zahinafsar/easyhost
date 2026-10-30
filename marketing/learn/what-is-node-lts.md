# Which Node.js version should you use?

Node.js even-numbered releases become long-term support (LTS) versions, which receive fixes for an extended period.

## The short version

Node.js even-numbered releases become long-term support (LTS) versions, which receive fixes for an extended period. Production apps should use one that is still supported and test before moving between major versions. The `engines.node` field in `package.json` records what your app expects.

## On EasyHost

EasyHost supports Node 20, 22 and 24, and defaults to `engines.node` or 24. [Learn more](/docs/cli/build-set).
