const API_KEY  = process.env.FOOTBALL_API_KEY;
const YT_KEY   = process.env.YOUTUBE_API_KEY;
const ODDS_KEY = process.env.ODDS_API_KEY;
const FB_URL   = process.env.FIREBASE_DATABASE_URL;
const WC_TEAMS = [2,6,7,9,10,13,15,21,24,26,27,29,30,31,34,38,46,48,56,92,114,762];
const RAF_ID   = 111;
const L2_ID    = 61;

async function getToken() {
  const sa  = JSON.parse(process.env.FIREBASE_SA);
  const now = Math.floor(Date.now()/1000);
  const hdr = Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT"})).toString("base64url");
  const pay = Buffer.from(JSON.stringify({
    iss:sa.client_email,sub:sa.client_email,
    aud:"https://oauth2.googleapis.com/token",
    iat:now,exp:now+3600,
    scope:"https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email"
  })).toString("base64url");
  const {createSign} = await import("crypto");
  const s = createSign("RSA-SHA256");
  s.update(hdr+"."+pay);
  const sig = s.sign(sa.private_key,"base64url");
  const jwt = hdr+"."+pay+"."+sig;
  const res = await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:"grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+jwt
  });
  const d = await res.json();
  if(!d.access_token) throw new Error("Token error: "+JSON.stringify(d));
  return d.access_token;
}

async function fbSet(token,path,data) {
  const r = await fetch(FB_URL+"/"+path+".json?access_token="+token,{
    method:"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  });
  console.log("Firebase "+path+": "+r.status);
}

async function fbGet(token,path) {
  const r = await fetch(FB_URL+"/"+path+".json?access_token="+token);
  return r.ok ? await r.json() : null;
}

async function api(endpoint) {
  const r = await fetch("https://v3.football.api-sports.io/"+endpoint,{
    headers:{"x-apisports-key":API_KEY}
  });
  const d = await r.json();
  return d.response||[];
}

async function searchYT(query) {
  const q = encodeURIComponent(query);
  const r = await fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&q="+q+"&type=video&maxResults=3&key="+YT_KEY);
  const d = await r.json();
  if(d.error) return null;
  const items = d.items||[];
  const best = items.find(v=>{
    const t = v.snippet.title.toLowerCase();
    return t.includes("highlight")||t.includes("but")||t.includes("goal")||t.includes("resume");
  })||items[0];
  return best ? best.id.videoId : null;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR",{
    weekday:"short",day:"numeric",month:"short",
    hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris"
  });
}

function getStatus(f) {
  const s = f.fixture.status.short;
  if(["NS","TBD"].includes(s)) return "future";
  if(["FT","AET","PEN"].includes(s)) return "done";
  return "live";
}

