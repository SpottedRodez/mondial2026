import React, { useState, useEffect, useRef } from "react";
import { db, ref, set, onValue } from "./firebase.js";

// ══════════════════════════════════════════════════════
//  DONNÉES — MAJ par Claude via recherche web
//  Dernière MAJ : 21 mars 2026
//  Pour chaque match terminé, Claude remplit :
//  score:{h,a}, status:"done", resume:{...}
// ══════════════════════════════════════════════════════
const DATA = {
  lastUpdate: "21 mars 2026 · 19h00",
  amicaux: [
    // Exemple match terminé avec résumé complet :
    // { id:"j0", home:"Exemple", hL:"🏳", away:"Test", aL:"🏳", date:"20 mars · 20h00",
    //   venue:"Stade", status:"done", score:{h:2,a:1},
    //   resume:{
    //     texte:"Match dominé par l'équipe A dès l'entame. But de X à la 23e, doublé à la 67e. L'équipe B réduit le score à la 80e.",
    //     buts:["⚽ 23' X (Exemple)","⚽ 67' Y (Exemple)","⚽ 80' Z (Test)"],
    //     cartons:["🟨 45' W (Test)"],
    //     stats:{possession:["62%","38%"],tirs:["14","7"],cadres:["6","3"]},
    //     motm:"X (Exemple)"
    //   }
    // },
    { id:"j1",  home:"Japon",      hL:"🇯🇵", away:"Corée du Sud",  aL:"🇰🇷", date:"24 mars · 13h00", venue:"National Stadium, Tokyo",              status:"future", score:null },
    { id:"j2",  home:"Allemagne",  hL:"🇩🇪", away:"Pays-Bas",      aL:"🇳🇱", date:"25 mars · 20h45", venue:"Allianz Arena, Munich",                status:"future", score:null },
    { id:"j3",  home:"Angleterre", hL:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Belgique",      aL:"🇧🇪", date:"25 mars · 20h00", venue:"Wembley, Londres",                    status:"future", score:null },
    { id:"j4",  home:"USA",        hL:"🇺🇸", away:"Mexique",       aL:"🇲🇽", date:"25 mars · 22h00", venue:"Rose Bowl, Los Angeles",               status:"future", score:null },
    { id:"j5",  home:"Maroc",      hL:"🇲🇦", away:"Sénégal",       aL:"🇸🇳", date:"25 mars · 19h00", venue:"Complexe Mohammed VI, Rabat",          status:"future", score:null },
    { id:"j6",  home:"Brésil",     hL:"🇧🇷", away:"France",        aL:"🇫🇷", date:"26 mars · 21h00", venue:"Gillette Stadium, Foxborough (Boston)", status:"future", score:null, highlight:true },
    { id:"j7",  home:"Portugal",   hL:"🇵🇹", away:"Uruguay",       aL:"🇺🇾", date:"26 mars · 22h00", venue:"Estádio da Luz, Lisbonne",             status:"future", score:null },
    { id:"j8",  home:"France",     hL:"🇫🇷", away:"Colombie",      aL:"🇨🇴", date:"29 mars · 21h00", venue:"Northwest Stadium, Landover",          status:"future", score:null },
    { id:"j9",  home:"Argentine",  hL:"🇦🇷", away:"Équateur",      aL:"🇪🇨", date:"29 mars · 00h30", venue:"Monumental, Buenos Aires",             status:"future", score:null },
    { id:"j10", home:"Angleterre", hL:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", away:"Japon",          aL:"🇯🇵", date:"31 mars · 20h45", venue:"Wembley, Londres",                    status:"future", score:null },
    { id:"j11", home:"Pays-Bas",   hL:"🇳🇱", away:"Équateur",      aL:"🇪🇨", date:"31 mars · 20h45", venue:"Johan Cruyff ArenA, Amsterdam",        status:"future", score:null },
    { id:"j12", home:"Maroc",      hL:"🇲🇦", away:"Paraguay",      aL:"🇵🇾", date:"31 mars · 20h00", venue:"Maroc",                                status:"future", score:null },
    { id:"j13", home:"Sénégal",    hL:"🇸🇳", away:"Gambie",        aL:"🇬🇲", date:"31 mars · 21h00", venue:"Dakar",                                status:"future", score:null },
    { id:"j14", home:"Qatar",      hL:"🇶🇦", away:"Argentine",     aL:"🇦🇷", date:"31 mars · 21h00", venue:"Qatar",                                status:"future", score:null },
    { id:"j15", home:"USA",        hL:"🇺🇸", away:"Portugal",      aL:"🇵🇹", date:"1er avr · 01h00", venue:"États-Unis",                           status:"future", score:null },
    { id:"j16", home:"Brésil",     hL:"🇧🇷", away:"Croatie",       aL:"🇭🇷", date:"1er avr · 02h00", venue:"États-Unis",                           status:"future", score:null },
    { id:"j17", home:"Mexique",    hL:"🇲🇽", away:"Belgique",      aL:"🇧🇪", date:"1er avr · 03h00", venue:"Mexique",                              status:"future", score:null },
  ],
  news: [
    { id:1, source:"90MIN",     hot:true,  icon:"🚨", title:"Mbappé forfait — absent pour toute la trêve de mars",                  summary:"Kylian Mbappé est blessé pour plusieurs semaines. Il manquera Brésil-France.", time:"il y a 1h" },
    { id:2, source:"FFF",       hot:true,  icon:"🇫🇷", title:"Liste Deschamps : qui remplace Mbappé pour Brésil-France ?",           summary:"Lucas Chevalier, Kalulu et Akliouche sont attendus dans la liste.", time:"il y a 2h" },
    { id:3, source:"90MIN",     hot:true,  icon:"❌", title:"Finalissima annulée : Espagne-Argentine ne se jouera pas",              summary:"Le match au Qatar est officiellement annulé.", time:"il y a 3h" },
    { id:4, source:"GLOBO",     hot:false, icon:"🇧🇷", title:"Vinicius Jr. titulaire face à la France au Gillette Stadium",           summary:"L'attaquant du Real Madrid sera disponible pour l'amical du 26 mars.", time:"il y a 4h" },
    { id:5, source:"AS",        hot:false, icon:"🇦🇷", title:"Messi présent avec l'Argentine pour l'amical face au Qatar",            summary:"Le septuple Ballon d'Or sera là pour le match du 31 mars.", time:"il y a 5h" },
    { id:6, source:"BBC SPORT", hot:false, icon:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", title:"England vs Belgium at Wembley, then Japan — Southgate's squad named",  summary:"Full squad selected for the two March friendlies.", time:"il y a 6h" },
    { id:7, source:"RMC SPORT", hot:false, icon:"🎙️", title:"Maroc : Brahim Diaz convoqué pour les amicaux de mars",                summary:"L'international marocain du Real Madrid dans la liste.", time:"il y a 8h" },
    { id:8, source:"EUROSPORT", hot:false, icon:"📅", title:"17 amicaux impliquant des équipes qualifiées WC du 24 mars au 1er avril", summary:"Programme complet de la trêve internationale de mars 2026.", time:"il y a 10h" },
  ],
};


// ── DONNÉES RAF ───────────────────────────────────────
const RAF = {
  lastUpdate: "21 mars 2026",
  classement: { pos:5, pts:43, j:28, v:13, n:14, d:1, bp:38, bc:21 },
  serie: "14 matchs sans défaite en 2026",
  recents: [
    { id:"r28", journee:"J28", home:"Rodez AF", hL:"🔴", away:"Bastia",    aL:"🔵", date:"20 mars", status:"done", score:{h:1,a:1}, result:"N",
      resume:{ texte:"Le RAF dominait mais Bastia arrache le nul. Arconte ouvre sur penalty (24'), Eickmayer égalise (40'). Braat impérial en 2e mi-temps avec deux arrêts décisifs.", buts:["24' Arconte pen. (RAF)","40' Eickmayer (Bastia)"], cartons:[], motm:"Quentin Braat" }},
    { id:"r27", journee:"J27", home:"Reims",     hL:"⚪", away:"Rodez AF", aL:"🔴", date:"14 mars", status:"done", score:{h:1,a:2}, result:"V",
      resume:{ texte:"Superbe victoire 2-1 a Reims chez le 2e du classement. 13e match sans defaite, belle demonstration a l'exterieur.", buts:["Reims 1","RAF 2"], cartons:[], motm:"A preciser" }},
    { id:"r26", journee:"J26", home:"Rodez AF",  hL:"🔴", away:"Grenoble", aL:"🔵", date:"6 mars",  status:"done", score:{h:1,a:0}, result:"V",
      resume:{ texte:"Victoire solide 1-0 a domicile. 11e match sans defaite. Belle maitrise defensive de Santini.", buts:["RAF 1"], cartons:[], motm:"A preciser" }},
  ],
  prochains: [
    { id:"r29", journee:"J29", home:"Dunkerque", hL:"🔵", away:"Rodez AF",  aL:"🔴", date:"Ven 3 avr 20h00",  venue:"Marcel-Tribut, Dunkerque", status:"future", score:null },
    { id:"r30", journee:"J30", home:"Rodez AF",  hL:"🔴", away:"Troyes",    aL:"🔵", date:"Lun 13 avr 20h45", venue:"Paul-Lignon, Rodez",       status:"future", score:null },
    { id:"r31", journee:"J31", home:"Concarneau",hL:"🔵", away:"Rodez AF",  aL:"🔴", date:"Sam 19 avr 15h00", venue:"Roudourou, Concarneau",     status:"future", score:null },
  ],
  news: [
    { id:1, hot:true,  icon:"fire", title:"14 matchs sans defaite : le RAF en route pour les play-offs",     summary:"Rodez porte sa serie a 14 matchs sans defaite en 2026. 5e a 43 pts, a 2 points seulement du 4e." },
    { id:2, hot:true,  icon:"goal", title:"Arconte : 10 buts cette saison, meilleur buteur ruthénois",        summary:"Son penalty contre Bastia lui permet d'atteindre 10 buts. Il est le principal danger offensif du RAF." },
    { id:3, hot:false, icon:"glove",title:"Braat impérial : sa double-parade contre Bastia a sauvé le point",summary:"Deux arrets decisifs sur Zaouai en 2e mi-temps, le gardien ruthénois a ete indispensable." },
    { id:4, hot:false, icon:"cal",  title:"Prochain match : deplaçement à Dunkerque le 3 avril",             summary:"Dunkerque (8e, 38 pts) recoit le RAF au Marcel-Tribut. Match cle pour la course aux play-offs." },
    { id:5, hot:false, icon:"chart",title:"Classement : 5e a 43 pts, a 2 pts des play-offs directs",         summary:"Avec 6 journées restantes, Rodez peut encore viser les play-offs. Chaque victoire compte." },
  ],
};

const PLAYERS = [
  { id:"seb", name:"Sébastien", emoji:"😎", pin:"1234" },
  { id:"ste", name:"Stéphane",  emoji:"🤓", pin:"5678" },
  { id:"gui", name:"Guilhem",   emoji:"🧐", pin:"9012" },
];
const SK = "mondial2026-v4";

function calcPts(pronos, results) {
  let p=0,c=0,e=0;
  (pronos||[]).forEach(x=>{
    const r=results[x.matchId]; if(!r) return;
    const ex=x.s1===r.s1&&x.s2===r.s2, ok=Math.sign(x.s1-x.s2)===Math.sign(r.s1-r.s2);
    if(ex){p+=5;c++;e++;}else if(ok){p+=3;c++;}
  });
  return{p,c,e};
}

function calcStats(pronos, results) {
  let pts=0, bons=0, exacts=0, nuls=0;
  let serie=0, meilleureSerie=0, serieEnCours=0;
  const history = [];
  const allMatchIds = Object.keys(results);
  (pronos||[]).forEach(x=>{
    const r=results[x.matchId]; if(!r) return;
    const ex=x.s1===r.s1&&x.s2===r.s2;
    const ok=Math.sign(x.s1-x.s2)===Math.sign(r.s1-r.s2);
    const pt = ex?5:ok?3:0;
    pts+=pt; if(pt>0){bons++;serieEnCours++;}else{serieEnCours=0;}
    if(ex) exacts++;
    if(pt===0) nuls++;
    meilleureSerie=Math.max(meilleureSerie,serieEnCours);
    history.push({matchId:x.matchId,s1:x.s1,s2:x.s2,r,pt,ex,ok});
  });
  const joues=history.length;
  const taux=joues>0?Math.round(bons/joues*100):0;
  return{pts,bons,exacts,nuls,joues,taux,meilleureSerie,history};
}

// ── HELPER COTES ─────────────────────────────────────
function getOddsForMatch(odds, home, away) {
  if (!odds || !home || !away) return null;
  // Cherche par nom normalisé
  const normalize = s => s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  const key = Object.keys(odds).find(k => {
    const o = odds[k];
    return (normalize(o.homeTeam||"").includes(normalize(home).slice(0,5)) ||
            normalize(home).includes(normalize(o.homeTeam||"").slice(0,5))) &&
           (normalize(o.awayTeam||"").includes(normalize(away).slice(0,5)) ||
            normalize(away).includes(normalize(o.awayTeam||"").slice(0,5)));
  });
  return key ? odds[key] : null;
}

// ── PALETTE DARK NÉON ──────────────────────────────────
const D = {
  bg:    "#0A0E1A",
  card:  "rgba(13,27,62,0.9)",
  border:"rgba(0,212,255,0.18)",
  borderHover:"rgba(0,212,255,0.4)",
  cyan:  "#00D4FF",
  or:    "#F5C518",
  rouge: "#E8002D",
  vert:  "#00E87A",
  gris:  "#8A97B0",
  blanc: "#F0F4FF",
  acier: "#1A2E5A",
  rmd:   "10px",
  rlg:   "14px",
};

// ── HOOK MOBILE ──────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@300;400;500&display=swap');
  body { background:${D.bg}; color:${D.blanc}; font-family:'Barlow',sans-serif; }
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.2)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shk{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:${D.bg}}
  ::-webkit-scrollbar-thumb{background:${D.acier};border-radius:3px}
  .mobile-nav { display:none; }
  @media (max-width:767px) {
    .desktop-nav { display:none !important; }
    .desktop-sidebar { display:none !important; }
    .mobile-nav { display:flex !important; }
    .main-grid { grid-template-columns:1fr !important; padding:12px !important; }
    .hero-flags { display:none !important; }
    .hero-counters { display:none !important; }
    .ticker-text { font-size:11px !important; }
    .header-inner { padding:0 12px !important; }
    .match-emoji { font-size:32px !important; }
  }
`;

// ── COMPOSANT PIN ─────────────────────────────────────
function PinPanel({ onSuccess, onCancel }) {
  const [player, setPlayer] = useState(PLAYERS[0]);
  const [val,    setVal]    = useState("");
  const [err,    setErr]    = useState("");
  const [shake,  setShake]  = useState(false);

  function tap(k) {
    if (val.length >= 4) return;
    const next = val + k; setVal(next);
    if (next.length === 4) {
      if (next === player.pin) { onSuccess(player); }
      else {
        setShake(true); setErr("Code incorrect !");
        setTimeout(() => { setVal(""); setShake(false); }, 700);
      }
    }
  }

  return (
    <div style={{background:"rgba(0,212,255,0.04)", border:`1px solid ${D.cyan}`, borderRadius:D.rlg, padding:"18px 14px", textAlign:"center"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:2, color:D.cyan, textTransform:"uppercase"}}>🔐 Connexion</span>
        <button onClick={onCancel} style={{fontSize:12, color:D.gris, background:"none", border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1}}>Annuler</button>
      </div>

      {/* Profils */}
      <div style={{display:"flex", gap:8, justifyContent:"center", marginBottom:16}}>
        {PLAYERS.map(p => (
          <button key={p.id} onClick={() => { setPlayer(p); setVal(""); setErr(""); }}
            style={{padding:"8px 10px", borderRadius:D.rmd, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700,
              border:`1px solid ${player.id===p.id ? D.cyan : D.border}`,
              background: player.id===p.id ? "rgba(0,212,255,0.12)" : D.card,
              color: player.id===p.id ? D.cyan : D.gris}}>
            <div style={{fontSize:22, marginBottom:3}}>{p.emoji}</div>
            {p.name}
          </button>
        ))}
      </div>

      {/* Points */}
      <div style={{display:"flex", gap:12, justifyContent:"center", marginBottom:10, animation:shake?"shk .6s ease":"none"}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{width:14, height:14, borderRadius:"50%",
            border:`2px solid ${val.length>i ? D.cyan : D.gris}`,
            background: val.length>i ? D.cyan : "transparent",
            boxShadow: val.length>i ? `0 0 8px ${D.cyan}` : "none",
            transition:"all .15s"}} />
        ))}
      </div>
      {err && <div style={{fontSize:12, color:D.rouge, marginBottom:8, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5}}>{err}</div>}

      {/* Clavier */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, maxWidth:195, margin:"0 auto 8px"}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i) => (
          <button key={i}
            onClick={() => k==="⌫" ? setVal(v=>v.slice(0,-1)) : k!=="" ? tap(String(k)) : null}
            style={{height:50, borderRadius:D.rmd, fontFamily:"'Bebas Neue',sans-serif",
              border:`1px solid ${D.border}`,
              background: k===""?"transparent": "rgba(255,255,255,0.05)",
              color: k==="⌫" ? D.gris : D.blanc,
              fontSize: k==="⌫" ? 13 : 20,
              cursor: k===""?"default":"pointer", opacity:k===""?0:1}}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── SECTION TITLE ─────────────────────────────────────
function ST({ children }) {
  return (
    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:D.gris, display:"flex", alignItems:"center", gap:10, paddingBottom:10, borderBottom:`1px solid ${D.border}`, marginBottom:14}}>
      <span style={{width:18, height:2, background:D.cyan, display:"inline-block"}} />
      {children}
    </div>
  );
}

// ── TAB BUTTON ────────────────────────────────────────
function TB({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{padding:"7px 14px", borderRadius:D.rmd, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase",
      border:`1px solid ${active ? D.cyan : D.border}`,
      background: active ? "rgba(0,212,255,0.12)" : "transparent",
      color: active ? D.cyan : D.gris}}>
      {children}
    </button>
  );
}

// ── APP ───────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [pronos,  setPronos]  = useState({});
  const [ready,   setReady]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [auth,    setAuth]    = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [mainTab, setMainTab] = useState("amicaux");
  const [amiTab,  setAmiTab]  = useState("avenir");
  const [selM,       setSelM]       = useState(null);
  const [modalMatch, setModalMatch] = useState(null); // match dont on affiche le résumé
  const [s1,         setS1]         = useState(1);
  const [s2,      setS2]      = useState(0);
  const [toast,   setToast]   = useState(null);
  const tRef = useRef(null);
  const [classL2,      setClassL2]      = useState([]);
  const [rafFb,        setRafFb]        = useState(null);
  const [lastUpdateFb, setLastUpdateFb] = useState(null);
  const [highlights,   setHighlights]   = useState({});
  const [statsPlayer,  setStatsPlayer]  = useState(null);
  const [odds,         setOdds]         = useState({});

  useEffect(() => {
    // Ecoute les pronos en temps reel
    const unsubPronos = onValue(ref(db, "pronos"), snap => {
      const data = snap.val();
      if (data) setPronos(data);
      setReady(true);
    }, () => { setReady(true); });

    // Ecoute le classement L2
    const unsubL2 = onValue(ref(db, "classementL2"), snap => {
      const data = snap.val();
      if (data) {
        const arr = Array.isArray(data) ? data : Object.values(data);
        const filtered = arr.filter(t => t && t.team);
        console.log("L2 data received:", filtered.length, "teams");
        setClassL2(filtered);
      }
    });

    // Ecoute les stats RAF
    const unsubRaf = onValue(ref(db, "raf/classement"), snap => {
      if (snap.val()) setRafFb(snap.val());
    });

    // Ecoute lastUpdate
    const unsubMeta = onValue(ref(db, "meta/lastUpdate"), snap => {
      if (snap.val()) setLastUpdateFb(snap.val());
    });

    // Ecoute les highlights YouTube
    const unsubHL = onValue(ref(db, "highlights"), snap => {
      if (snap.val()) setHighlights(snap.val());
    });

    // Ecoute les cotes
    const unsubOdds = onValue(ref(db, "odds"), snap => {
      if (snap.val()) setOdds(snap.val());
    });

    return () => { unsubPronos(); unsubL2(); unsubRaf(); unsubMeta(); unsubHL(); unsubOdds(); };
  }, []);

  const results = {};
  DATA.amicaux.filter(f=>f.status==="done"&&f.score).forEach(f=>{results[f.id]=f.score;});

  const board = PLAYERS.map(p => {
    const {p:pt,c,e} = calcPts(pronos[p.id], results);
    return {...p, pt, c, e, n:(pronos[p.id]||[]).length};
  }).sort((a,b)=>b.pt-a.pt);

  function handleLogin(player) { setAuth(player); setShowPin(false); flash(`${player.emoji} ${player.name} connecté`); }
  function logout() { setAuth(null); setShowPin(false); setSelM(null); flash("Déconnecté"); }

  function valider() {
    if (!auth||!selM) return;
    const prev=(pronos[auth.id]||[]).filter(p=>p.matchId!==selM.id);
    const upd={...pronos,[auth.id]:[...prev,{matchId:selM.id,s1:+s1,s2:+s2,ts:Date.now()}]};
    setPronos(upd);
    set(ref(db,"pronos"), upd)
      .then(()=>{ setSelM(null); flash(`${auth.emoji} ${selM.home} ${s1}–${s2} ${selM.away} sauvegardé ✓`); })
      .catch(()=>flash("Erreur de sauvegarde"));
  }

  const [confirmReset, setConfirmReset] = useState(false);

  function resetPronos() {
    const empty = {};
    setPronos(empty);
    set(ref(db,"pronos"), empty)
      .then(()=>{ setConfirmReset(false); flash("🏆 Classement remis à zéro pour la WC 2026 !"); })
      .catch(()=>{ setConfirmReset(false); flash("Reset effectué"); });
  }

  function flash(msg) { setToast(msg); clearTimeout(tRef.current); tRef.current=setTimeout(()=>setToast(null),3000); }

  // Injecte les cotes dans les matchs
  const amicauxWithOdds = DATA.amicaux.map(f => ({
    ...f,
    odds: getOddsForMatch(odds, f.home, f.away)
  }));
  const future = amicauxWithOdds.filter(f=>f.status==="future");
  const live   = amicauxWithOdds.filter(f=>f.status==="live");
  const done   = amicauxWithOdds.filter(f=>f.status==="done");

  const grouped = {};
  future.forEach(f => { const d=f.date.split("·")[0].trim(); if(!grouped[d])grouped[d]=[]; grouped[d].push(f); });

  const tickerText = `🚨 Mbappé FORFAIT mars   ·   Brésil 🇧🇷 vs France 🇫🇷 — 26 mars · 21h00 · TF1   ·   France 🇫🇷 vs Colombie 🇨🇴 — 29 mars   ·   Finalissima ANNULÉE   ·   Angleterre 🏴󠁧󠁢󠁥󠁮󠁧󠁿 vs Belgique 🇧🇪 — 25 mars · Wembley   ·   Allemagne 🇩🇪 vs Pays-Bas 🇳🇱 — 25 mars · Munich   ·   `;

  return (
    <div style={{background:D.bg, color:D.blanc, fontFamily:"'Barlow',sans-serif", minHeight:"100vh", paddingBottom:48}}>
      <style>{CSS}</style>

      {/* ── TICKER ── */}
      <div style={{background:D.rouge, height:32, overflow:"hidden", display:"flex", alignItems:"center"}}>
        <div style={{padding:"0 14px", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:"#fff", flexShrink:0}}>🔴 EN DIRECT</div>
        <div style={{overflow:"hidden", flex:1}}>
          <span style={{display:"inline-block", whiteSpace:"nowrap", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:600, color:"rgba(255,255,255,.92)", animation:"ticker 45s linear infinite", paddingLeft:16}}>
            {tickerText}{tickerText}
          </span>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="header-inner" style={{background:"rgba(10,14,26,0.97)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${D.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, gap:12, position:"sticky", top:0, zIndex:50}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:36, height:36, background:"linear-gradient(135deg,#E8002D,#F5C518)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16}}>⚽</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2}}>MONDIAL <span style={{color:D.cyan}}>2026</span></div>
        </div>

        {/* Nav desktop */}
        <nav className="desktop-nav" style={{display:"flex", gap:3}}>
          {[["amicaux","🤝 Amicaux"],["actu","📰 Actu"],["wc","⚽ WC 2026"],["raf","🔴 RAF"],["stats","📊 Stats"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setMainTab(id)} style={{padding:"7px 12px", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", cursor:"pointer",
              border:"none", borderBottom:`2px solid ${mainTab===id?(id==="raf"?"#E8002D":D.cyan):"transparent"}`,
              background:"transparent", color:mainTab===id?(id==="raf"?"#E8002D":D.cyan):D.gris, marginBottom:-1}}>
              {lbl}
            </button>
          ))}
        </nav>

        <div style={{display:"flex", gap:6, alignItems:"center"}}>
          <button onClick={()=>window.open('https://claude.ai','_blank')}
            style={{padding:"5px 10px", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, background:"rgba(0,212,255,0.08)", border:`1px solid ${D.border}`, color:D.cyan, borderRadius:D.rmd, cursor:"pointer"}}>
            ↻ MAJ
          </button>
          {auth
            ? <button onClick={logout} style={{display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:16, border:`1px solid rgba(0,232,122,0.4)`, background:"rgba(0,232,122,0.08)", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:D.vert, cursor:"pointer"}}>
                <span style={{width:5, height:5, borderRadius:"50%", background:D.vert, animation:"pulse 1.5s infinite", display:"inline-block"}} />
                {auth.emoji} {isMobile ? "" : auth.name}
              </button>
            : null
          }
          {live.length > 0 && (
            <div style={{display:"flex", alignItems:"center", gap:5, padding:"5px 10px", border:`1px solid rgba(0,232,122,0.3)`, borderRadius:16, background:"rgba(0,232,122,0.07)", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:D.vert}}>
              <span style={{width:5, height:5, borderRadius:"50%", background:D.vert, animation:"pulse 1.5s infinite", display:"inline-block"}} />
              LIVE
            </div>
          )}
        </div>
      </header>

      {/* ── NAV MOBILE (barre du bas) ── */}
      <nav className="mobile-nav" style={{position:"fixed", bottom:0, left:0, right:0, zIndex:100, background:"rgba(10,14,26,0.98)", backdropFilter:"blur(20px)", borderTop:`1px solid ${D.border}`, display:"flex", height:58, paddingBottom:"env(safe-area-inset-bottom)"}}>
        {[["amicaux","🤝","Amicaux"],["actu","📰","Actu"],["raf","🔴","RAF"],["stats","📊","Stats"],["pronos","🏆","Pronos"]].map(([id,emoji,lbl])=>(
          <button key={id} onClick={()=>{if(id==="pronos"){setShowPin(p=>!p); setMainTab("amicaux");}else{setMainTab(id); setShowPin(false);}}}
            style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, border:"none",
              background: mainTab===id?"rgba(0,212,255,0.08)":"transparent",
              borderTop: mainTab===id?`2px solid ${id==="raf"?"#E8002D":D.cyan}`:"2px solid transparent",
              cursor:"pointer"}}>
            <span style={{fontSize:18}}>{emoji}</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:1, color:mainTab===id?(id==="raf"?"#E8002D":D.cyan):D.gris, textTransform:"uppercase"}}>{lbl}</span>
          </button>
        ))}
      </nav>

      {/* ── HERO ── */}
      <div style={{background:"linear-gradient(135deg,#0D1B3E 0%,#1A0A2E 40%,#0A1428 100%)", padding:"22px 24px 18px", borderBottom:`1px solid ${D.border}`, position:"relative", overflow:"hidden"}}>
        <div style={{position:"absolute", right:-10, top:"50%", transform:"translateY(-50%)", fontFamily:"'Bebas Neue',sans-serif", fontSize:100, color:"rgba(255,255,255,0.025)", letterSpacing:4, whiteSpace:"nowrap", pointerEvents:"none"}}>MONDIAL 2026</div>
        <div style={{display:"flex", alignItems:"center", gap:24, flexWrap:"wrap"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:40, lineHeight:1, letterSpacing:3}}>Coupe du Monde<br/><span style={{color:D.or}}>FIFA 2026</span></div>
            <div style={{fontSize:13, color:"#C0CDE0", marginTop:6}}>🇺🇸 <strong style={{color:D.cyan}}>USA</strong> · 🇨🇦 <strong style={{color:D.cyan}}>Canada</strong> · 🇲🇽 <strong style={{color:D.cyan}}>Mexique</strong> · 11 juin – 19 juillet 2026</div>
            <div className="hero-flags" style={{fontSize:20, display:"flex", gap:5, marginTop:8, flexWrap:"wrap"}}>🇧🇷 🇫🇷 🇩🇪 🇦🇷 🇪🇸 🇵🇹 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🇧🇪 🇸🇳 🇯🇵 🇲🇦 🇰🇷 🇲🇽 🇺🇸 🇨🇦 🇺🇾 🇭🇷 🇳🇱 🇨🇴 🇨🇭</div>
          </div>
          <div className="hero-counters" style={{display:"flex", gap:10, marginLeft:"auto", flexShrink:0}}>
            {[[String(DATA.amicaux.length),"Amicaux"],[String(future.length),"À venir"],[String(live.length),"En cours"],[String(done.length),"Terminés"]].map(([n,l])=>(
              <div key={l} style={{textAlign:"center", background:"rgba(255,255,255,0.04)", border:`1px solid ${D.border}`, padding:"10px 14px", borderRadius:12}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:D.or, lineHeight:1}}>{n}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:D.gris, letterSpacing:1.5, textTransform:"uppercase", marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CORPS ── */}
      <div className="main-grid" style={{padding:"20px 24px", display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start", paddingBottom: isMobile?"80px":"20px"}}>

        {/* Colonne principale */}
        <div>

          {/* AMICAUX */}
          {mainTab==="amicaux" && <>

            {/* Match vedette */}
            <div style={{background:"linear-gradient(135deg,rgba(0,212,255,0.06),rgba(245,197,24,0.04))", border:`1px solid rgba(0,212,255,0.3)`, borderRadius:D.rlg, padding:"18px 20px", marginBottom:20}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.cyan, textTransform:"uppercase", marginBottom:14}}>⭐ Match à la une</div>
              <div style={{display:"flex", alignItems:"center", gap:20, flexWrap:"wrap"}}>
                <div style={{display:"flex", alignItems:"center", gap:16}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:52}}>🇧🇷</div><div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, marginTop:6}}>Brésil</div></div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:D.gris, letterSpacing:6}}>VS</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.or, marginTop:2, fontWeight:700}}>26 MARS</div>
                  </div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:52}}>🇫🇷</div><div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, marginTop:6}}>France</div></div>
                </div>
                <div style={{flex:1, minWidth:180}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, marginBottom:5}}>26 mars 2026 · 21h00</div>
                  <div style={{fontSize:13, color:"#C0CDE0", marginBottom:3}}>📍 Gillette Stadium · Foxborough, Boston</div>
                  <div style={{fontSize:13, color:"#C0CDE0", marginBottom:3}}>📺 TF1 & TF1+</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, color:D.rouge}}>🚨 Mbappé forfait</div>
                </div>
              </div>
            </div>

            {/* Sous-onglets */}
            <div style={{display:"flex", gap:6, marginBottom:16}}>
              <TB active={amiTab==="avenir"} onClick={()=>setAmiTab("avenir")}>📅 À venir ({future.length})</TB>
              <TB active={amiTab==="live"}   onClick={()=>setAmiTab("live")}>🔴 En cours ({live.length})</TB>
              <TB active={amiTab==="termine"} onClick={()=>setAmiTab("termine")}>✅ Terminés ({done.length})</TB>
            </div>

            {amiTab==="avenir" && Object.entries(grouped).map(([day,matches])=>(
              <div key={day} style={{marginBottom:22}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:10, paddingBottom:7, borderBottom:`1px solid ${D.border}`}}>
                  📅 {day}
                </div>
                {matches.map(f=><MatchCard key={f.id} f={f} myProno={(pronos[auth?.id]||[]).find(p=>p.matchId===f.id)} onProno={()=>{if(!auth){setShowPin(true);return;}setSelM(f);setS1(1);setS2(0);}} onResume={()=>setModalMatch(f)}/>)}
              </div>
            ))}

            {amiTab!=="avenir" && ((amiTab==="live"?live:done).length===0
              ? <div style={{textAlign:"center", padding:"40px 0", color:D.gris, fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, letterSpacing:1}}>
                  Aucun match {amiTab==="live"?"en cours":"terminé"} pour l'instant.
                </div>
              : (amiTab==="live"?live:done).map(f=><MatchCard key={f.id} f={f} myProno={(pronos[auth?.id]||[]).find(p=>p.matchId===f.id)} onProno={()=>{}} onResume={()=>setModalMatch(f)}/>)
            )}
          </>}

          {/* ACTUALITÉS */}
          {mainTab==="actu" && (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {DATA.news.map((n,i)=>(
                <div key={n.id} style={{background:D.card, borderRadius:D.rlg, padding:"14px 16px", display:"flex", gap:12,
                  border:`1px solid ${n.hot?"rgba(232,0,45,0.3)":D.border}`,
                  borderLeft:`3px solid ${n.hot?D.rouge:D.border}`,
                  animation:`fadeIn .4s ease ${i*.05}s both`}}>
                  <div style={{fontSize:26, flexShrink:0, paddingTop:2}}>{n.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.cyan}}>{n.source}</span>
                      {n.hot&&<span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, background:"rgba(232,0,45,0.2)", color:"#ff6b8a", padding:"1px 6px", borderRadius:3, fontWeight:700, letterSpacing:1}}>CHAUD</span>}
                      <span style={{fontSize:11, color:D.gris, marginLeft:"auto"}}>{n.time}</span>
                    </div>
                    <div style={{fontSize:14, fontWeight:500, lineHeight:1.45, marginBottom:4, color:D.blanc}}>{n.title}</div>
                    <div style={{fontSize:12, color:"#C0CDE0", lineHeight:1.55}}>{n.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WC 2026 */}
          {mainTab==="wc" && (
            <div style={{textAlign:"center", padding:"60px 20px"}}>
              <div style={{fontSize:52, marginBottom:14}}>⏳</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:3, color:D.or, marginBottom:8}}>11 JUIN 2026</div>
              <div style={{fontSize:15, color:"#C0CDE0", marginBottom:5}}>Coup d'envoi de la Coupe du Monde FIFA 2026</div>
              <div style={{fontSize:13, color:D.gris}}>Les matchs, scores et stats apparaîtront ici dès le début du tournoi.</div>
            </div>
          )}

          {/* ── RAF ── */}
          {mainTab==="raf" && (
            <div>
              {/* Hero RAF */}
              <div style={{background:"linear-gradient(135deg,rgba(232,0,45,0.12),rgba(13,27,62,0.9))", border:"1px solid rgba(232,0,45,0.3)", borderRadius:D.rlg, padding:"18px 20px", marginBottom:20}}>
                <div style={{display:"flex", alignItems:"center", gap:16, flexWrap:"wrap"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:"#E8002D", lineHeight:1}}>RAF</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.gris, letterSpacing:2}}>RODEZ AF</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:5}}>
                      <span style={{color:"#E8002D"}}>{(rafFb||RAF.classement).pos}e</span> en Ligue 2 — {(rafFb||RAF.classement).pts} pts
                    </div>
                    <div style={{fontSize:13, color:"#C0CDE0", marginBottom:4}}>
                      {(rafFb||RAF.classement).j}J · {(rafFb||RAF.classement).v}V {(rafFb||RAF.classement).n}N {(rafFb||RAF.classement).d}D · {(rafFb||RAF.classement).bp} buts pour · {(rafFb||RAF.classement).bc} contre
                    </div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:"#F5C518"}}>{RAF.serie}</div>
                  </div>
                  <div style={{display:"flex", gap:8, flexShrink:0}}>
                    {[["Play-offs","2 pts"],["Classement",RAF.classement.pos+"e"],["Points",RAF.classement.pts]].map(([l,v])=>(
                      <div key={l} style={{textAlign:"center", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(232,0,45,0.2)", padding:"8px 12px", borderRadius:10}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#E8002D", lineHeight:1}}>{v}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:D.gris, letterSpacing:1, marginTop:3}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resultats recents */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:10, paddingBottom:7, borderBottom:`1px solid ${D.border}`}}>
                Resultats recents
              </div>
              {RAF.recents.map(m=>(
                <div key={m.id} style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"13px 16px", marginBottom:10}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:"#E8002D", fontWeight:700}}>{m.journee} Ligue 2</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.gris}}>{m.date}</span>
                  </div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
                    <div style={{textAlign:"center", flex:1}}>
                      <div style={{fontSize:32}}>{m.hL}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginTop:4, color:m.home==="Rodez AF"?"#E8002D":D.blanc}}>{m.home}</div>
                    </div>
                    <div style={{textAlign:"center", minWidth:90}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:3, color:m.result==="V"?"#00E87A":m.result==="N"?"#F5C518":"#E8002D"}}>{m.score.h}–{m.score.a}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:m.result==="V"?"#00E87A":m.result==="N"?"#F5C518":"#E8002D"}}>{m.result==="V"?"VICTOIRE":m.result==="N"?"NUL":"DEFAITE"}</div>
                    </div>
                    <div style={{textAlign:"center", flex:1}}>
                      <div style={{fontSize:32}}>{m.aL}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginTop:4, color:m.away==="Rodez AF"?"#E8002D":D.blanc}}>{m.away}</div>
                    </div>
                  </div>
                  {m.resume && m.resume.motm && <div style={{textAlign:"center", fontSize:11, color:D.or, marginTop:6, fontFamily:"'Barlow Condensed',sans-serif"}}>Homme du match : {m.resume.motm}</div>}
                  {m.resume && m.resume.buts && m.resume.buts.length>0 && (
                    <div style={{marginTop:7, padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:6}}>
                      {m.resume.buts.map((b,i)=><div key={i} style={{fontSize:11, color:"#C0CDE0", padding:"2px 0"}}>{b}</div>)}
                    </div>
                  )}
                </div>
              ))}

              {/* Prochains matchs */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginTop:20, marginBottom:10, paddingBottom:7, borderBottom:`1px solid ${D.border}`}}>
                Prochains matchs
              </div>
              {RAF.prochains.map(m=>(
                <div key={m.id} style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"13px 16px", marginBottom:10}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:"#E8002D", fontWeight:700}}>{m.journee} Ligue 2</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:"#F5C518", fontWeight:700}}>{m.date}</span>
                  </div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
                    <div style={{textAlign:"center", flex:1}}>
                      <div style={{fontSize:36}}>{m.hL}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginTop:4, color:m.home==="Rodez AF"?"#E8002D":D.blanc}}>{m.home}</div>
                    </div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:D.gris, letterSpacing:5}}>VS</div>
                    <div style={{textAlign:"center", flex:1}}>
                      <div style={{fontSize:36}}>{m.aL}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginTop:4, color:m.away==="Rodez AF"?"#E8002D":D.blanc}}>{m.away}</div>
                    </div>
                  </div>
                  {m.venue && <div style={{textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.gris, marginTop:8}}>📍 {m.venue}</div>}
                  <div style={{marginTop:10, textAlign:"center"}}>
                    <button onClick={()=>{if(!auth){setShowPin(true);return;} setSelM(m); setS1(1); setS2(0);}}
                      style={{padding:"6px 18px", borderRadius:"8px", border:"1px solid rgba(232,0,45,0.3)", background:"rgba(232,0,45,0.08)", color:"#E8002D", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1}}>
                      Pronostiquer
                    </button>
                  </div>
                  {auth && (pronos[auth.id]||[]).find(p=>p.matchId===m.id) && (
                    <div style={{marginTop:6, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:"#00D4FF", textAlign:"center", background:"rgba(0,212,255,0.08)", borderRadius:6, padding:"3px 0"}}>
                      Mon prono : {(pronos[auth.id]||[]).find(p=>p.matchId===m.id).s1}–{(pronos[auth.id]||[]).find(p=>p.matchId===m.id).s2}
                    </div>
                  )}
                </div>
              ))}

              {/* Classement Ligue 2 */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginTop:20, marginBottom:10, paddingBottom:7, borderBottom:`1px solid ${D.border}`}}>
                🏆 Classement Ligue 2
              </div>
              {classL2.length > 0 ? (
                <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, overflow:"hidden", marginBottom:20}}>
                  {/* Header tableau */}
                  <div style={{display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 36px 36px 36px 36px 40px", gap:4, padding:"8px 12px", borderBottom:`1px solid ${D.border}`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:1, color:D.gris, textTransform:"uppercase"}}>
                    <span>#</span><span>Équipe</span><span style={{textAlign:"center"}}>J</span><span style={{textAlign:"center"}}>V</span><span style={{textAlign:"center"}}>N</span><span style={{textAlign:"center"}}>D</span><span style={{textAlign:"center"}}>BP</span><span style={{textAlign:"center"}}>BC</span><span style={{textAlign:"center"}}>Pts</span>
                  </div>
                  {classL2.map((t,i)=>(
                    <div key={i} style={{display:"grid", gridTemplateColumns:"28px 1fr 36px 36px 36px 36px 36px 36px 40px", gap:4, padding:"7px 12px",
                      borderBottom: i<classL2.length-1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                      background: t.isRAF ? "rgba(232,0,45,0.08)" : "transparent",
                      borderLeft: t.isRAF ? "3px solid #E8002D" : "3px solid transparent",
                    }}>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color: i<2?"#00E87A": i<4?"#F5C518": i>=classL2.length-3?"#E8002D":D.gris}}>{t.pos}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight: t.isRAF?700:400, color: t.isRAF?"#E8002D":D.blanc, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.isRAF?"🔴 ":""}{t.team}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:D.gris}}>{t.j}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:"#00E87A"}}>{t.v}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:D.gris}}>{t.n}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:"#E8002D"}}>{t.d}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:D.gris}}>{t.bp}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, textAlign:"center", color:D.gris}}>{t.bc}</span>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:16, textAlign:"center", color: t.isRAF?"#E8002D":D.blanc, fontWeight: t.isRAF?700:400}}>{t.pts}</span>
                    </div>
                  ))}
                  <div style={{padding:"6px 12px", borderTop:`1px solid ${D.border}`, display:"flex", gap:12, flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#00E87A"}}>■ Montée directe</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#F5C518"}}>■ Play-offs</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#E8002D"}}>■ Relégation</span>
                    {lastUpdateFb && <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:D.gris, marginLeft:"auto"}}>MAJ {lastUpdateFb}</span>}
                  </div>
                </div>
              ) : (
                <div style={{padding:"16px", textAlign:"center", color:D.gris, fontSize:13, marginBottom:20}}>Classement en cours de chargement…</div>
              )}

              {/* Actus RAF */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginTop:20, marginBottom:10, paddingBottom:7, borderBottom:`1px solid ${D.border}`}}>
                Actualites RAF
              </div>
              {RAF.news.map((n,i)=>(
                <div key={n.id} style={{background:D.card, borderRadius:D.rlg, padding:"13px 15px", display:"flex", gap:12, marginBottom:8,
                  border:`1px solid ${n.hot?"rgba(232,0,45,0.3)":D.border}`,
                  borderLeft:`3px solid ${n.hot?"#E8002D":D.border}`}}>
                  <div style={{fontSize:22, flexShrink:0}}>{n.icon==="fire"?"🔥":n.icon==="goal"?"⚽":n.icon==="glove"?"🧤":n.icon==="cal"?"📅":"📊"}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:4}}>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:"#E8002D"}}>RAF LIGUE 2</span>
                      {n.hot && <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, background:"rgba(232,0,45,0.2)", color:"#ff6b8a", padding:"1px 6px", borderRadius:3, fontWeight:700}}>CHAUD</span>}
                    </div>
                    <div style={{fontSize:13, fontWeight:500, lineHeight:1.4, marginBottom:3, color:D.blanc}}>{n.title}</div>
                    <div style={{fontSize:12, color:"#C0CDE0", lineHeight:1.5}}>{n.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* ── STATS ── */}
          {mainTab==="stats" && (
            <div>
              {/* Header stats */}
              <div style={{background:"linear-gradient(135deg,rgba(0,212,255,0.06),rgba(13,27,62,0.9))", border:`1px solid rgba(0,212,255,0.3)`, borderRadius:D.rlg, padding:"16px 20px", marginBottom:20, textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3, marginBottom:4}}>📊 STATS <span style={{color:D.cyan}}>PRONOS</span></div>
                <div style={{fontSize:13, color:D.gris}}>Clique sur un joueur pour voir ses stats détaillées</div>
              </div>

              {/* Sélection joueur */}
              <div style={{display:"flex", gap:10, marginBottom:20, justifyContent:"center"}}>
                {PLAYERS.map(p=>(
                  <button key={p.id} onClick={()=>setStatsPlayer(statsPlayer?.id===p.id?null:p)}
                    style={{flex:1, padding:"12px 8px", borderRadius:D.rlg, cursor:"pointer", textAlign:"center",
                      border:`1px solid ${statsPlayer?.id===p.id?D.cyan:D.border}`,
                      background:statsPlayer?.id===p.id?"rgba(0,212,255,0.1)":D.card}}>
                    <div style={{fontSize:28, marginBottom:4}}>{p.emoji}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:statsPlayer?.id===p.id?D.cyan:D.blanc}}>{p.name}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:D.or, marginTop:2}}>
                      {calcPts(pronos[p.id], results).p} pts
                    </div>
                  </button>
                ))}
              </div>

              {/* Stats détaillées du joueur sélectionné */}
              {statsPlayer && (()=>{
                const st = calcStats(pronos[statsPlayer.id], results);
                const allMatchs = [...DATA.amicaux, ...RAF.prochains, ...RAF.recents];
                return (
                  <div style={{animation:"fadeIn .3s ease"}}>
                    {/* Carte principale */}
                    <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"18px", marginBottom:14}}>
                      <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:16}}>
                        <div style={{fontSize:40}}>{statsPlayer.emoji}</div>
                        <div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2}}>{statsPlayer.name}</div>
                          <div style={{fontSize:12, color:D.gris}}>{st.joues} pronostic{st.joues>1?"s":""} joué{st.joues>1?"s":""}</div>
                        </div>
                        <div style={{marginLeft:"auto", textAlign:"center"}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:D.or, lineHeight:1}}>{st.pts}</div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.gris, letterSpacing:1}}>POINTS</div>
                        </div>
                      </div>

                      {/* Grille de stats */}
                      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
                        {[
                          ["🎯","Taux",`${st.taux}%`,D.cyan],
                          ["✅","Exacts",st.exacts,D.vert],
                          ["🔥","Meilleure série",st.meilleureSerie,D.or],
                          ["❌","Manqués",st.nuls,"#ff6b8a"],
                        ].map(([ic,lbl,val,col])=>(
                          <div key={lbl} style={{background:"rgba(255,255,255,0.04)", border:`1px solid rgba(255,255,255,0.06)`, borderRadius:D.rmd, padding:"10px 8px", textAlign:"center"}}>
                            <div style={{fontSize:20, marginBottom:4}}>{ic}</div>
                            <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:col, lineHeight:1}}>{val}</div>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:D.gris, letterSpacing:1, marginTop:3, textTransform:"uppercase"}}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Barre de progression visuelle */}
                    <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"14px 16px", marginBottom:14}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:10}}>Répartition des pronos</div>
                      <div style={{display:"flex", gap:3, height:28, borderRadius:6, overflow:"hidden", marginBottom:8}}>
                        {st.joues > 0 && <>
                          <div style={{width:`${st.exacts/st.joues*100}%`, background:`linear-gradient(90deg,${D.vert},rgba(0,232,122,0.6))`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#000", minWidth: st.exacts>0?"20px":"0"}}>
                            {st.exacts>0?st.exacts:""}
                          </div>
                          <div style={{width:`${(st.bons-st.exacts)/st.joues*100}%`, background:`linear-gradient(90deg,${D.cyan},rgba(0,212,255,0.6))`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#000", minWidth: (st.bons-st.exacts)>0?"20px":"0"}}>
                            {(st.bons-st.exacts)>0?(st.bons-st.exacts):""}
                          </div>
                          <div style={{flex:1, background:"rgba(255,107,138,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#ff6b8a"}}>
                            {st.nuls>0?st.nuls:""}
                          </div>
                        </>}
                      </div>
                      <div style={{display:"flex", gap:12, fontSize:10, color:D.gris, fontFamily:"'Barlow Condensed',sans-serif"}}>
                        <span style={{color:D.vert}}>■ Score exact ({st.exacts})</span>
                        <span style={{color:D.cyan}}>■ Bon résultat ({st.bons-st.exacts})</span>
                        <span style={{color:"#ff6b8a"}}>■ Manqué ({st.nuls})</span>
                      </div>
                    </div>

                    {/* Historique des pronos */}
                    {st.history.length > 0 && (
                      <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, overflow:"hidden"}}>
                        <div style={{padding:"10px 14px", borderBottom:`1px solid ${D.border}`, fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase"}}>
                          Historique des pronos
                        </div>
                        {st.history.slice().reverse().map((h,i)=>{
                          const m = allMatchs.find(f=>f.id===h.matchId);
                          return (
                            <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                              borderBottom:i<st.history.length-1?`1px solid rgba(255,255,255,0.04)`:"none",
                              background:h.ex?"rgba(0,232,122,0.05)":h.ok?"rgba(0,212,255,0.05)":"rgba(255,107,138,0.04)"}}>
                              <div style={{fontSize:16, flexShrink:0}}>{h.ex?"✅":h.ok?"🎯":"❌"}</div>
                              <div style={{flex:1, minWidth:0}}>
                                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, color:D.blanc, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                                  {m?`${m.home} vs ${m.away}`:`Match #${h.matchId}`}
                                </div>
                                <div style={{fontSize:11, color:D.gris, marginTop:1}}>
                                  Mon prono : <strong style={{color:D.blanc}}>{h.s1}–{h.s2}</strong>
                                  {h.r && <span style={{marginLeft:8}}>Résultat : <strong style={{color:h.ex?D.vert:h.ok?D.cyan:"#ff6b8a"}}>{h.r.h}–{h.r.a}</strong></span>}
                                </div>
                              </div>
                              <div style={{textAlign:"right", flexShrink:0}}>
                                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:h.ex?D.vert:h.ok?D.cyan:"#ff6b8a", lineHeight:1}}>+{h.pt}</div>
                                <div style={{fontSize:9, color:D.gris}}>pts</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {st.joues === 0 && (
                      <div style={{textAlign:"center", padding:"30px", color:D.gris, fontSize:13}}>
                        {statsPlayer.emoji} {statsPlayer.name} n'a pas encore de pronos enregistrés.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Podium comparatif */}
              {!statsPlayer && (
                <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"16px", marginTop:4}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:14}}>Comparatif</div>
                  {PLAYERS.map(p=>{
                    const st=calcStats(pronos[p.id],results);
                    const max=Math.max(...PLAYERS.map(pp=>calcStats(pronos[pp.id],results).pts),1);
                    return(
                      <div key={p.id} style={{marginBottom:12}}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700}}>{p.emoji} {p.name}</span>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:D.or}}>{st.pts} pts</span>
                        </div>
                        <div style={{height:8, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden"}}>
                          <div style={{height:"100%", width:`${st.pts/max*100}%`, background:`linear-gradient(90deg,${D.acier},${D.cyan})`, borderRadius:4, transition:"width .6s ease"}}/>
                        </div>
                        <div style={{display:"flex", gap:10, marginTop:3, fontSize:10, color:D.gris, fontFamily:"'Barlow Condensed',sans-serif"}}>
                          <span>{st.taux}% réussite</span>
                          <span>{st.exacts} exacts</span>
                          <span>série {st.meilleureSerie}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        {/* ── SIDEBAR ── */}
        <div className="desktop-sidebar" style={{display:"flex", flexDirection:"column", gap:16}}>

          {/* Classement */}
          <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,rgba(245,197,24,0.1),rgba(245,197,24,0.03))", padding:"12px 16px", borderBottom:`1px solid ${D.border}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:1, color:D.or}}>🏆 CLASSEMENT PRONOS</span>
              <span>👑</span>
            </div>
            <div style={{padding:"6px 14px 12px"}}>
              {!ready
                ? <div style={{textAlign:"center", padding:"14px 0", color:D.gris, fontSize:13}}>Chargement…</div>
                : board.map((p,i)=>(
                  <div key={p.id} style={{display:"flex", alignItems:"center", gap:9, padding:"9px 0", borderBottom:i<2?`1px solid rgba(255,255,255,0.05)`:"none"}}>
                    <div style={{width:22, height:22, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:12,
                      background:i===0?"linear-gradient(135deg,#FFD700,#FFA500)":i===1?"linear-gradient(135deg,#C0C0C0,#888)":"linear-gradient(135deg,#CD7F32,#8B4513)",
                      color:i===2?"#fff":"#000"}}>{i+1}</div>
                    <div style={{fontSize:20}}>{p.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700}}>{p.name}</div>
                      <div style={{fontSize:10, color:D.gris, marginTop:1}}>{p.c} ok · {p.e} exacts · {p.n} joués</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:D.or, lineHeight:1}}>{p.pt}</div>
                      <div style={{fontSize:10, color:D.gris}}>pts</div>
                    </div>
                  </div>
                ))
              }
            </div>
            <div style={{padding:"6px 14px 12px", borderTop:`1px solid rgba(0,212,255,0.1)`}}>
              <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:10}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#C0CDE0", background:"rgba(0,232,122,0.08)", padding:"2px 7px", borderRadius:3}}>✅ Exact : 5 pts</span>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#C0CDE0", background:"rgba(0,212,255,0.08)", padding:"2px 7px", borderRadius:3}}>🎯 Résultat : 3 pts</span>
              </div>

              {/* Reset pour la WC */}
              {!confirmReset
                ? <button onClick={()=>setConfirmReset(true)}
                    style={{width:"100%", padding:"7px", borderRadius:D.rmd, border:`1px solid rgba(232,0,45,0.25)`, background:"transparent", color:"rgba(232,0,45,0.6)", fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer"}}>
                    🔄 Reset pour la WC 2026
                  </button>
                : <div style={{background:"rgba(232,0,45,0.08)", border:`1px solid rgba(232,0,45,0.4)`, borderRadius:D.rmd, padding:"10px 12px", textAlign:"center"}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:"#ff6b8a", fontWeight:700, letterSpacing:1, marginBottom:8}}>
                      ⚠️ Effacer TOUS les pronos ?
                    </div>
                    <div style={{fontSize:11, color:D.gris, marginBottom:10}}>Cette action est irréversible.</div>
                    <div style={{display:"flex", gap:7}}>
                      <button onClick={()=>setConfirmReset(false)}
                        style={{flex:1, padding:"7px", borderRadius:D.rmd, border:`1px solid ${D.border}`, background:"transparent", color:D.gris, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, cursor:"pointer"}}>
                        Annuler
                      </button>
                      <button onClick={resetPronos}
                        style={{flex:2, padding:"7px", borderRadius:D.rmd, border:"none", background:D.rouge, color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1, cursor:"pointer"}}>
                        ✓ Confirmer le reset
                      </button>
                    </div>
                  </div>
              }
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div style={{padding:"10px 14px", borderRadius:D.rmd, background:"rgba(0,232,122,0.12)", color:D.vert, fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, textAlign:"center", border:`1px solid rgba(0,232,122,0.3)`, letterSpacing:.5}}>
              {toast}
            </div>
          )}

          {/* Zone Prono */}
          <div style={{background:D.card, border:`1px solid ${D.border}`, borderRadius:D.rlg, padding:"14px 16px"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:D.or, marginBottom:14}}>🎯 Saisir un prono</div>

            {/* ÉTAT 1 : non connecté */}
            {!auth && !showPin && (
              <>
                <div style={{fontSize:13, color:D.gris, marginBottom:12, lineHeight:1.6}}>Connecte-toi pour saisir et sauvegarder tes pronos.</div>
                <div style={{display:"flex", flexDirection:"column", gap:7}}>
                  {PLAYERS.map(p=>(
                    <button key={p.id} onClick={()=>setShowPin(true)}
                      style={{display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:D.rmd, border:`1px solid ${D.border}`, background:"rgba(255,255,255,0.03)", color:D.blanc, fontSize:14, cursor:"pointer", textAlign:"left"}}>
                      <span style={{fontSize:20}}>{p.emoji}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700}}>{p.name}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.gris, marginLeft:"auto", letterSpacing:1}}>PIN →</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ÉTAT 2 : saisie PIN */}
            {!auth && showPin && (
              <PinPanel onSuccess={handleLogin} onCancel={()=>setShowPin(false)} />
            )}

            {/* ÉTAT 3 : connecté */}
            {auth && (
              <>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:D.gris, marginBottom:10, letterSpacing:.5}}>
                  Connecté : {auth.emoji} <strong style={{color:D.blanc}}>{auth.name}</strong>
                </div>

                <select onChange={e=>{
                    const allM=[...DATA.amicaux,...RAF.prochains];
                    const f=allM.find(x=>x.id===e.target.value)||null;
                    setSelM(f);setS1(1);setS2(0);
                  }}
                  value={selM?.id||""}
                  style={{width:"100%", padding:"8px 10px", borderRadius:D.rmd, border:`1px solid ${D.border}`, background:"rgba(255,255,255,0.05)", color:D.blanc, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, marginBottom:12, outline:"none"}}>
                  <option value="" style={{background:"#0D1B3E"}}>— Sélectionner un match —</option>
                  <optgroup label="Amicaux WC 2026" style={{background:"#0D1B3E"}}>
                    {future.map(f=>(
                      <option key={f.id} value={f.id} style={{background:"#0D1B3E"}}>{f.hL} {f.home} vs {f.away} {f.aL} · {f.date}</option>
                    ))}
                  </optgroup>
                  <optgroup label="RAF - Ligue 2" style={{background:"#0D1B3E"}}>
                    {RAF.prochains.map(f=>(
                      <option key={f.id} value={f.id} style={{background:"#0D1B3E"}}>{f.hL} {f.home} vs {f.away} {f.aL} · {f.date}</option>
                    ))}
                  </optgroup>
                </select>

                {selM && (
                  <>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:12, padding:"12px", background:"rgba(255,255,255,0.03)", borderRadius:D.rmd, border:`1px solid ${D.border}`}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:32}}>{selM.hL}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.gris, marginTop:3}}>{selM.home}</div>
                      </div>
                      <input type="number" min={0} max={20} value={s1} onChange={e=>setS1(e.target.value)}
                        style={{width:50, height:48, textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, borderRadius:D.rmd, border:`1px solid rgba(245,197,24,0.4)`, background:"rgba(255,255,255,0.05)", color:D.blanc, outline:"none"}}/>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:D.gris}}>–</span>
                      <input type="number" min={0} max={20} value={s2} onChange={e=>setS2(e.target.value)}
                        style={{width:50, height:48, textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, borderRadius:D.rmd, border:`1px solid rgba(245,197,24,0.4)`, background:"rgba(255,255,255,0.05)", color:D.blanc, outline:"none"}}/>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:32}}>{selM.aL}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.gris, marginTop:3}}>{selM.away}</div>
                      </div>
                    </div>
                    <button onClick={valider} disabled={saving}
                      style={{width:"100%", padding:"10px", borderRadius:D.rmd, border:"none", background:`linear-gradient(135deg,${D.or},#e0a800)`, color:"#000", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", opacity:saving?.6:1}}>
                      {saving ? "⏳ Sauvegarde…" : "✅ VALIDER"}
                    </button>
                  </>
                )}

                {(pronos[auth.id]||[]).length > 0 && (
                  <div style={{marginTop:14}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:D.gris, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Mes pronos</div>
                    {(pronos[auth.id]||[]).map(p=>{
                      const r=results[p.matchId];
                      const ex=r&&p.s1===r.s1&&p.s2===r.s2;
                      const ok=r&&Math.sign(p.s1-p.s2)===Math.sign(r.s1-r.s2);
                      const m=[...DATA.amicaux,...RAF.prochains,...RAF.recents].find(f=>f.id===p.matchId);
                      return(
                        <div key={p.matchId} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderTop:`1px solid rgba(255,255,255,0.05)`, fontSize:12}}>
                          <span style={{color:D.gris, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140}}>
                            {m?`${m.hL} ${m.home} vs ${m.away} ${m.aL}`:`#${p.matchId}`}
                          </span>
                          <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:14, marginLeft:6, flexShrink:0, color:ex?D.vert:ok&&r?D.cyan:D.blanc}}>
                            {p.s1}–{p.s2} {ex?"✓":ok&&r?"~":r?"✗":""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info MAJ */}
          <div style={{background:"rgba(0,212,255,0.04)", border:`1px solid rgba(0,212,255,0.12)`, borderRadius:D.rlg, padding:"13px 16px"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:2, color:D.cyan, textTransform:"uppercase", marginBottom:8}}>Mise à jour</div>
            <div style={{fontSize:12, color:D.gris, lineHeight:1.7}}>
              Clique <strong style={{color:D.blanc}}>↻ MAJ ↗</strong> — Claude cherche les scores en temps réel et régénère le site.<br/>
              <span style={{color:D.cyan}}>Ou : « Brésil a gagné 2-1 »</span>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:"rgba(138,151,176,0.5)", marginTop:8, letterSpacing:1}}>
              localStorage · {DATA.lastUpdate}
            </div>
          </div>
        </div>
      </div>

      {/* ── PANEL PRONOS MOBILE ── */}
      {isMobile && showPin && (
        <div style={{position:"fixed", bottom:58, left:0, right:0, zIndex:90, background:"rgba(10,14,26,0.98)", backdropFilter:"blur(20px)", borderTop:`1px solid ${D.border}`, padding:"16px", maxHeight:"70vh", overflowY:"auto"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, color:D.or, letterSpacing:1}}>🎯 PRONOS</span>
            <button onClick={()=>setShowPin(false)} style={{background:"none", border:"none", color:D.gris, fontSize:18, cursor:"pointer"}}>✕</button>
          </div>
          {!auth
            ? <PinPanel onSuccess={handleLogin} onCancel={()=>setShowPin(false)} />
            : <>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:D.gris, marginBottom:10}}>
                  Connecté : {auth.emoji} <strong style={{color:D.blanc}}>{auth.name}</strong>
                  <button onClick={logout} style={{marginLeft:10, background:"none", border:"none", color:D.rouge, cursor:"pointer", fontSize:11}}>Déconnexion</button>
                </div>
                <select onChange={e=>{const allM=[...DATA.amicaux,...RAF.prochains];const f=allM.find(x=>x.id===e.target.value)||null;setSelM(f);setS1(1);setS2(0);}}
                  value={selM?.id||""}
                  style={{width:"100%", padding:"10px", borderRadius:D.rmd, border:`1px solid ${D.border}`, background:"rgba(255,255,255,0.05)", color:D.blanc, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, marginBottom:12, outline:"none"}}>
                  <option value="" style={{background:"#0D1B3E"}}>— Choisir un match —</option>
                  <optgroup label="Amicaux WC 2026" style={{background:"#0D1B3E"}}>
                    {future.map(f=>(<option key={f.id} value={f.id} style={{background:"#0D1B3E"}}>{f.hL} {f.home} vs {f.away} {f.aL}</option>))}
                  </optgroup>
                  <optgroup label="RAF - Ligue 2" style={{background:"#0D1B3E"}}>
                    {RAF.prochains.map(f=>(<option key={f.id} value={f.id} style={{background:"#0D1B3E"}}>{f.home} vs {f.away}</option>))}
                  </optgroup>
                </select>
                {selM && (
                  <>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:12, padding:"12px", background:"rgba(255,255,255,0.03)", borderRadius:D.rmd}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:28}}>{selM.hL}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.gris}}>{selM.home}</div></div>
                      <input type="number" min={0} max={20} value={s1} onChange={e=>setS1(e.target.value)}
                        style={{width:48, height:48, textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:24, borderRadius:D.rmd, border:`1px solid rgba(245,197,24,0.4)`, background:"rgba(255,255,255,0.05)", color:D.blanc, outline:"none"}}/>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:D.gris}}>–</span>
                      <input type="number" min={0} max={20} value={s2} onChange={e=>setS2(e.target.value)}
                        style={{width:48, height:48, textAlign:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:24, borderRadius:D.rmd, border:`1px solid rgba(245,197,24,0.4)`, background:"rgba(255,255,255,0.05)", color:D.blanc, outline:"none"}}/>
                      <div style={{textAlign:"center"}}><div style={{fontSize:28}}>{selM.aL}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:D.gris}}>{selM.away}</div></div>
                    </div>
                    <button onClick={valider} style={{width:"100%", padding:"12px", borderRadius:D.rmd, border:"none", background:`linear-gradient(135deg,${D.or},#e0a800)`, color:"#000", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:2, cursor:"pointer"}}>
                      ✅ VALIDER
                    </button>
                  </>
                )}
                {/* Classement mobile */}
                <div style={{marginTop:16}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:D.or, letterSpacing:1, marginBottom:8}}>🏆 CLASSEMENT</div>
                  {board.map((p,i)=>(
                    <div key={p.id} style={{display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<2?`1px solid rgba(255,255,255,0.05)`:"none"}}>
                      <div style={{width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:11,
                        background:i===0?"linear-gradient(135deg,#FFD700,#FFA500)":i===1?"linear-gradient(135deg,#C0C0C0,#888)":"linear-gradient(135deg,#CD7F32,#8B4513)",
                        color:i===2?"#fff":"#000"}}>{i+1}</div>
                      <span style={{fontSize:18}}>{p.emoji}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, flex:1}}>{p.name}</span>
                      <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:D.or}}>{p.pt}</span>
                      <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.gris}}>pts</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      )}

      {/* ── MODAL RÉSUMÉ MATCH ── */}
      {modalMatch && (
        <div style={{padding:"0 24px", marginTop:8, marginBottom:16}}>
          <div style={{background:"rgba(13,27,62,0.98)", border:`1px solid ${D.cyan}`, borderRadius:D.rlg, overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,rgba(0,212,255,0.1),rgba(13,27,62,0.9))", padding:"14px 18px", borderBottom:`1px solid ${D.border}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, color:D.cyan}}>
                {modalMatch.hL} {modalMatch.home} {modalMatch.score?.h ?? "–"} – {modalMatch.score?.a ?? "–"} {modalMatch.away} {modalMatch.aL}
              </div>
              <button onClick={()=>setModalMatch(null)} style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:D.gris, background:"none", border:"none", cursor:"pointer", letterSpacing:1}}>✕ Fermer</button>
            </div>

            <div style={{padding:"16px 18px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>

              {/* Résumé + buts */}
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:8}}>📝 Résumé du match</div>
                {modalMatch.resume?.texte
                  ? <div style={{fontSize:13, color:"#C0CDE0", lineHeight:1.7, marginBottom:14, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:D.rmd, border:`1px solid ${D.border}`}}>
                      {modalMatch.resume.texte}
                    </div>
                  : <div style={{fontSize:13, color:D.gris, marginBottom:14, fontStyle:"italic", padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:D.rmd}}>
                      Résumé disponible après le match.<br/>
                      <span style={{fontSize:11}}>Dis à Claude « résume le match {modalMatch.home}-{modalMatch.away} »</span>
                    </div>
                }

                {modalMatch.resume?.buts?.length > 0 && <>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:6}}>⚽ Buts</div>
                  {modalMatch.resume.buts.map((b,i)=>(
                    <div key={i} style={{fontSize:13, color:"#C0CDE0", padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.05)`}}>{b}</div>
                  ))}
                </>}

                {modalMatch.resume?.cartons?.length > 0 && <>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginTop:10, marginBottom:6}}>🟨 Cartons</div>
                  {modalMatch.resume.cartons.map((c,i)=>(
                    <div key={i} style={{fontSize:13, color:"#C0CDE0", padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.05)`}}>{c}</div>
                  ))}
                </>}

                {modalMatch.resume?.motm && (
                  <div style={{marginTop:12, padding:"8px 12px", background:"rgba(245,197,24,0.08)", border:`1px solid rgba(245,197,24,0.2)`, borderRadius:D.rmd, display:"flex", gap:8, alignItems:"center"}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:D.or, letterSpacing:1, textTransform:"uppercase"}}>⭐ Homme du match</span>
                    <span style={{fontSize:13, color:D.blanc, fontWeight:500}}>{modalMatch.resume.motm}</span>
                  </div>
                )}
              </div>

              {/* Stats + YouTube */}
              <div>
                {/* Bouton YouTube */}
                <div style={{marginBottom:16}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:8}}>▶ Highlights vidéo</div>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${modalMatch.home} ${modalMatch.away} highlights 2026`)}`}
                    target="_blank" rel="noreferrer"
                    style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"12px 16px", borderRadius:D.rmd, background:"rgba(255,0,0,0.1)", border:"1px solid rgba(255,80,80,0.35)", color:"#ff5555", textDecoration:"none", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:1}}>
                    <span style={{fontSize:18}}>▶</span>
                    Rechercher sur YouTube
                    <span style={{fontSize:11, opacity:.6}}>↗</span>
                  </a>
                  <div style={{fontSize:10, color:D.gris, marginTop:5, textAlign:"center"}}>{modalMatch.home} {modalMatch.away} highlights 2026</div>
                </div>

                {/* Barres de stats */}
                {modalMatch.resume?.stats
                  ? <>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, color:D.gris, textTransform:"uppercase", marginBottom:8}}>📊 Statistiques</div>
                      <div style={{display:"flex", justifyContent:"space-between", fontSize:10, color:D.gris, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:1, marginBottom:8}}>
                        <span>{modalMatch.home}</span><span>{modalMatch.away}</span>
                      </div>
                      {[["Possession",modalMatch.resume.stats.possession],["Tirs",modalMatch.resume.stats.tirs],["Cadrés",modalMatch.resume.stats.cadres]].filter(([,v])=>v).map(([label,vals])=>{
                        const v1=parseFloat(vals[0])||0, v2=parseFloat(vals[1])||0, tot=v1+v2||1;
                        return(
                          <div key={label} style={{marginBottom:9}}>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3}}>
                              <span style={{fontWeight:600, color:D.cyan}}>{vals[0]}</span>
                              <span style={{color:D.gris, fontSize:10}}>{label}</span>
                              <span style={{fontWeight:600, color:"#ff6b8a"}}>{vals[1]}</span>
                            </div>
                            <div style={{height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden", display:"flex"}}>
                              <div style={{width:`${v1/tot*100}%`, background:`linear-gradient(90deg,${D.acier},${D.cyan})`}}/>
                              <div style={{width:`${v2/tot*100}%`, background:"linear-gradient(90deg,#E8002D,rgba(232,0,45,0.4))"}}/>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  : <div style={{fontSize:12, color:D.gris, fontStyle:"italic", padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:D.rmd}}>
                      Stats disponibles après le match.
                    </div>
                }

                <div style={{marginTop:12, padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:D.rmd, border:`1px solid ${D.border}`}}>
                  <div style={{fontSize:12, color:D.gris}}>📍 {modalMatch.venue}</div>
                  <div style={{fontSize:12, color:D.gris, marginTop:3}}>📅 {modalMatch.date}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── MATCH CARD ────────────────────────────────────────
function MatchCard({ f, myProno, onProno, onResume }) {
  const fut=f.status==="future", live=f.status==="live", done=f.status==="done";
  return (
    <div style={{
      background: live ? "rgba(0,232,122,0.04)" : "rgba(13,27,62,0.9)",
      border:`1px solid ${live?"rgba(0,232,122,0.4)":"rgba(0,212,255,0.18)"}`,
      borderLeft: f.highlight ? "3px solid #00D4FF" : undefined,
      borderRadius:"14px", padding:"14px 16px", marginBottom:10,
      animation:"fadeIn .4s ease both",
      position:"relative", overflow:"hidden",
    }}>
      {live && <div style={{position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#00E87A,transparent)"}} />}

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#8A97B0", letterSpacing:1.5, textTransform:"uppercase"}}>Amical international</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:1,
          color:live?"#00E87A":done?"#8A97B0":"#F5C518",
          display:"flex", alignItems:"center", gap:5}}>
          {live && <span style={{width:5, height:5, borderRadius:"50%", background:"#00E87A", display:"inline-block", animation:"pulse 1.2s infinite"}} />}
          {live?"En cours":done?"Terminé":`⏰ ${f.date.split("·")[1]?.trim()||f.date}`}
        </span>
      </div>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
        <div style={{textAlign:"center", flex:1}}>
          <div style={{fontSize:46}}>{f.hL}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, marginTop:5, color:"#F0F4FF"}}>{f.home}</div>
        </div>
        <div style={{textAlign:"center", minWidth:90}}>
          {fut
            ? <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#8A97B0", letterSpacing:6}}>VS</div>
            : <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:38, letterSpacing:3, color:live?"#00E87A":"#F0F4FF"}}>{f.score?.h??0}–{f.score?.a??0}</div>
          }
        </div>
        <div style={{textAlign:"center", flex:1}}>
          <div style={{fontSize:46}}>{f.aL}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, marginTop:5, color:"#F0F4FF"}}>{f.away}</div>
        </div>
      </div>

      {f.venue && <div style={{textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:"#8A97B0", marginTop:8}}>📍 {f.venue}</div>}
      {f.note  && <div style={{textAlign:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:"#F5C518", marginTop:4}}>ℹ️ {f.note}</div>}

      {f.odds && (
        <div style={{display:"flex", gap:6, marginTop:10, justifyContent:"center"}}>
          {[["1",f.odds.home,"#00D4FF"],[" X",f.odds.draw,"#8A97B0"],["2",f.odds.away,"#ff6b8a"]].map(([lbl,val,col])=>(
            val ? <div key={lbl} style={{flex:1, textAlign:"center", background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"5px 4px", border:`1px solid rgba(255,255,255,0.07)`}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, color:"#8A97B0", letterSpacing:1}}>{lbl}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:col, lineHeight:1.2}}>{val}</div>
            </div> : null
          ))}
        </div>
      )}

      {myProno && (
        <div style={{marginTop:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:"#00D4FF", textAlign:"center", background:"rgba(0,212,255,0.08)", borderRadius:"6px", padding:"4px 0", letterSpacing:.5}}>
          🎯 Mon prono : {myProno.s1}–{myProno.s2}
        </div>
      )}

      {/* Boutons d'action */}
      <div style={{marginTop:10, display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap"}}>
        {fut && (
          <button onClick={onProno} style={{padding:"6px 18px", borderRadius:"8px", border:"1px solid rgba(0,212,255,0.3)", background:"rgba(0,212,255,0.08)", color:"#00D4FF", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1}}>
            🎯 Pronostiquer
          </button>
        )}
        {(done || live) && (
          <button onClick={onResume} style={{padding:"6px 18px", borderRadius:"8px", border:"1px solid rgba(245,197,24,0.3)", background:"rgba(245,197,24,0.07)", color:"#F5C518", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:1}}>
            📋 Résumé & Highlights
          </button>
        )}
      </div>
    </div>
  );
}
