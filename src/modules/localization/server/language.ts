import "server-only";
import { cookies } from "next/headers";
import { isLanguage, type LanguageCode } from "@/src/modules/localization/domain/regions";
import { LANGUAGE_COOKIE } from "@/src/modules/localization/server/preferences";
import { translate } from "@/src/modules/localization/domain/translations";

export async function getInterfaceLanguage(): Promise<LanguageCode> { const value = (await cookies()).get(LANGUAGE_COOKIE)?.value ?? "en"; return isLanguage(value) ? value : "en"; }
export async function getTranslator() { const language = await getInterfaceLanguage(); return { language, t: (message: string) => translate(language, message) }; }
