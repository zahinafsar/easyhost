# What is a lockfile?

A lockfile records the exact version of every installed package, including nested ones.

## The short version

A lockfile records the exact version of every installed package, including nested ones. It keeps builds reproducible, so production gets the same code you tested. Commit it to your repository. Commands such as `npm ci` fail if it disagrees with `package.json`, which catches accidental drift.

## On EasyHost

EasyHost picks your package manager from the lockfile it finds. [Learn more](/guides).
