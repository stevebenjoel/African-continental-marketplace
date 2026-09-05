export const COOKIE_CONSENT_NAME="pacsm_cookie_consent";
export const COOKIE_CONSENT_VERSION=1;
export type CookieConsent=Readonly<{version:1;necessary:true;preferences:boolean;analytics:boolean;advertising:boolean;updatedAt:string}>;
export const newCookieConsent=(selection:{preferences:boolean;analytics:boolean;advertising:boolean},updatedAt=new Date().toISOString()):CookieConsent=>({version:COOKIE_CONSENT_VERSION,necessary:true,...selection,updatedAt});
export function serializeCookieConsent(consent:CookieConsent){return encodeURIComponent(JSON.stringify(consent))}
export function parseCookieConsent(value:string|undefined):CookieConsent|undefined{if(!value)return;try{const data=JSON.parse(decodeURIComponent(value)) as Partial<CookieConsent>;if(data.version!==COOKIE_CONSENT_VERSION||data.necessary!==true||typeof data.preferences!=="boolean"||typeof data.analytics!=="boolean"||typeof data.advertising!=="boolean"||typeof data.updatedAt!=="string"||!Number.isFinite(Date.parse(data.updatedAt)))return;return data as CookieConsent}catch{return}}