async function main() {
  console.log("=== START ===");
  const token = await getToken();
  console.log("Token OK");

  // Amicaux
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate()-10);
  const to    = new Date(today); to.setDate(today.getDate()+45);
  const fmt   = d => d.toISOString().split("T")[0];
  const seen  = new Set();
  const amicaux = [];
  for(const season of [2025,2026]) {
    const fixes = await api("fixtures?league=10&season="+season+"&from="+fmt(from)+"&to="+fmt(to));
    for(const f of fixes) {
      if(!WC_TEAMS.includes(f.teams.home.id)&&!WC_TEAMS.includes(f.teams.away.id)) continue;
      const key = "f"+f.fixture.id;
      if(seen.has(key)) continue;
      seen.add(key);
      const st = getStatus(f);
      amicaux.push({
        id:key,home:f.teams.home.name,hL:f.teams.home.logo,
        away:f.teams.away.name,aL:f.teams.away.logo,
        date:fmtDate(f.fixture.date),venue:(f.fixture.venue&&f.fixture.venue.name)||"",
        status:st,score:st==="future"?null:{h:f.goals.home||0,a:f.goals.away||0}
      });
    }
  }
  console.log("Amicaux: "+amicaux.length);

  // Highlights YouTube
  const exHL = await fbGet(token,"highlights")||{};
  const newHL = Object.assign({},exHL);
  for(const m of amicaux) {
    if(m.status==="done"&&!newHL[m.id]) {
      const vid = await searchYT(m.home+" "+m.away+" highlights "+new Date().getFullYear());
      if(vid){newHL[m.id]=vid;console.log("HL "+m.id+": "+vid);}
      await new Promise(r=>setTimeout(r,500));
    }
  }

  // RAF matchs
  let rec=[],nxt=[];
  for(const season of [2024,2025]) {
    if(rec.length===0) rec = await api("fixtures?team="+RAF_ID+"&league="+L2_ID+"&season="+season+"&last=5");
    if(nxt.length===0) nxt = await api("fixtures?team="+RAF_ID+"&league="+L2_ID+"&season="+season+"&next=5");
  }
  const toM=(f,type)=>{
    const st=type==="next"?"future":getStatus(f);
    const hG=f.goals.home||0,aG=f.goals.away||0;
    const isH=f.teams.home.name.toLowerCase().includes("rodez");
    const res=st==="future"?null:hG>aG?(isH?"V":"D"):hG<aG?(isH?"D":"V"):"N";
    return {
      id:"r"+f.fixture.id,
      journee:"J"+((f.league.round||"").replace("Regular Season - ","")),
      home:f.teams.home.name,hL:f.teams.home.logo,
      away:f.teams.away.name,aL:f.teams.away.logo,
      date:fmtDate(f.fixture.date),venue:(f.fixture.venue&&f.fixture.venue.name)||"",
      status:st,score:st==="future"?null:{h:hG,a:aG},result:res
    };
  };
  for(const m of rec) {
    const rm=toM(m,"done");
    if(!newHL[rm.id]) {
      const away=rm.away.replace("Rodez AF","").trim();
      const vid=await searchYT("Rodez "+away+" Ligue 2 highlights "+new Date().getFullYear());
      if(vid) newHL[rm.id]=vid;
      await new Promise(r=>setTimeout(r,500));
    }
  }

  // Classement L2
  let rows=[];
  for(const season of [2024,2025]) {
    if(rows.length===0) {
      const data=await api("standings?league="+L2_ID+"&season="+season);
      rows=(data[0]&&data[0].league&&data[0].league.standings&&data[0].league.standings[0])||[];
    }
  }
  const classL2=rows.map(t=>({
    pos:t.rank,team:t.team.name,logo:t.team.logo,
    pts:t.points,j:t.all.played,v:t.all.win,n:t.all.draw,d:t.all.lose,
    bp:t.all.goals.for,bc:t.all.goals.against,diff:t.goalsDiff,isRAF:t.team.id===RAF_ID
  }));
  const raf=rows.find(t=>t.team.id===RAF_ID);
  const rafStats=raf?{pos:raf.rank,pts:raf.points,j:raf.all.played,v:raf.all.win,n:raf.all.draw,d:raf.all.lose,bp:raf.all.goals.for,bc:raf.all.goals.against}:null;
  console.log("L2: "+classL2.length+" equipes");

  // Cotes The Odds API
  const odds={};
  const sr=await fetch("https://api.the-odds-api.com/v4/sports/?apiKey="+ODDS_KEY+"&all=true");
  console.log("Odds remaining: "+sr.headers.get("x-requests-remaining"));
  const sportsList=await sr.json();
  const targets=sportsList.filter(s=>s.key&&(s.key.includes("ligue_2")||s.key.includes("friendly")||s.key.includes("france_ligue")));
  console.log("Targets: "+targets.map(s=>s.key).join(", "));
  for(const sport of targets.slice(0,2)) {
    const gr=await fetch("https://api.the-odds-api.com/v4/sports/"+sport.key+"/odds/?apiKey="+ODDS_KEY+"&regions=eu&markets=h2h&oddsFormat=decimal");
    if(!gr.ok) continue;
    const games=await gr.json();
    for(const g of games) {
      const bk=g.bookmakers&&g.bookmakers[0];
      if(!bk) continue;
      const h2h=bk.markets&&bk.markets.find(m=>m.key==="h2h");
      if(!h2h) continue;
      const home=h2h.outcomes.find(o=>o.name===g.home_team);
      const away=h2h.outcomes.find(o=>o.name===g.away_team);
      const draw=h2h.outcomes.find(o=>o.name==="Draw");
      const key=(g.home_team+"_"+g.away_team).replace(/[^a-zA-Z0-9]/g,"-").slice(0,60);
      odds[key]={home:home&&home.price||null,draw:draw&&draw.price||null,away:away&&away.price||null,homeTeam:g.home_team,awayTeam:g.away_team};
      console.log(g.home_team+" vs "+g.away_team+": "+(home&&home.price)+" / "+(draw&&draw.price)+" / "+(away&&away.price));
    }
  }
  console.log("Odds: "+Object.keys(odds).length+" matchs");

  // Firebase
  const now=new Date().toLocaleString("fr-FR",{timeZone:"Europe/Paris"});
  await Promise.all([
    amicaux.length?fbSet(token,"amicaux",amicaux):Promise.resolve(),
    fbSet(token,"raf/recents",rec.map(f=>toM(f,"done"))),
    fbSet(token,"raf/prochains",nxt.map(f=>toM(f,"next"))),
    rafStats?fbSet(token,"raf/classement",rafStats):Promise.resolve(),
    classL2.length?fbSet(token,"classementL2",classL2):Promise.resolve(),
    Object.keys(newHL).length?fbSet(token,"highlights",newHL):Promise.resolve(),
    Object.keys(odds).length?fbSet(token,"odds",odds):Promise.resolve(),
    fbSet(token,"meta",{lastUpdate:now}),
  ]);
  console.log("=== DONE === "+now);
}

main().catch(e=>{console.error("ERROR:",e.message);process.exit(1);});
