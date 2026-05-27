import { createEspnAdapter } from "./_espn.js";

// TGL (Tomorrow's Golf League) — indoor tech-golf league launched 2024.
// ESPN league code `tgl` verified via sports.core.api.espn.com/v2/sports/golf/leagues.
export default createEspnAdapter({
  id: "tgl",
  name: "TGL",
  league: "tgl",
  broadcastSearch: '"TGL" golf live',
});
