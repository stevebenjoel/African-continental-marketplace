export function accountGreeting(name: string | null | undefined, email: string | null | undefined) {
  const firstName = name?.trim().split(/\s+/)[0] || email?.trim().split("@")[0] || "there";
  const safeName = firstName.replace(/[^\p{L}\p{N}'’-]/gu, "").slice(0, 30) || "there";
  return `Hello, ${safeName.charAt(0).toLocaleUpperCase()}${safeName.slice(1)}`;
}
