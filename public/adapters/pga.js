import { createEspnAdapter } from "./_espn.js";

export default createEspnAdapter({
  id: "pga",
  name: "PGA Tour",
  league: "pga",
  broadcastSearch: '"PGA Tour" live',
});
