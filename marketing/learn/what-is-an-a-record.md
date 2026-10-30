# What is a DNS A record?

An A record maps a hostname directly to an IPv4 address.

## The short version

An A record maps a hostname directly to an IPv4 address. It is the most basic DNS record, and it works at the root of a domain, where a CNAME is not allowed. If the server's address changes, you need to update the record by hand, so prefer a CNAME where you can.

## On EasyHost

`ezhst domains list` shows the IP to use for a root domain. [Learn more](/products/custom-domains).
