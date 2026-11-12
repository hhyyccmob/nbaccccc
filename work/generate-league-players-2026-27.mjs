import fs from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const out = new URL('../outputs/nba-draft-lab/dist/league-players.js', root);
const data = JSON.parse(await fs.readFile(new URL('all-player-ratings-2026-27.json', root), 'utf8'));
const statsCache = JSON.parse(await fs.readFile(new URL('all-player-stats-2026-27.json', root), 'utf8'));
const n = v => parseFloat(v) || 0;

if (data.players.length < 400) throw Error('Not enough rated players');

const players = data.players.map(p => {
  const s = statsCache.players[p.id]?.stats || {};
  return {
    id: p.id,
    name: p.name,
    abbr: p.abbr,
    pos: p.pos,
    ovr: p.ratings.ovr,
    off: p.ratings.off,
    def: p.ratings.def,
    shoot: p.ratings.shoot,
    pass: p.ratings.pass,
    reb: p.ratings.reb,
    games: p.games,
    minutes: p.minutes,
    ppg: n(s.avgPoints),
    rpg: n(s.avgRebounds),
    apg: n(s.avgAssists),
    spg: n(s.avgSteals),
    bpg: n(s.avgBlocks),
    fgPct: n(s.fieldGoalPct)
  };
});

const js = '// 2026-27 player ratings and actual season averages used for opponent stats and awards.\n'
  + '// Generated from work/all-player-ratings-2026-27.json and work/all-player-stats-2026-27.json; snapshot 2026-11-09.\n'
  + 'export const LEAGUE_PLAYERS=' + JSON.stringify(players) + ';\n';

await fs.writeFile(out, js);
console.log(JSON.stringify({players: players.length, bytes: js.length}, null, 2));
