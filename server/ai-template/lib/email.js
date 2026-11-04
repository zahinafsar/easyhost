const env = process.env;

export const emailReady = Boolean(env.EASYHOST_API_KEY && env.EMAIL_FROM && env.EASYHOST_EMAIL_URL);

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!emailReady) {
    throw new Error("Email is not configured");
  }
  const res = await fetch(env.EASYHOST_EMAIL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EASYHOST_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Email failed with status ${res.status}`);
  }
  return data;
};
