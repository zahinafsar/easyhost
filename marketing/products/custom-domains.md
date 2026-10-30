# Custom domains

Point your domain at your app with a CNAME or A record, and EasyHost issues the certificate.

## What you get

- Subdomains use a CNAME to `<slug>.easyhost.fun`
- Root domains use an A record
- `ezhst domains verify` checks DNS, then issues HTTPS
- No charge for custom domains

## Try it

```
ezhst domains add www.example.com
ezhst domains list
ezhst domains verify www.example.com
```

## Limits

DNS must point at EasyHost before verification can succeed. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs#domains), or browse [guides by framework](/frameworks).
