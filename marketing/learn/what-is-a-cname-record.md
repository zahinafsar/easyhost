# What is a CNAME record?

A CNAME record makes one hostname an alias of another, so `www.example.com` can follow `my-app.easyhost.fun`.

## The short version

A CNAME record makes one hostname an alias of another, so `www.example.com` can follow `my-app.easyhost.fun`. If the target's IP address changes, your record keeps working. Standard DNS does not allow a CNAME at a root domain, such as `example.com`, which is why root domains usually use an A record.

## On EasyHost

Use a CNAME for subdomains on EasyHost. [Learn more](/products/custom-domains).
