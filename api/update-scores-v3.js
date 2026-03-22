// api/update-scores.js
// Utilise l'API REST Firebase (pas de firebase-admin, zero dependance)

const API_KEY  = process.env.FOOTBALL_API_KEY;
const API_BASE = "https://v3.football.api-sports.io";
const FB_URL   = process.env.FIREBASE_DATABASE_URL;
const RAF_ID   = 111;
const L2_ID    = 61;
const WC_TEAMS = [2,6,7,9,10,13,15,21,24,26,27,29,30,31,34,38,46,48,56,92,114,762];

// ── Auth Firebase via Service Account ─────────────────
async function getFirebaseToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  
  const header  = btoa(JSON.stringify({ alg:"RS256", typ:"JWT" })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  // Signe avec la clé privée RSA
  const pemKey = sa.private_key;
  const keyData = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer,
    { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" },
    false, ["sign"]
  );
  
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sigBuf   = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, sigInput);
  const sig      = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  
  const jwt = `${header}.${payload}.${sig}`;
  
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ── Ecriture Firebase REST ──────────────────────────────
async function fbPatch(token, path, data) {
  const url = `${FB_URL}/${path}.json?access_token=${token}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

// ── API Football ───────────────────────────────────────
async function api(endpoint) {
  const r = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { "x-apisports-key": API_KEY }
  });
  const d = await r.json();
  return d.response || [];
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday:"short", day:"numeric", month:"short",
    hour:"2-digit", minute:"2-digit", timeZone:"Europe/Paris"
  });
}

function getStatus(f) {
  const s = f.fixture.status.short;
  if (["NS","TBD"].includes(s)) return "future";
  if (["FT","AET","PEN"].includes(s)) return "done";
  return "live";
}

async function getAmicaux() {
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate()-10);
  const to    = new Date(today); to.setDate(today.getDate()+45);
  const fmt   = d => d.toISOString().split("T")[0];
  const seen  = new Set();
  const out   = [];
  for (const season of [2025,2026]) {
    const fixes = await api(`fixtures?league=10&season=${season}&from=${fmt(from)}&to=${fmt(to)}`);
    for (const f of fixes) {
      if (!WC_TEAMS.includes(f.teams.home.id) && !WC_TEAMS.includes(f.teams.away.id)) continue;
      const key = `f${f.fixture.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const st = getStatus(f);
      out.push({
        id: key, home: f.teams.home.name, hL: f.teams.home.logo,
        away: f.teams.away.name, aL: f.teams.away.logo,
        date: fmtDate(f.fixture.date), venue: f.fixture.venue?.name||"",
        status: st, score: st==="future" ? null : {h:f.goals.home??0, a:f.goals.away??0},
      });
    }
  }
  return out;
}

async function getRAF() {
  const [rec, nxt] = await Promise.all([
    api(`fixtures?team=${RAF_ID}&league=${L2_ID}&season=2026&last=5`),
    api(`fixtures?team=${RAF_ID}&league=${L2_ID}&season=2026&next=5`),
  ]);
  const toM = (f,type) => {
    const st = type==="next"?"future":getStatus(f);
    const hG = f.goals.home??0, aG = f.goals.away??0;
    const isH = f.teams.home.name.toLowerCase().includes("rodez");
    const res = st==="future"?null:hG>aG?(isH?"V":"D"):hG<aG?(isH?"D":"V"):"N";
    return {
      id:`r${f.fixture.id}`,
      journee:`J${(f.league.round||"").replace("Regular Season - ","")}`,
      home:f.teams.home.name, hL:f.teams.home.logo,
      away:f.teams.away.name, aL:f.teams.away.logo,
      date:fmtDate(f.fixture.date), venue:f.fixture.venue?.name||"",
      status:st, score:st==="future"?null:{h:hG,a:aG}, result:res,
    };
  };
  return { recents:rec.map(f=>toM(f,"done")), prochains:nxt.map(f=>toM(f,"next")) };
}

async function getStandings() {
  const data = await api(`standings?league=${L2_ID}&season=2026`);
  const rows = data[0]?.league?.standings?.[0]||[];
  const classL2 = rows.map(t=>({
    pos:t.rank, team:t.team.name, logo:t.team.logo,
    pts:t.points, j:t.all.played, v:t.all.win, n:t.all.draw, d:t.all.lose,
    bp:t.all.goals.for, bc:t.all.goals.against, diff:t.goalsDiff,
    isRAF:t.team.id===RAF_ID,
  }));
  const raf = rows.find(t=>t.team.id===RAF_ID);
  const rafStats = raf ? {
    pos:raf.rank, pts:raf.points, j:raf.all.played,
    v:raf.all.win, n:raf.all.draw, d:raf.all.lose,
    bp:raf.all.goals.for, bc:raf.all.goals.against,
  } : null;
  return { classL2, rafStats };
}

// ── HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
  const auth = req.headers["authorization"]||"";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error:"Unauthorized" });
  }
  try {
    const token = await getFirebaseToken();
    const now   = new Date().toLocaleString("fr-FR",{timeZone:"Europe/Paris"});

    const [amicaux, raf, standings] = await Promise.all([
      getAmicaux(), getRAF(), getStandings()
    ]);

    await Promise.all([
      fbPatch(token, "amicaux",          {0: amicaux}),
      fbPatch(token, "raf/recents",      {0: raf.recents}),
      fbPatch(token, "raf/prochains",    {0: raf.prochains}),
      fbPatch(token, "raf/classement",   standings.rafStats||{}),
      fbPatch(token, "classementL2",     {0: standings.classL2}),
      fbPatch(token, "meta",             { lastUpdate: now }),
    ]);

    return res.status(200).json({
      ok:true, lastUpdate:now,
      amicaux:amicaux.length, rafR:raf.recents.length,
      rafP:raf.prochains.length, l2:standings.classL2.length,
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error:err.message });
  }
}
