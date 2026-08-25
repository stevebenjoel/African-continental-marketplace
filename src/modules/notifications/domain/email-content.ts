const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export function registrationWelcomeEmail(input: { name: string; accountUrl: string }) {
  const name = input.name.trim() || "there";
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(input.accountUrl);
  return {
    subject: "Welcome to PAC-SM",
    text: `Hello ${name},\n\nWelcome to the Pan-African Continental Super Marketplace. Verify your email from the separate verification message, then manage your account at ${input.accountUrl}.\n\nPAC-SM`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17211b"><h1 style="color:#087443">Welcome to PAC-SM</h1><p>Hello ${safeName},</p><p>Your Pan-African Continental Super Marketplace account has been created.</p><p>Use the separate verification message to confirm your email address. After verification, you can shop, register a business, or begin seller onboarding.</p><p><a href="${safeUrl}" style="display:inline-block;background:#087443;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Open my account</a></p><p style="font-size:13px;color:#5d685f">PAC-SM will never ask you to send your password by email.</p></div>`
  };
}
