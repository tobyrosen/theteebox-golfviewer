import { createEspnAdapter } from "./_espn.js";

// ESPN league code is `eur` (legacy "European Tour") — the tour rebranded
// to DP World Tour but ESPN's slug never changed.
export default createEspnAdapter({
  id: "dpworld",
  name: "DP World Tour",
  league: "eur",
  broadcastSearch: '"DP World Tour" live',
});
