import {
  AE,
  AU,
  BR,
  CA,
  CH,
  CN,
  DE,
  ES,
  FR,
  GB,
  IN,
  IT,
  JP,
  KR,
  MX,
  PK,
  SA,
  SG,
  TR,
  US,
  ZA,
} from "country-flag-icons/react/3x2";

export const FLAG_COMPONENTS = {
  AE,
  AU,
  BR,
  CA,
  CH,
  CN,
  DE,
  ES,
  FR,
  GB,
  IN,
  IT,
  JP,
  KR,
  MX,
  PK,
  SA,
  SG,
  TR,
  US,
  ZA,
} as const;

export type SupportedFlagCode = keyof typeof FLAG_COMPONENTS;

export function getFlagComponent(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  return FLAG_COMPONENTS[code as SupportedFlagCode];
}
