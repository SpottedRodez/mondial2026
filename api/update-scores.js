// api/update-scores.js
// Vercel Serverless Function + Cron Job
// S'execute automatiquement toutes les 15 minutes
// Appelle API-Football → met à jour Firebase Realtime Database

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// ── CONFIG ─────────────────────────────────────────────
const API_KEY      = process.env.FOOTBALL_API_KEY;
const API_BASE     = "https://v3.football.api-sports.io";
const FB_URL       = process.env.FIREBASE_DATABASE_URL;
const FB_SA        = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// IDs API-Football
const LEAGUE_AMICAUX = 10;   // Matchs internationaux amicaux
const LEAGUE_L2      = 61;   // Ligue 2
const LEAGUE_WC      = 1;    // Coupe du Monde
const SEASON_2026    = 2026;
const SEASON_2025    = 2025;
const RAF_TEAM_ID    = 111;  // Rodez AF

// ── INIT FIREBASE ADMIN ────────────────────────────────
function getFirebase() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(FB_SA),
      databaseURL: FB_URL,
    });
  }
  return getDatabase();
}

// ── APPEL API-FOOTBALL ─────────────────────────────────
async function apiCall(endpoint) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    headers: {
      "x-apisports-key": API_KEY,
    },
  });
  const data = await res.json();
  return data.response || [];
}

// ── CONVERSION STATUS ──────────────────────────────────
function getStatus(fixture) {
  const s = fixture.fixture.status.short;
  if (["NS", "TBD"].includes(s)) return "future";
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(s)) return "done";
  return "live";
}

// ── RÉCUPÈRE LES AMICAUX WC (équipes qualifiées) ───────
async function fetchAmicaux() {
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate() - 10);
  const to    = new Date(today); to.setDate(today.getDate() + 45);
  const fmt   = d => d.toISOString().split("T")[0];

  // Equipes qualifiées WC 2026
  const WC_TEAMS = [2,6,7,9,10,13,15,21,24,26,27,29,30,31,34,38,46,48,56,92,114,762];

  const results = [];
  // On fait 2 saisons car API-Football classe parfois les matchs de mars 2026 en saison 2025
  for (const season of [SEASON_2025, SEASON_2026]) {
    const fixtures = await apiCall(
      `fixtures?league=${LEAGUE_AMICAUX}&season=${season}&from=${fmt(from)}&to=${fmt(to)}`
    );
    for (const f of fixtures) {
      const homeId = f.teams.home.id;
      const awayId = f.teams.away.id;
      if (!WC_TEAMS.includes(homeId) && !WC_TEAMS.includes(awayId)) continue;
      // Evite les doublons
      if (results.find(r => r.id === `f${f.fixture.id}`)) continue;

      results.push({
        id:     `f${f.fixture.id}`,
        apiId:  f.fixture.id,
        home:   f.teams.home.name,
        hL:     f.teams.home.logo,  // URL logo
        away:   f.teams.away.name,
        aL:     f.teams.away.logo,
        date:   new Date(f.fixture.date).toLocaleDateString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }),
        venue:  f.fixture.venue?.name || "",
        status: getStatus(f),
        score:  f.fixture.status.short === "NS" ? null : {
          h: f.goals.home ?? 0,
          a: f.goals.away ?? 0,
        },
      });
    }
  }
  return results;
}

// ── RÉCUPÈRE LES MATCHS RAF (Ligue 2) ──────────────────
async function fetchRAF() {
  const fixtures = await apiCall(
    `fixtures?team=${RAF_TEAM_ID}&league=${LEAGUE_L2}&season=${SEASON_2026}&last=5`
  );
  const next = await apiCall(
    `fixtures?team=${RAF_TEAM_ID}&league=${LEAGUE_L2}&season=${SEASON_2026}&next=5`
  );

  const toMatch = (f, type) => ({
    id:      `r${f.fixture.id}`,
    apiId:   f.fixture.id,
    journee: `J${f.league.round?.replace("Regular Season - ", "") || "?"}`,
    home:    f.teams.home.name,
    hL:      f.teams.home.logo,
    away:    f.teams.away.name,
    aL:      f.teams.away.logo,
    date:    new Date(f.fixture.date).toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }),
    venue:   f.fixture.venue?.name || "",
    status:  type === "next" ? "future" : getStatus(f),
    score:   type === "next" ? null : { h: f.goals.home ?? 0, a: f.goals.away ?? 0 },
    result:  type === "next" ? null : (f.goals.home > f.goals.away ? (f.teams.home.name.includes("Rodez") ? "V" : "D") : f.goals.home < f.goals.away ? (f.teams.home.name.includes("Rodez") ? "D" : "V") : "N"),
  });

  return {
    recents:  fixtures.map(f => toMatch(f, "done")),
    prochains: next.map(f => toMatch(f, "next")),
  };
}

