# What is an environment variable?

An environment variable is a named value given to a process when it starts.

## The short version

An environment variable is a named value given to a process when it starts. Apps use them for configuration that changes between environments, especially secrets such as API keys. Keeping them outside your code means they stay out of your repository, and the same build logic can run with different settings.

## On EasyHost

`.env` files are never uploaded. Use `ezhst env set` or `ezhst env import`. [Learn more](/docs/cli/env-set).
