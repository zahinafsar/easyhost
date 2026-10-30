# Connect a Cloudflare domain to EasyHost

Add one DNS record at Cloudflare, verify it, and EasyHost issues the HTTPS certificate.

## Add the domain to your app

```
npx ezhst domains add www.example.com
npx ezhst domains list
```

## Create the record at Cloudflare

In Cloudflare, open DNS, then Records.

| Domain | Type | Value |
| --- | --- | --- |
| Subdomain, like `www.example.com` | CNAME | `<slug>.easyhost.fun` |
| Root domain, like `example.com` | A | Server IP from `ezhst domains list` |

Set the record to DNS only (grey cloud) until `ezhst domains verify` succeeds, so EasyHost can see your record and issue the certificate.

## Verify

```
dig +short www.example.com
npx ezhst domains verify www.example.com
```

If verification fails, see [domain verification fails](/errors/domain-verify-failed). Also see the [custom domains product page](/products/custom-domains).

## Frequently asked questions

### How long does it take?

Often minutes, but DNS changes can take longer to propagate, depending on the record's TTL. Run verify again if the first try fails.
