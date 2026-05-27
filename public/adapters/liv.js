import { createEspnAdapter } from "./_espn.js";

// ESPN's feed covers individual leaderboard only. LIV's signature team
// standings are not in any public free feed.
export default createEspnAdapter({
  id: "liv",
  name: "LIV Golf",
  league: "liv",
  broadcastSearch: '"LIV Golf" live',
});
