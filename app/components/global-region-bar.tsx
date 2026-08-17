import { headers } from "next/headers";
import RegionalSelector from "@/app/components/regional-selector";
import { getRegionalPreferences } from "@/src/modules/localization/server/preferences";
import { translate } from "@/src/modules/localization/domain/translations";

export default async function GlobalRegionBar() {
  const [preferences, headerStore] = await Promise.all([getRegionalPreferences(), headers()]);
  const path = headerStore.get("x-pathname") ?? "/";
  const t = (message: string) => translate(preferences.language, message);
  const labels = { deliverTo:t("Deliver to"), language:t("Language"), currency:t("Currency"), preferredLanguage:t("Preferred language"), preferredCurrency:t("Preferred currency"), currencyGroup:t("African and global currencies") };
  return <aside className="global-region-bar"><span className="region-message">🌍 {t("One market. One continent. Local to you.")} <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a></span><RegionalSelector {...preferences} labels={labels} returnTo={path} /></aside>;
}
