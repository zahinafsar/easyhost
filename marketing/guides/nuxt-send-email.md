# Send email from Nuxt

Send password resets and welcome emails from Nuxt with one HTTP request. There is no SMTP server or SDK to set up.

## Create a sender and API key

```
npx ezhst email sender create acme
npx ezhst keys create production --json
npx ezhst env set EASYHOST_API_KEY=<key>
npx ezhst redeploy
```

Your address becomes `acme@easyhost.fun`. The key is shown only once.

## Send from a route

```server/api/welcome.post.ts
export default defineEventHandler(async (event) => {
  const res = await fetch("https://api.easyhost.fun/api/v1/email/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EASYHOST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "acme@easyhost.fun",
      to: "ada@example.com",
      subject: "Welcome",
      text: "Thanks for signing up.",
    }),
  });
  return { sent: res.ok };
});
```

Protect this route in a real app, and take the recipient from your own data.

## Limits

- 20 successful sends per project over a rolling 24 hours
- One sender per project, on the `easyhost.fun` domain
- HTTP 503 with a pause message if the [shared provider quota is reached](/errors/email-paused)

See the [Nuxt hub](/frameworks/nuxt) for every Nuxt guide, or [free Nuxt hosting](/free-nuxt-hosting) for what is included. See also the [email product page](/products/email).

## Frequently asked questions

### Can I send from my own domain?

No. Senders use `<username>@easyhost.fun`.
