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
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).default("PAC-SM <notifications@mail.africancontinentalmarketplace.store>"),
  RESEND_REPLY_TO_EMAIL: z.preprocess(value => value === "" ? undefined : value, z.email().optional()),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_PRODUCT_DRAFT_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_SUPPORT_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  RECONCILIATION_CRON_SECRET: z.string().min(24).optional()
  ,SUPPLIER_CREDENTIAL_ENCRYPTION_KEY: z.string().min(43).optional()
});

export type Environment = z.infer<typeof schema>;
let cached: Environment | undefined;

export function env(): Environment {
  cached ??= schema.parse(process.env);
  return cached;
}
