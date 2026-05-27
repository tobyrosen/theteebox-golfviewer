import pga from "./pga.js";
import dpworld from "./dpworld.js";
import liv from "./liv.js";
import lpga from "./lpga.js";
import kornferry from "./kornferry.js";
import champions from "./champions.js";
import tgl from "./tgl.js";
import allthailand from "./allthailand.js";
import custom from "./custom.js";

export const ADAPTERS = [
  pga,
  dpworld,
  liv,
  lpga,
  kornferry,
  champions,
  tgl,
  allthailand,
  custom,
];

export function getAdapter(id) {
  return ADAPTERS.find((a) => a.id === id) || ADAPTERS[0];
}
