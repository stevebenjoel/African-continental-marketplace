import { COUNTRY_OPTIONS } from "@/src/modules/localization/domain/phone";
import { flagForCountry } from "@/src/modules/localization/domain/regions";

export function CountrySelect({ name="countryCode", label="Country", defaultValue="NG" }: { name?: string; label?: string; defaultValue?: string }) {
  return <label>{label}<select name={name} defaultValue={defaultValue} required>{COUNTRY_OPTIONS.map(country => <option value={country.code} key={country.code}>{flagForCountry(country.code)} {country.name}</option>)}</select></label>;
}

export function PhoneFields({ phoneName="phone", countryName="phoneCountryCode", defaultCountry="NG", label="Phone number" }: { phoneName?: string; countryName?: string; defaultCountry?: string; label?: string }) {
  return <><label>Telephone country<select name={countryName} defaultValue={defaultCountry} required>{COUNTRY_OPTIONS.map(country => <option value={country.code} key={country.code}>{flagForCountry(country.code)} {country.name} (+{country.dialCode})</option>)}</select></label><label>{label}<input name={phoneName} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="9066794666" required aria-describedby={`${phoneName}-help`}/><small id={`${phoneName}-help`}>Enter the local number; PAC-SM stores it securely in international format.</small></label></>;
}
