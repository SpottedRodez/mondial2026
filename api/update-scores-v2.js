// api/update-scores.js — Vercel Serverless Function + Cron
// Appelle API-Football toutes les 15 min → met à jour Firebase

const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getDatabase } = await import("firebase-admin/database");

const API_KEY  = process.env.FOOTBALL_API_KEY;
const API_BASE = "https://v3.football.api-sports.io";
const FB_URL   = process.env.FIREBASE_DATABASE_URL;
const RAF_ID   = 111;
const L2_ID    = 61;
const WC_ID    = 1;

// Equipes qualifiées WC 2026 (IDs api-football)
const WC_TEAMS = [2,6,7,9,10,13,15,21,24,26,27,29,30,31,34,38,46,48,56,92,114,762];

function initFB() {
  if (getApps().length > 0) return getDatabase();
  let sa;
  try {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch(e) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT invalide: " + e.message);
  }
  initializeApp({ credential: cert(sa), databaseURL: FB_URL });
  return getDatabase();
}

async function api(endpoint) {
  const r = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { "x-apisports-key": API_KEY }
  });
  const d = await r.json();
  return d.response || [];
}

function status(f) {
  const s = f.fixture.status.short;
  if (["NS","TBD"].includes(s)) return "future";
  if (["FT","AET","PEN","AWD","WO"].includes(s)) return "done";
  return "live";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday:"short", day:"numeric", month:"short",
    hour:"2-digit", minute:"2-digit", timeZone:"Europe/Paris"
  });
}

async function getAmicaux() {
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate() - 10);
  const to    = new Date(today); to.setDate(today.getDate() + 45);
  const fmt   = d => d.toISOString().split("T")[0];
  const seen  = new Set();
  const out   = [];
  for (const season of [2025, 2026]) {
    const fixes = await api(`fixtures?league=${WC_ID === 10 ? 10 : 10}&season=${season}&from=${fmt(from)}&to=${fmt(to)}`);
    for (const f of fixes) {
      const hId = f.teams.home.id, aId = f.teams.away.id;
      if (!WC_TEAMS.includes(hId) && !WC_TEAMS.includes(aId)) continue;
      const key = `f${f.fixture.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const st = status(f);
      out.push({
        id: key, apiId: f.fixture.id,
        home: f.teams.home.name, hL: f.teams.home.logo,
        away: f.teams.away.name, aL: f.teams.away.logo,
        date: fmtDate(f.fixture.date),
        venue: f.fixture.venue?.name || "",
        status: st,
        score: st === "future" ? null : { h: f.goals.home ?? 0, a: f.goals.away ?? 0 },
      });
    }
  }
  return out;
}

async function getRAF() {
  const [recFix, nextFix] = await Promise.all([
    api(`fixtures?team=${RAF_ID}&league=${L2_ID}&season=2026&last=5`),
    api(`fixtures?team=${RAF_ID}&league=${L2_ID}&season=2026&next=5`),
  ]);
  const toM = (f, type) => {
    const st  = type === "next" ? "future" : status(f);
    const hG  = f.goals.home ?? 0, aG = f.goals.away ?? 0;
    const isH = f.teams.home.name.toLowerCase().includes("rodez");
    const res = st === "future" ? null : hG > aG ? (isH?"V":"D") : hG < aG ? (isH?"D":"V") : "N";
    return {
      id: `r${f.fixture.id}`,
      journee: `J${(f.league.round||"").replace("Regular Season - ","")}`,
      home: f.teams.home.name, hL: f.teams.home.logo,
      away: f.teams.away.name, aL: f.teams.away.logo,
      date: fmtDate(f.fixture.date),
      venue: f.fixture.venue?.name || "",
      status: st,
      score: st === "future" ? null : { h: hG, a: aG },
      result: res,
    };
  };
  return {
    recents:   recFix.map(f => toM(f,"done")),
    prochains: nextFix.map(f => toM(f,"next")),
  };
}

async function getStandings() {
  const data = await api(`standings?league=${L2_ID}&season=2026`);
  const rows = data[0]?.league?.standings?.[0] || [];
  const classL2 = rows.map(t => ({
    pos: t.rank, team: t.team.name, logo: t.team.logo,
    pts: t.points, j: t.all.played,
    v: t.all.win, n: t.all.draw, d: t.all.lose,
    bp: t.all.goals.for, bc: t.all.goals.against,
    diff: t.goalsDiff, isRAF: t.team.id === RAF_ID,
  }));
  const raf = rows.find(t => t.team.id === RAF_ID);
  const rafStats = raf ? {
    pos: raf.rank, pts: raf.points, j: raf.all.played,
    v: raf.all.win, n: raf.all.draw, d: raf.all.lose,
    bp: raf.all.goals.for, bc: raf.all.goals.against,
  } : null;
  return { classL2, rafStats };
}

export default async function handler(req, res) {
  // Sécurité cron
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const db = initFB();
    const now = new Date().toLocaleString("fr-FR", { timeZone:"Europe/Paris" });

    const [amicaux, raf, standings] = await Promise.all([
      getAmicaux(), getRAF(), getStandings()
    ]);

    await db.ref("/").update({
      amicaux,
      "raf/recents":    raf.recents,
      "raf/prochains":  raf.prochains,
      "raf/classement": standings.rafStats,
      classementL2:     standings.classL2,
      lastUpdate:       now,
    });

    return res.status(200).json({
      ok: true, lastUpdate: now,
      amicaux: amicaux.length,
      rafR: raf.recents.length,
      rafP: raf.prochains.length,
      l2: standings.classL2.length,
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
