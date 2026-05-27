import { createEspnAdapter } from "./_espn.js";

export default createEspnAdapter({
  id: "lpga",
  name: "LPGA Tour",
  league: "lpga",
  broadcastSearch: '"LPGA Tour" live',
});
