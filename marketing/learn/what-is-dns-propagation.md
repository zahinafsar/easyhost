# What is DNS propagation?

DNS propagation is the delay before a DNS change is seen everywhere.

## The short version

DNS propagation is the delay before a DNS change is seen everywhere. Resolvers cache records for as long as the record's TTL says, so old answers can remain until it expires. Lowering the TTL before a planned change shortens the wait. Checking with `dig` shows what your resolver currently sees.

## On EasyHost

If `ezhst domains verify` fails right after a change, wait and try again. [Learn more](/products/custom-domains).
