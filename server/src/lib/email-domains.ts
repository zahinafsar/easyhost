export const emailDomain = (email: string) => email.toLowerCase().split("@").pop() ?? "";
