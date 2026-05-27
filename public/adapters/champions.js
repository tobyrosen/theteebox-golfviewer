import { createEspnAdapter } from "./_espn.js";

// 54-hole format; linescores[] has 3 periods.
export default createEspnAdapter({
  id: "champions",
  name: "PGA Tour Champions",
  league: "champions-tour",
  broadcastSearch: '"PGA Tour Champions" live',
});
