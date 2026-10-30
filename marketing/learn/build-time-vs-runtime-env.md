# Build-time vs runtime environment variables

Build-time variables are read while your app compiles, and their values get baked into the output.

## The short version

Build-time variables are read while your app compiles, and their values get baked into the output. Runtime variables are read each time the server runs. Frameworks inline public variables, such as `NEXT_PUBLIC_` ones, at build time, so changing them requires a rebuild. Never put secrets in a public variable, because they end up in browser code.

## On EasyHost

EasyHost passes your variables to both the build and the running container. [Learn more](/frameworks).
