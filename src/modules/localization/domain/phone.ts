import { REGIONS, validCountry } from "./regions.ts";

export const COUNTRY_DIAL_CODES: Record<string, string> = {
  DZ:"213",AO:"244",BJ:"229",BW:"267",BF:"226",BI:"257",CV:"238",CM:"237",CF:"236",TD:"235",KM:"269",CD:"243",CG:"242",CI:"225",DJ:"253",EG:"20",GQ:"240",ER:"291",SZ:"268",ET:"251",GA:"241",GM:"220",GH:"233",GN:"224",GW:"245",KE:"254",LS:"266",LR:"231",LY:"218",MG:"261",MW:"265",ML:"223",MR:"222",MU:"230",MA:"212",MZ:"258",NA:"264",NE:"227",NG:"234",RW:"250",ST:"239",SN:"221",SC:"248",SL:"232",SO:"252",ZA:"27",SS:"211",SD:"249",TZ:"255",TG:"228",TN:"216",UG:"256",ZM:"260",ZW:"263",
  US:"1",CA:"1",GB:"44",FR:"33",PT:"351",ES:"34",AU:"61",CN:"86",JP:"81",IN:"91",AE:"971",SA:"966",BR:"55",CH:"41",SG:"65"
};

export const COUNTRY_OPTIONS = Object.entries(REGIONS).map(([code, region]) => ({ code, name: region.name, dialCode: COUNTRY_DIAL_CODES[code] })).filter(item => item.dialCode).sort((a,b) => a.name.localeCompare(b.name));

export function normalizePhoneToE164(value: string, phoneCountryCode: string): string {
  const country = phoneCountryCode.trim().toUpperCase();
  if (!validCountry(country)) throw new Error("INVALID_PHONE_COUNTRY");
  const raw = value.trim();
  if (!raw) throw new Error("INVALID_PHONE");
  const digits = raw.replace(/[^0-9]/g, "");
  const dialCode = COUNTRY_DIAL_CODES[country];
  if (!dialCode) throw new Error("UNSUPPORTED_PHONE_COUNTRY");
  if (raw.startsWith("+") && !digits.startsWith(dialCode)) throw new Error("PHONE_COUNTRY_MISMATCH");
  const normalized = raw.startsWith("+") ? digits : `${dialCode}${digits.replace(/^0+/, "")}`;
  if (!/^[1-9][0-9]{6,14}$/.test(normalized)) throw new Error("INVALID_PHONE");
  return `+${normalized}`;
}
