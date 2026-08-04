import assert from "node:assert/strict";
import test from "node:test";

import { createEspnAdapter } from "../public/adapters/_espn.js";
import { ADAPTERS, getAdapter } from "../public/adapters/index.js";

const adapter = createEspnAdapter({
  id: "test",
  name: "Test Tour",
  league: "test-league",
});

test("ESPN adapter exposes the league endpoint and broadcast fallback", () => {
  assert.equal(
    adapter.defaultUrl,
    "https://site.api.espn.com/apis/site/v2/sports/golf/test-league/scoreboard",
  );
  assert.equal(adapter.broadcastSearch, "Test Tour live");
});

test("ESPN adapter normalizes a live leaderboard and current round", () => {
  const result = adapter.parse(
    JSON.stringify({
      events: [
        {
          competitions: [
            {
              status: { period: 2, type: { state: "in" } },
              competitors: [
                {
                  score: "-7",
                  athlete: {
                    displayName: "Ada Golfer",
                    flag: { alt: "THA" },
                  },
                  status: { position: { id: 1 }, thru: 14 },
                  linescores: [
                    { period: 1, value: 68, displayValue: "-4" },
                    { period: 2, value: 69, displayValue: "-3" },
                    { period: 3, value: null },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  );

  assert.equal(result.columns[0].key, "pos");
  assert.deepEqual(result.rows, [
    {
      pos: "1",
      score: "-7",
      player: "Ada Golfer",
      country: "THA",
      thru: "14",
      today: "-3",
      expand: [
        { label: "R1", score: "-4" },
        { label: "R2", score: "-3" },
      ],
    },
  ]);
});

test("ESPN adapter uses stable fallbacks for completed and partial data", () => {
  const result = adapter.parse(
    JSON.stringify({
      events: [
        {
          competitions: [
            {
              status: { period: 3, type: { state: "post" } },
              competitors: [
                {
                  order: 9,
                  athlete: { fullName: "Grace Player" },
                  linescores: [
                    { period: 1, value: 71 },
                    { period: 2, value: 70 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  );

  assert.deepEqual(result.rows[0], {
    pos: "9",
    score: "—",
    player: "Grace Player",
    country: "",
    thru: "F",
    today: "—",
    expand: [
      { label: "R1", score: "71" },
      { label: "R2", score: "70" },
    ],
  });
});

test("ESPN adapter fails closed on invalid or incomplete payloads", () => {
  assert.deepEqual(adapter.parse("not json").rows, []);
  assert.deepEqual(adapter.parse("{}").rows, []);
  assert.deepEqual(adapter.parse('{"events":[{}]}').rows, []);
});

test("adapter registry has unique IDs and a deterministic fallback", () => {
  const ids = ADAPTERS.map(({ id }) => id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(getAdapter("liv").id, "liv");
  assert.equal(getAdapter("missing"), ADAPTERS[0]);
});
