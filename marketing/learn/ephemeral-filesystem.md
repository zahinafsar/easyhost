# What is an ephemeral filesystem?

An ephemeral filesystem is one that is lost when its container is replaced.

## The short version

An ephemeral filesystem is one that is lost when its container is replaced. Your app can write files, but they vanish at the next deploy. Temporary files are fine there. Anything that must last, such as uploads or SQLite databases, belongs in object storage or a managed database.

## On EasyHost

Use the project's S3 bucket and Postgres database for lasting data. [Learn more](/errors/file-disappeared).
