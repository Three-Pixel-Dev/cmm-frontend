// Type definitions for the Myanmar NRC reference data. The data itself is served
// by the user-service (GET /api/v1/nrc) — see the useNrcData hook.
export interface NrcLocalized {
  en: string;
  mm: string;
}
export interface NrcType {
  id: string;
  name: NrcLocalized;
}
export interface NrcState {
  id: string;
  number: NrcLocalized;
  name: NrcLocalized;
}
export interface NrcTownship {
  id: string;
  short: NrcLocalized;
  name: NrcLocalized;
  /** Links to NrcState.number.en (e.g. "13"). */
  stateNumber: string;
}
export interface NrcData {
  types: NrcType[];
  states: NrcState[];
  townships: NrcTownship[];
}
export const EMPTY_NRC_DATA: NrcData = { types: [], states: [], townships: [] };