// ── RÉCUPÈRE LE CLASSEMENT LIGUE 2 ─────────────────────
async function fetchClassementL2() {
  const data = await apiCall(`standings?league=${LEAGUE_L2}&season=${SEASON_2026}`);
  if (!data[0]?.league?.standings?.[0]) return [];
  return data[0].league.standings[0].map(t => ({
    pos:    t.rank,
    team:   t.team.name,
    logo:   t.team.logo,
    pts:    t.points,
    j:      t.all.played,
    v:      t.all.win,
    n:      t.all.draw,
    d:      t.all.lose,
    bp:     t.all.goals.for,
    bc:     t.all.goals.against,
    diff:   t.goalsDiff,
    isRAF:  t.team.id === RAF_TEAM_ID,
  }));
}

// ── RÉCUPÈRE LES STATS RAF ─────────────────────────────
async function fetchRAFStats() {
  const standings = await apiCall(`standings?league=${LEAGUE_L2}&season=${SEASON_2026}`);
  if (!standings[0]?.league?.standings?.[0]) return null;
  const raf = standings[0].league.standings[0].find(t => t.team.id === RAF_TEAM_ID);
  if (!raf) return null;
  return {
    pos: raf.rank,
    pts: raf.points,
    j:   raf.all.played,
    v:   raf.all.win,
    n:   raf.all.draw,
    d:   raf.all.lose,
    bp:  raf.all.goals.for,
    bc:  raf.all.goals.against,
  };
}

// ── HANDLER PRINCIPAL ──────────────────────────────────
export default async function handler(req, res) {
  // Sécurité : vérifie le header Vercel Cron ou un token secret
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("🔄 Mise à jour des scores...");

    const db = getFirebase();
    const updates = {};

    // 1. Amicaux WC
    console.log("Fetching amicaux...");
    const amicaux = await fetchAmicaux();
    updates["amicaux"] = amicaux;
    console.log(`✅ ${amicaux.length} amicaux récupérés`);

    // 2. Matchs RAF
    console.log("Fetching RAF matches...");
    const raf = await fetchRAF();
    updates["raf/recents"]  = raf.recents;
    updates["raf/prochains"] = raf.prochains;
    console.log(`✅ RAF: ${raf.recents.length} récents, ${raf.prochains.length} prochains`);

    // 3. Stats RAF
    console.log("Fetching RAF stats...");
    const rafStats = await fetchRAFStats();
    if (rafStats) updates["raf/classement"] = rafStats;
    console.log(`✅ RAF classement: ${rafStats?.pos}e, ${rafStats?.pts} pts`);

    // 4. Classement Ligue 2
    console.log("Fetching L2 standings...");
    const l2 = await fetchClassementL2();
    updates["classementL2"] = l2;
    console.log(`✅ Classement L2: ${l2.length} équipes`);

    // 5. Écriture Firebase (batch update)
    const dbRef = db.ref("/");
    await dbRef.update(updates);

    const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    await db.ref("lastUpdate").set(now);

    console.log("✅ Firebase mis à jour !");
    return res.status(200).json({
      success: true,
      lastUpdate: now,
      amicaux: amicaux.length,
      rafRecents: raf.recents.length,
      rafProchains: raf.prochains.length,
    });

  } catch (err) {
    console.error("❌ Erreur:", err);
    return res.status(500).json({ error: err.message });
  }
}
