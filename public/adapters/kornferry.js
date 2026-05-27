import { createEspnAdapter } from "./_espn.js";

// ESPN league code is `ntw` (legacy "Nationwide" code, predates the
// Korn Ferry sponsor rename). Non-obvious but verified.
export default createEspnAdapter({
  id: "kornferry",
  name: "Korn Ferry Tour",
  league: "ntw",
  broadcastSearch: '"Korn Ferry Tour" live',
});
