# localhost vs 0.0.0.0

Binding to `localhost` accepts connections only from the same machine or container.

## The short version

Binding to `localhost` accepts connections only from the same machine or container. Binding to `0.0.0.0` accepts them on every network interface. Inside a container, traffic arrives from outside, so an app bound to localhost looks healthy in its logs yet never receives a request. This is among the most common deploy problems.

## On EasyHost

EasyHost sets `HOST=0.0.0.0`, though some frameworks ignore it unless you pass it to `listen`. [Learn more](/errors/app-not-listening).
