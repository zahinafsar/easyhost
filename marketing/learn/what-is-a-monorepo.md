# What is a monorepo?

A monorepo keeps several apps and packages in one repository, usually with one lockfile at the root.

## The short version

A monorepo keeps several apps and packages in one repository, usually with one lockfile at the root. Shared code is easier to change, but deployment needs to know which folder to build. Tools such as Turborepo and Nx add caching and task ordering on top of workspaces.

## On EasyHost

Set the app folder with `ezhst build set --root-dir`, and install still runs where the lockfile is. [Learn more](/docs/cli/build-set).
