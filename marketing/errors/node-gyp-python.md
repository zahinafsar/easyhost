# node-gyp fails: could not find Python

A native module has no prebuilt binary for Alpine, and the base image has no compiler toolchain.

## The error

```
gyp ERR! find Python
```

## Why it happens

A native module has no prebuilt binary for Alpine, and the base image has no compiler toolchain.

## How to fix it

Prefer a package with prebuilt musl binaries, such as `@node-rs/bcrypt` instead of `bcrypt`.

```
npm rm bcrypt
npm i @node-rs/bcrypt
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
