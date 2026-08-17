import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  APPWRITE_ENDPOINT: z.url(),
  APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_DATABASE_ID: z.string().min(1).default("pacsm-core"),
  APPWRITE_PROVISIONING_KEY: z.string().min(1).optional(),
  APPWRITE_PROVISIONING_KEY_FILE: z.string().min(1).optional(),
  APPWRITE_API_KEY: z.string().min(1).optional(),
  APPWRITE_API_KEY_FILE: z.string().min(1).optional(),
  APPWRITE_PRODUCT_MEDIA_BUCKET_ID: z.string().min(1),
  APPWRITE_KYC_BUCKET_ID: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default("pacsm_session"),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional()
});

export type Environment = z.infer<typeof schema>;
let cached: Environment | undefined;

export function env(): Environment {
  cached ??= schema.parse(process.env);
  return cached;
}
