import {PLAYERS} from './players.js';
import {PLAYER_PHOTOS} from './photos.js';
const HEIGHTS={
PG0:"6' 9\"",PG1:"6' 5\"",PG2:"6' 1\"",PG3:"6' 1\"",PG4:"6' 4\"",PG5:"6' 1\"",PG6:"6' 0\"",PG7:"6' 0\"",PG8:"6' 2\"",PG9:"6' 0\"",PG10:"6' 3\"",PG11:"6' 3\"",PG12:"6' 2\"",PG13:"6' 2\"",PG14:"6' 8\"",PG15:"6' 3\"",
SG0:"6' 6\"",SG1:"6' 7\"",SG2:"6' 2\"",SG3:"6' 7\"",SG4:"6' 7\"",SG5:"6' 3\"",SG6:"6' 5\"",SG7:"6' 5\"",SG8:"6' 6\"",SG9:"6' 4\"",SG10:"6' 5\"",SG11:"6' 0\"",SG12:"6' 5\"",SG13:"6' 6\"",SG14:"6' 5\"",SG15:"6' 6\"",
SF0:"6' 9\"",SF1:"6' 7\"",SF2:"6' 8\"",SF3:"6' 5\"",SF4:"6' 5\"",SF5:"6' 7\"",SF6:"6' 7\"",SF7:"6' 5\"",SF8:"6' 9\"",SF9:"6' 10\"",SF10:"6' 7\"",SF11:"6' 8\"",SF12:"6' 8\"",SF13:"6' 8\"",SF14:"6' 7\"",SF15:"6' 7\"",
PF0:"6' 9\"",PF1:"6' 6\"",PF2:"6' 7\"",PF3:"6' 10\"",PF4:"6' 9\"",PF5:"6' 9\"",PF6:"6' 10\"",PF7:"6' 6\"",PF8:"6' 11\"",PF9:"6' 11\"",PF10:"7' 0\"",PF11:"6' 11\"",PF12:"6' 10\"",PF13:"7' 0\"",PF14:"6' 11\"",PF15:"6' 6\"",
C0:"7' 0\"",C1:"7' 2\"",C2:"7' 1\"",C3:"6' 10\"",C4:"7' 1\"",C5:"7' 0\"",C6:"6' 10\"",C7:"6' 11\"",C8:"7' 1\"",C9:"6' 11\"",C10:"7' 0\"",C11:"6' 10\"",C12:"7' 6\"",C13:"6' 9\"",C14:"6' 11\"",C15:"6' 10\""
};
const TEAM_LABELS={HOU:'Houston Rockets',TOR:'Toronto Raptors',LAL:'Los Angeles Lakers',GSW:'Golden State Warriors'};
const TEAM_FALLBACK={SG4:'Indiana Pacers',PF1:'Phoenix Suns'};
const heightInches=h=>{const m=/^(\d+)'\s*(\d+)"/.exec(h||'');return m?+m[1]*12+ +m[2]:78;};
const peakTeam=p=>p.ratingTeam?p.ratingTeam.replace(/^All-Time /,''):TEAM_LABELS[p.team]||TEAM_FALLBACK[p.id]||'历史球队';
export const AUCTION_PLAYERS=PLAYERS.filter(p=>p.pool==='history').map(p=>{const h=HEIGHTS[p.id]||"6' 6\"",heightIn=heightInches(h);return {...p,photo:PLAYER_PHOTOS[p.id],height:h,heightIn,heightCm:Math.round(heightIn*2.54),peakTeam:peakTeam(p)};});
export const AUCTION_IDS=AUCTION_PLAYERS.map(p=>p.id);
