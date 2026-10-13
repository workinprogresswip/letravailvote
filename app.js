const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COURT={"LFI":"LFI","GDR":"Communistes (GDR)","Écologistes":"Écologistes","Socialistes":"Socialistes","LIOT":"LIOT","EDS (groupe éphémère 2020)":"EDS (2020)","Macronistes":"Macronistes (EPR)","Démocrates (MoDem)":"MoDem","Horizons":"Horizons","UDI (centre droit)":"UDI (centre droit)","Droite (LR / DR)":"Droite (LR, DR)","UDR (Ciotti)":"UDR (Ciotti)","RN":"RN","Non inscrits":"Non inscrits"};
const FAMS=DATA.familles.filter(f=>f.id!=="Non inscrits");
const FAMNOM=Object.fromEntries(DATA.familles.map(f=>[f.id,f.nom]));
const VERIF=DATA.verif||'';const PET=DATA.petites||{};const MES=DATA.mesures||[];const LOIS=DATA.lois.slice().sort((a,b)=>a.reference.date.localeCompare(b.reference.date));
const BYID=Object.fromEntries(LOIS.map(l=>[l.id,l]));
const fmtDate=d=>{const[y,m,j]=d.split('-');return `${+j} ${["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."][m-1]} ${y}`};
const LAB={pour:"Pour",contre:"Contre",abstention:"Abstention",partage:"Partagé",absent:"N'a pas pris part au vote",censure:"A voté la censure",censure_partielle:"Une partie a voté la censure",pas_censure:"N'a pas voté la censure",none:"Pas de groupe à cette date"};
const GLY={pour:"✓",contre:"✕",abstention:"–",partage:"±",absent:"·",censure:"⚑",censure_partielle:"½",pas_censure:"·",none:""};
// position d'une famille sur une loi (fusion des motions pour les 49.3)
function famPos(l,f){
  if(l.mode==="493"){
    const ms=[l.reference,...l.autres];let best=null,any=false;
    for(const m of ms){const v=m.f[f];if(!v)continue;any=true;
      if(v[0]>0&&v[0]>=v[3]/2)best="censure";else if(v[0]>0&&best!=="censure")best="censure_partielle";}
    return any?(best||"pas_censure"):"none";
  }
  const v=l.reference.f[f];return v?v[4]:"none";
}
function famDetail(l,f){
  if(l.mode==="493"){return [l.reference,...l.autres].filter(m=>m.f[f]).map(m=>{const v=m.f[f];return `Motion n°${m.num} : ${v[0]} voix pour la censure sur ${v[3]} députés`}).join('<br>')}
  const v=l.reference.f[f];if(!v)return "";
  const gs=l.reference.g.filter(g=>g[2]===f).map(g=>g[0]).join(", ");
  return `${v[0]} pour · ${v[1]} contre · ${v[2]} abst. <br><span style="opacity:.75">sur ${v[3]} députés (${esc(gs)})</span>`;
}
const cell=(p,sm)=>`<span class="cell ${p}${sm?' sm':''}" aria-label="${LAB[p]}">${GLY[p]}</span>`;
// cellule avec le nombre de députés concernés
function cellBig(l,f){const p=famPos(l,f);let nb='';
  if(l.mode==="493"){const ms=[l.reference,...l.autres];let best=0;for(const m of ms){const v=m.f[f];if(v)best=Math.max(best,v[0])}nb=best?`${best}`:'—';}
  else{const v=l.reference.f[f];if(v){const n={pour:v[0],contre:v[1],abstention:v[2]}[p];nb=(n!==undefined&&n>0)?`${n}`:'—';}}
  return `<span class="cell big ${p}" aria-label="${LAB[p]}"><span class="gl">${GLY[p]}</span><span class="nb">${nb}</span></span>`}
// tooltip
const tip=document.createElement('div');tip.className='tip';tip.hidden=true;document.body.appendChild(tip);
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}tip.innerHTML=t.dataset.tip;tip.hidden=false});
document.addEventListener('mousemove',e=>{if(tip.hidden)return;const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;tip.style.left=x+'px';tip.style.top=y+'px'});
const tipAttr=(l,f)=>esc(`<b>${COURT[f]}</b>, ${l.titre}<br>${LAB[famPos(l,f)]}<br>`+famDetail(l,f));
// ---------- vues
function legend(){return `<div class="legend" aria-label="Légende">
<span>${cell('pour',1)} A voté pour</span><span>${cell('contre',1)} A voté contre</span><span>${cell('abstention',1)} S'est abstenu</span>
<span>${cell('censure',1)} A voté la censure (texte passé en 49.3)</span><span style="color:var(--muted)">Le chiffre dans la case : le nombre de députés du groupe qui ont voté ainsi.</span><span>${cell('pas_censure',1)} N'a pas voté la censure</span><span>${cell('absent',1)} N'a pas pris part</span></div>`}
// compte des positions d'une famille sur un ensemble de lois
function tally(ls,f){const t={pour:0,contre:0,abstention:0,censure:0,censure_part:0,autre:0};
 for(const l of ls){const p=famPos(l,f);if(p==="none")continue;
  if(l.mode==="493"){if(p==="censure")t.censure++;else if(p==="censure_partielle")t.censure_part++;else t.autre++;}
  else if(t[p]!==undefined)t[p]++;else t.autre++;}
 return t}
function stackBar(t,showZ){const n=t.pour+t.contre+t.abstention+(showZ?t.censure:0);if(!n)return '<span class="src">aucun vote</span>';
 const seg=(cls,v)=>v?`<i class="${cls}" style="flex:${v}">${v/n>0.12?`<b>${v}</b>`:''}</i>`:'';
 return `<div class="stack">${seg('p',t.pour)}${seg('c',t.contre)}${seg('a',t.abstention)}${showZ?seg('z',t.censure):''}</div>`}
function legende_txt(t,showZ){const bits=[];if(t.pour)bits.push(`${t.pour} pour`);if(t.contre)bits.push(`${t.contre} contre`);if(t.abstention)bits.push(`${t.abstention} abst.`);if(showZ&&t.censure)bits.push(`${t.censure} censure`);return bits.join(' · ')||'—'}
function summary(cat,f){
  const ls=LOIS.filter(l=>l.categorie===cat&&l.mode!=="493");const t=tally(ls,f);
  if(!(t.pour+t.contre+t.abstention))return "";
  return `<td class="sum" style="min-width:170px">${stackBar(t)}<span class="num">${legende_txt(t)}</span></td>`;
}
function matrix(cat){
  const ls=LOIS.filter(l=>l.categorie===cat);
  const fs=FAMS.filter(f=>ls.some(l=>famPos(l,f.id)!=="none"));
  return `<div class="scroll"><table class="mx"><thead><tr><th></th>${ls.map(l=>`<th class="law"><a href="/loi/${l.id}"><span class="yr">${l.annee}${l.mode==="493"?" · 49.3":""}</span><span class="lt">${esc(l.titre)}</span><span class="res">${l.mode==="493"?"pas de vote":`${l.reference.sort==="adopté"?"adopté":"rejeté"} ${l.reference.pour}-${l.reference.contre}`}</span></a></th>`).join('')}${cat==="Retraites"?"":`<th class="law"><span class="yr">Tendance</span><span class="lt">sur les lois votées</span></th>`}</tr></thead>
<tbody>${fs.map(f=>`<tr><th scope="row">${esc(COURT[f.id])}</th>${ls.map(l=>`<td data-tip="${tipAttr(l,f.id)}">${cellBig(l,f.id)}</td>`).join('')}${cat==="Retraites"?"":(summary(cat,f.id)||'<td class="sum"><span class="num">aucune loi votée</span></td>')}</tr>`).join('')}</tbody></table></div>`;
}
const CATDESC={"Retraites":"Attention au sens des textes : certains réforment le système, d'autres reviennent sur la réforme de 2023. Voter « pour » n'a donc pas le même sens d'une colonne à l'autre, c'est pourquoi aucune tendance globale n'est calculée ici.","Chômage et emploi":"Règles de l'assurance chômage, accompagnement des demandeurs d'emploi, emploi des chômeurs de longue durée.","Droit du travail et dialogue social":"Code du travail, négociation dans l'entreprise, représentants du personnel.","Salaires et partage de la valeur":"Primes, intéressement, participation.","Conditions de travail et santé":"Santé au travail, congés, statut des travailleurs des plateformes.","Formation":"Formation professionnelle et apprentissage."};
let catSel="Toutes";
function overview(){
  const ls=LOIS.filter(l=>l.mode!=="493");const mocs=LOIS.filter(l=>l.mode==="493");
  const rows=FAMS.map(f=>({f,t:tally(ls,f.id),z:tally(mocs,f.id)})).filter(r=>r.t.pour+r.t.contre+r.t.abstention+r.z.censure+r.z.censure_part>0);
  return `<section class="overview"><div class="cat-head"><h2>Vue d'ensemble</h2><p>Les ${ls.length} lois qui ont fait l'objet d'un vote, tous sujets confondus. Les groupes sont rangés de la gauche à la droite de l'hémicycle.</p></div>
${rows.map(r=>`<div class="ov-row"><div class="nm">${esc(COURT[r.f.id])}<small>${r.t.pour+r.t.contre+r.t.abstention} lois votées${r.z.censure?` · a voté ${r.z.censure} censure${r.z.censure>1?'s':''}`:''}${r.z.censure_part?` · ${r.z.censure_part} censure${r.z.censure_part>1?'s':''} votée${r.z.censure_part>1?'s':''} en partie`:''}</small></div>
<div data-tip="${esc(`<b>${COURT[r.f.id]}</b><br>${legende_txt(r.t)}`)}">${stackBar(r.t)}</div><div class="lg">${legende_txt(r.t)}</div></div>`).join('')}
<p class="src" style="margin-top:12px">Les 3 textes passés en 49.3 (loi Travail 2016, retraite universelle 2020, retraites 2023) ne sont pas comptés ici : passés en 49.3, ils n'ont pas été votés par les députés.</p></section>`;
}
function vueSujets(){
  const cats=catSel==="Toutes"?DATA.categories:[catSel];
  return `<div class="chips" role="group" aria-label="Filtrer par sujet">${["Toutes",...DATA.categories].map(c=>`<button class="chip" data-cat="${esc(c)}" aria-pressed="${c===catSel}">${esc(c)}</button>`).join('')}</div>${legend()}
${catSel==="Toutes"?overview():''}
${cats.map(c=>{const n=LOIS.filter(l=>l.categorie===c).length;return `<section class="cat"><div class="cat-head"><h2>${esc(c)}</h2><p>${n} ${n>1?'textes':'texte'} · ${esc(CATDESC[c])}</p></div>${matrix(c)}</section>`}).join('')}`;
}
function grpRows(s,isMoc){
  const ix=x=>{const i=FAMS.findIndex(f=>f.id===x);return i<0?99:i};const rows=s.g.slice().sort((a,b)=>ix(a[2])-ix(b[2]));
  return rows.map(([sig,nom,fam,m,p,c,a])=>{
    const nv=Math.max(0,m-p-c-a);
    const bar=isMoc?`<i class="cz" style="flex:${p}"></i><i style="flex:${m-p}"></i>`:`${p?`<i class="p" style="flex:${p}"></i>`:''}${c?`<i class="c" style="flex:${c}"></i>`:''}${a?`<i class="a" style="flex:${a}"></i>`:''}${nv?`<i style="flex:${nv}"></i>`:''}`;
    const d=isMoc?`${p} / ${m}`:`${p} · ${c} · ${a}`;
    return `<div class="grp"><div class="n">${esc(nom||sig)}<small>${esc(sig)} · ${m} députés</small></div><div class="sb" role="img" aria-label="${isMoc?`${p} voix pour la censure sur ${m}`:`${p} pour, ${c} contre, ${a} abstentions, ${nv} n'ont pas voté, sur ${m}`}">${bar}</div><div class="d">${d}</div></div>`}).join('');
}
function scrutinBlock(s,label){
  const moc=s.type==="MOC";
  return `<div class="panel"><h3>${esc(label)}</h3>
<p class="src">${fmtDate(s.date)} · Scrutin n°${s.num} (${s.leg}e législature) · <a href="${s.lien}" target="_blank" rel="noopener">voir sur le site de l'Assemblée</a></p>
<div class="kpis"><div class="kpi"><div class="k">Résultat</div><div class="v res" style="font-size:18px">${s.sort==="adopté"?"Adopté":"Rejeté"}</div></div>
<div class="kpi"><div class="k">Votants</div><div class="v">${s.votants}</div></div>
<div class="kpi"><div class="k">Pour</div><div class="v">${s.pour}</div></div>
${moc?``:`<div class="kpi"><div class="k">Contre</div><div class="v">${s.contre}</div></div><div class="kpi"><div class="k">Abstention</div><div class="v">${s.abst}</div></div>`}</div>
<p class="src" style="margin:8px 0 6px">${moc?"Barre noire : députés du groupe qui ont voté la censure.":"Barres : pour, contre, abstention ; la partie grise correspond aux députés qui n'ont pas voté."} Chiffres : ${moc?"voix pour / membres":"pour · contre · abstention"}.</p>
${grpRows(s,moc)}</div>`;
}
// hémicycle : un point par député, rangés de la gauche à la droite
function hemicycle(s){
  const moc=s.type==="MOC";
  const ix=x=>{const i=FAMS.findIndex(f=>f.id===x);return i<0?99:i};
  const seats=[];
  for(const [sig,nom,fam,m,p,c,a] of s.g.slice().sort((x,y)=>ix(x[2])-ix(y[2]))){
    const parts=moc?[["censure",p],["nv",m-p]]:[["pour",p],["abstention",a],["contre",c],["nv",Math.max(0,m-p-c-a)]];
    for(const [k,n] of parts)for(let i=0;i<n;i++)seats.push(k);
  }
  const N=seats.length,R=Math.max(6,Math.round(Math.sqrt(N/2.2))),r0=.38;
  const rad=[...Array(R)].map((_,i)=>r0+(1-r0)*i/(R-1));const tot=rad.reduce((x,y)=>x+y,0);
  const per=rad.map(r=>Math.round(N*r/tot));per[R-1]+=N-per.reduce((x,y)=>x+y,0);
  const pos=[];rad.forEach((r,i)=>{const n=per[i];for(let j=0;j<n;j++){const th=n>1?Math.PI*(1-j/(n-1)):Math.PI/2;pos.push([th,r])}});
  pos.sort((x,y)=>y[0]-x[0]||x[1]-y[1]);
  const d=(1-r0)/(R-1)*.42;
  return `<svg class="hemi" viewBox="-1.04 -1.04 2.08 1.08" role="img" aria-label="${esc(moc?`${s.pour} députés ont voté la censure`:`${s.pour} pour, ${s.contre} contre, ${s.abst} abstentions`)}">${pos.map(([th,r],i)=>`<circle class="${seats[i]}" cx="${(r*Math.cos(th)).toFixed(3)}" cy="${(-r*Math.sin(th)).toFixed(3)}" r="${d.toFixed(3)}"/>`).join('')}</svg>`;
}
// colonnes « pour » et « contre » à la manière d'un décompte de division
function division(s){
  const moc=s.type==="MOC";
  const parFam={};for(const [sig,nom,fam,m,p,c,a] of s.g){const k=fam||sig;const o=parFam[k]||(parFam[k]={k,nom:COURT[fam]||nom||sig,p:0,c:0,a:0,m:0});o.p+=p;o.c+=c;o.a+=a;o.m+=m}
  const gs=Object.values(parFam);
  const col=(cls,lab,tot,key)=>{const rs=gs.filter(g=>g[key]>0).sort((x,y)=>y[key]-x[key]);const mx=Math.max(1,...rs.map(g=>g[key]));
    return `<div class="dcol ${cls}"><div class="dh"><span>${lab}</span><b>${tot}</b></div>${rs.map(g=>`<div class="dr"><span class="nm">${esc(g.nom)}</span><span class="bb"><i style="width:${g[key]/mx*100}%"></i></span><span class="nb">${g[key]}</span></div>`).join('')||'<p class="src">Personne</p>'}</div>`};
  if(moc)return `<div class="division one">${col('censure','Ont voté la censure',s.pour,'p')}</div>`;
  return `<div class="division">${col('pour','Pour',s.pour,'p')}${col('contre','Contre',s.contre,'c')}${s.abst?col('abstention','Abstention',s.abst,'a'):''}</div>`;
}
function blocVote(l){
  const r=l.reference,moc=l.mode==="493";
  return `<section class="votebloc"><div class="vh"><div><span class="badge ${moc?'novote':'vote'}">${moc?'Passé en 49.3, sans vote':'Voté par les députés'}</span>
<h3>${moc?`Motion de censure ${r.sort==="adopté"?"adoptée":"rejetée"}`:`${r.sort==="adopté"?"Adopté":"Rejeté"} à ${r.pour} voix contre ${r.contre}`}</h3>
<p class="src">${fmtDate(r.date)} · <a href="${r.lien}" target="_blank" rel="noopener">scrutin n°${r.num}</a>${moc?` · ${r.pour} voix pour la censure. Il faut la majorité absolue des députés pour la faire adopter.`:''}</p></div></div>
<div class="vgrid"><div>${hemicycle(r)}<div class="hleg2">${moc?`<span><i class="censure"></i>A voté la censure</span>`:`<span><i class="pour"></i>Pour</span><span><i class="contre"></i>Contre</span><span><i class="abstention"></i>Abstention</span>`}<span><i class="nv"></i>${moc?"N'a pas voté la censure":"N'a pas voté"}</span></div></div>${division(r)}</div></section>`;
}
function vueLoi(id){
  const l=BYID[id];if(!l)return `<p>Loi introuvable.</p>`;const p=PET[id];const T=TEXTES[id]||(p?{bref:'',contenu:p.contenu}:{});
  const r=l.reference;
  return `<a class="back" href="/sujets">← Tous les sujets</a>
<div class="law-head"><div><span class="tag">${esc(l.categorie)}</span> <span class="tag">${l.annee}</span>${l.mode==="493"?' <span class="tag">Passé en 49.3</span>':''}</div><h2>${esc(l.titre)}</h2><div class="bref">${esc(T.bref||'')}</div></div>
${blocVote(l)}
<div class="grid2"><div class="panel"><h3>Ce que contient le texte</h3>${effBadges(id,1)}${SANS_EFFET[id]?`<p class="src">Ce texte n'est rangé sous aucune étiquette d'effet. ${esc(SANS_EFFET[id])}</p>`:''}${POURVOUS[id]?`<div class="pourvous"><span class="k">Ce que ça change pour vous</span><p>${esc(POURVOUS[id])}</p></div>`:''}${T.note493?`<div class="note493"><b>Pas de vote sur le texte.</b> ${esc(T.note493)}</div>`:''}<p>${esc(T.contenu||'')}</p>
${p?`<p class="src">${esc(p.statut)} · <a href="${esc(p.source)}" target="_blank" rel="noopener">source</a> · Vérifié le ${esc(VERIF)}</p>`:''}<p class="src">Texte de présentation rédigé pour ce site, à relire avant publication.</p></div>
<div class="panel"><h3>Les groupes en un coup d'œil</h3><div class="flist">${FAMS.filter(f=>famPos(l,f.id)!=="none").map(f=>{const v=l.mode==="493"?null:l.reference.f[f.id];const det=v?`${v[0]} pour · ${v[1]} contre · ${v[2]} abst.`:'';return `<div class="frow" style="grid-template-columns:auto minmax(0,1fr)" data-tip="${tipAttr(l,f.id)}">${cellBig(l,f.id)}<span>${esc(COURT[f.id])} <span class="src">· ${LAB[famPos(l,f.id)]}${det?` · <span class="num">${det}</span>`:''}</span></span></div>`}).join('')}</div></div></div>
<div style="display:grid;gap:18px;margin-top:18px">
${scrutinBlock(r,l.mode==="493"?"La motion de censure, groupe par groupe":"Le vote, groupe par groupe")}
${l.autres.map(s=>scrutinBlock(s,s.type==="MOC"?"L'autre motion de censure":"Autre vote sur le texte")).join('')}
${l.amendements.length?`<div class="panel"><h3>Les votes qui ont marqué le débat</h3>${l.amendements.map(a=>`<div class="amd"><div class="t">${esc(a.propose)}</div><div class="w">${esc(a.pourquoi)}</div>
<div class="m"><span class="res">${a.sort==="adopté"?"Adopté":"Rejeté"}</span><span class="num">${a.pour} pour · ${a.contre} contre · ${a.abst} abst.</span><span>${fmtDate(a.date)}</span><span class="dots">${FAMS.filter(f=>a.f[f.id]).map(f=>`<span data-tip="${esc(`<b>${COURT[f.id]}</b><br>${LAB[a.f[f.id][4]]}<br>${a.f[f.id][0]} pour · ${a.f[f.id][1]} contre · ${a.f[f.id][2]} abst.`)}">${cell(a.f[f.id][4],1)}</span>`).join('')}</span></div>
<div class="src"><a href="${a.lien}" target="_blank" rel="noopener">Scrutin n°${a.num}</a> · <a href="${esc(a.source)}" target="_blank" rel="noopener">source du contenu</a></div></div>`).join('')}</div>`:''}
</div>`;
}
let famSel="Macronistes";
function vueGroupes(){
  const f=famSel;
  const voted=LOIS.filter(l=>l.mode!=="493"&&!["none","absent"].includes(famPos(l,f)));
  const t=tally(LOIS.filter(l=>l.mode!=="493"),f), z=tally(LOIS.filter(l=>l.mode==="493"),f);
  const lin=[...new Set(LOIS.flatMap(l=>[l.reference,...l.autres]).flatMap(s=>s.g.filter(g=>g[2]===f).map(g=>g[1])))];
  const chrono=LOIS.filter(l=>famPos(l,f)!=="none");
  return `<div class="famchips" role="group" aria-label="Choisir un groupe">${FAMS.map(x=>`<button class="chip" data-fam="${esc(x.id)}" aria-pressed="${x.id===f}">${esc(COURT[x.id])}</button>`).join('')}</div>
<div class="cat-head"><h2>${esc(FAMNOM[f])}</h2></div>
<div class="lineage"><span>Noms successifs :</span>${lin.map(n=>`<span class="tag">${esc(n)}</span>`).join('')}</div>
<div class="tiles"><div class="tile"><div class="k">Lois votées</div><div class="v">${t.pour+t.contre+t.abstention}</div></div>
<div class="tile p"><div class="k">Pour</div><div class="v">${t.pour}</div></div>
<div class="tile c"><div class="k">Contre</div><div class="v">${t.contre}</div></div>
<div class="tile"><div class="k">Abstention</div><div class="v">${t.abstention}</div></div>
${z.censure?`<div class="tile z"><div class="k">Censures votées</div><div class="v">${z.censure}</div></div>`:''}${z.censure_part?`<div class="tile z"><div class="k">Censures votées en partie</div><div class="v">${z.censure_part}</div></div>`:''}</div>
<section class="overview"><div class="cat-head"><h2 style="font-size:21px">Sujet par sujet</h2><p>Nombre de lois soutenues, combattues, ou sur lesquelles le groupe s'est abstenu.</p></div>
${DATA.categories.map(c=>{const ls=LOIS.filter(l=>l.categorie===c&&l.mode!=="493");const tc=tally(ls,f);if(!(tc.pour+tc.contre+tc.abstention))return '';
 return `<div class="ov-row"><div class="nm">${esc(c)}</div><div>${stackBar(tc)}</div><div class="lg">${legende_txt(tc)}</div></div>`}).join('')}</section>
<section class="overview"><div class="cat-head"><h2 style="font-size:21px">Au fil des dix ans</h2><p>Chaque texte dans l'ordre chronologique. Cliquez pour ouvrir la fiche.</p></div>
<div class="scroll"><div class="strip">${chrono.map(l=>`<a class="sitem" href="/loi/${l.id}" data-tip="${tipAttr(l,f)}"><span class="y">${l.annee}</span>${cellBig(l,f)}<span class="t">${esc(l.titre)}</span></a>`).join('')}</div></div>
${legend()}</section>
<div class="panel">${DATA.categories.map(c=>{const ls=LOIS.filter(l=>l.categorie===c&&famPos(l,f)!=="none");if(!ls.length)return '';return `<h3 style="font-size:18px;margin-top:16px">${esc(c)}</h3><div class="flist">${ls.map(l=>`<a class="frow" href="/loi/${l.id}" data-tip="${tipAttr(l,f)}">${cell(famPos(l,f),1)}<span><span class="ft">${esc(l.titre)}</span> <span class="src">· ${LAB[famPos(l,f)]}</span></span><span class="fy">${l.annee}</span></a>`).join('')}</div>`}).join('')}</div>`;
}

// ---------- vue par effet
const EFDEF=Object.fromEntries(EFFETS_DEF.map(e=>[e[0],e]));
const EFSLUG=Object.fromEntries(EFFETS_DEF.map(e=>[slugEff(e[1]),e[0]]));
function slugEff(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function effUrl(k){return `/effets/${slugEff(EFDEF[k][1])}`}
function loisEffet(k){return LOIS.filter(l=>EFFETS[l.id]&&EFFETS[l.id][k])}
function partPour(t){const n=t.pour+t.contre+t.abstention;return n?Math.round(t.pour/n*100):null}
const QUESTION={droit:"Qui vote pour créer des droits ?",oblig:"Qui vote pour imposer des obligations aux employeurs ?",marge:"Qui vote pour flexibiliser ?",moins:"Qui vote pour restreindre ou conditionner des droits ?",temp:"Qui vote les dispositifs provisoires ?"};
const SIGLE={"LFI":"LFI","GDR":"GDR","Écologistes":"ÉCO","Socialistes":"SOC","LIOT":"LIOT","EDS (groupe éphémère 2020)":"EDS","Macronistes":"EPR","Démocrates (MoDem)":"DEM","Horizons":"HOR","UDI (centre droit)":"UDI","Droite (LR / DR)":"LR","UDR (Ciotti)":"UDR","RN":"RN","Non inscrits":"NI"};
const MINV=3; // en dessous de 3 textes votés, une part n'a pas de sens
const VOTEES=LOIS.filter(l=>l.mode!=="493");
const FAMS_ACTIFS=FAMS.filter(f=>{const t=tally(VOTEES,f.id);return t.pour+t.contre+t.abstention>=10});
// teinte d'une case selon la part de « pour » : rouge en dessous de 50 %, vert au-dessus
function heat(pct){if(pct===null)return '';const d=Math.abs(pct-50)*2;const c=pct>=50?'var(--pour)':'var(--contre)';
  return `background:color-mix(in srgb,${c} ${Math.round(10+d*.9)}%,var(--surface));color:${d>=50?'#fff':'var(--ink)'}`}
function effBadges(id,avecTexte){
  const e=EFFETS[id];if(!e)return '';
  return `<div class="ebadges">${Object.keys(e).map(k=>`<a class="ebadge e-${k}" href="${effUrl(k)}" data-tip="${esc(`<b>${EFDEF[k][1]}</b><br>${EFDEF[k][3]}`)}"><i>${EFDEF[k][2]}</i>${esc(EFDEF[k][1])}</a>`).join('')}</div>${avecTexte?`<ul class="ewhy">${Object.entries(e).map(([k,j])=>`<li><b>${esc(EFDEF[k][1])}</b> ${esc(j)}</li>`).join('')}</ul>`:''}`;
}
// colonnes à 100 % par groupe, de la gauche à la droite de l'hémicycle
function colChart(ls,fams){
  // mêmes colonnes d'une catégorie à l'autre, pour comparer d'un coup d'œil
  const rows=(fams||FAMS_ACTIFS).map(f=>({f,t:tally(ls,f.id)}));
  return `<div class="cols" style="--n:${rows.length}">${rows.map(({f,t})=>{const n=t.pour+t.contre+t.abstention;
    if(n<MINV)return `<span class="col vide" data-tip="${esc(`<b>${COURT[f.id]}</b><br>${n?`seulement ${n} texte${n>1?'s':''} voté${n>1?'s':''}, pas de pourcentage`:'aucun de ces textes voté'}`)}"><span class="cpct">–</span><span class="cbar"></span><span class="cs">${SIGLE[f.id]}</span><span class="cn">${n}</span></span>`;
    const pp=Math.round(t.pour/n*100),pa=Math.round(t.abstention/n*100),pc=100-pp-pa;
    return `<a class="col" href="${famUrl(f.id)}" data-tip="${esc(`<b>${COURT[f.id]}</b><br>${legende_txt(t)}<br>sur ${n} texte${n>1?'s':''} voté${n>1?'s':''}`)}" aria-label="${esc(`${COURT[f.id]} : ${pp} % pour, ${legende_txt(t)}`)}">
<span class="cpct">${pp}<small>%</small></span><span class="cbar">${pc?`<i class="c" style="flex:${pc}"></i>`:''}${pa?`<i class="a" style="flex:${pa}"></i>`:''}${pp?`<i class="p" style="flex:${pp}"></i>`:''}</span><span class="cs">${SIGLE[f.id]}</span><span class="cn">${n}</span></a>`}).join('')}</div>
<div class="colleg"><span><i class="p"></i>Pour</span><span><i class="a"></i>Abstention</span><span><i class="c"></i>Contre</span><span class="src">En haut : part des textes votés « pour ». En bas : nombre de textes votés par le groupe.</span></div>`;
}
// mini-tableau loi par loi, une case par groupe
function miniMatrice(ls,fams){
  fams=fams||FAMS_ACTIFS;
  return `<div class="scroll"><table class="mini"><thead><tr><th></th>${fams.map(f=>`<th title="${esc(COURT[f.id])}">${SIGLE[f.id]}</th>`).join('')}</tr></thead>
<tbody>${ls.map(l=>`<tr><th scope="row"><a href="/loi/${l.id}">${esc(l.titre)}</a><small>${l.annee}${l.mode==="493"?" · passé en 49.3":""}</small></th>${fams.map(f=>{const p=famPos(l,f.id);return `<td data-tip="${tipAttr(l,f.id)}">${p==="none"?'':cell(p,1)}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function effBadgeBig(k){const [,lab,gl]=EFDEF[k];return `<a class="ebadge big e-${k}" href="${effUrl(k)}"><i>${gl}</i>${esc(lab)}</a>`}
// carte d'une catégorie sur l'accueil
function effCarte(k){
  const ls=loisEffet(k);const votees=ls.filter(l=>l.mode!=="493");const n493=ls.length-votees.length;
  return `<section class="effcard" id="${k}">
<div class="ech"><div>${effBadgeBig(k)}<h3 class="q">${esc(QUESTION[k])}</h3></div><p class="src">${ls.length} texte${ls.length>1?'s':''}${n493?`, dont ${n493} passé${n493>1?'s':''} en 49.3 sans vote`:''}</p></div>
<p class="efdef">${esc(EFDEF[k][3])}</p>
${colChart(votees)}
<details class="efdet"><summary>Voir les ${ls.length} texte${ls.length>1?'s':''}, groupe par groupe</summary>${miniMatrice(ls)}<p class="src"><a href="${effUrl(k)}">Pourquoi chaque texte est rangé ici →</a></p></details>
</section>`;
}
// tableau de synthèse : catégories × groupes
function synthese(){
  const fs=FAMS_ACTIFS;
  return `<div class="scroll"><table class="synth"><thead><tr><th></th>${fs.map(f=>`<th><a href="${famUrl(f.id)}" title="${esc(COURT[f.id])}">${SIGLE[f.id]}</a></th>`).join('')}</tr></thead>
<tbody>${EFFETS_DEF.map(([k,lab,gl])=>{const vs=loisEffet(k).filter(l=>l.mode!=="493");
  return `<tr><th scope="row"><a href="#${k}" class="sl"><span class="ebadge mini e-${k}"><i>${gl}</i></span>${esc(lab)}</a></th>${fs.map(f=>{const t=tally(vs,f.id);const n=t.pour+t.contre+t.abstention;
    if(n<MINV)return `<td class="vide" data-tip="${esc(`${COURT[f.id]} a voté moins de ${MINV} de ces textes`)}">·</td>`;
    const pp=partPour(t);return `<td style="${heat(pp)}" data-tip="${esc(`<b>${COURT[f.id]}</b> · ${lab}<br>${legende_txt(t)}<br>${pp} % des ${n} textes votés`)}">${pp}</td>`}).join('')}</tr>`}).join('')}</tbody></table></div>
<div class="hleg"><span>Vote surtout contre</span>${[0,20,40,60,80,100].map(p=>`<i style="${heat(p)}"></i>`).join('')}<span>Vote surtout pour</span></div>`;
}
function vueAccueil(){
  const n=MES.length,votees=MES.filter(m=>["article","loi","budget"].includes(m.statut)).length;
  return `<section class="hero"><h2>Qui vote pour créer des droits, qui vote pour flexibiliser&nbsp;?</h2>
<p>Les ${VOTEES.length} principales lois votées sur le travail depuis 2016, rangées selon ce qu'elles font. Chaque chiffre est la part des textes que le groupe a votés « pour ». Les groupes sont rangés de la gauche à la droite de l'hémicycle.</p></section>
<section class="overview"><div class="cat-head"><h2>En un coup d'œil</h2><p>Part des textes votés « pour », en %</p></div>${synthese()}
<p class="src" style="margin-top:10px">Une même loi peut porter plusieurs étiquettes : créer un droit et flexibiliser une règle. Voter contre peut tenir à l'autre partie du texte : cliquez pour voir le détail. <a href="/methode">Comment les étiquettes sont posées</a>.</p></section>
${EFFETS_DEF.map(e=>effCarte(e[0])).join('')}
<a class="teaser" href="/concretement"><div><span class="k">Concrètement</span><h3>${n-votees} mesures sur ${n} s'appliquent sans vote des députés</h3><p>49.3, ordonnances, décrets : ce qui a changé dans votre travail, et comment c'est arrivé.</p></div>${barreStatuts()}<span class="go">Voir les ${n} mesures →</span></a>`;
}
function vueEffets(){
  const k=EFSLUG[effSel];if(!k)return vueAccueil();
  const [,lab,gl,def]=EFDEF[k];
  const ls=loisEffet(k);const votees=ls.filter(l=>l.mode!=="493");
  const rows=FAMS.map(f=>({f,t:tally(votees,f.id)})).filter(r=>r.t.pour+r.t.contre+r.t.abstention>=MINV);
  const multi=ls.filter(l=>Object.keys(EFFETS[l.id]).length>1).length;
  return `<a class="back" href="/">← Toutes les catégories</a>
<section class="effcard"><div class="ech"><div>${effBadgeBig(k)}<h3 class="q">${esc(QUESTION[k])}</h3></div><p class="src">${ls.length} texte${ls.length>1?'s':''}</p></div>
<p class="efdef">${esc(def)}</p>${colChart(votees)}
<div class="eff-row head"><div class="nm">Groupe</div><div>Ses votes sur ces textes</div><div class="lg">Détail</div><div class="pct">% pour</div></div>
${rows.map(r=>{const pp=partPour(r.t);const nn=r.t.pour+r.t.contre+r.t.abstention;
 return `<div class="eff-row"><div class="nm">${esc(COURT[r.f.id])}<small>${nn} texte${nn>1?'s':''} voté${nn>1?'s':''}</small></div>
<div data-tip="${esc(`<b>${COURT[r.f.id]}</b><br>${legende_txt(r.t)}`)}">${stackBar(r.t)}</div>
<div class="lg">${legende_txt(r.t)}</div><div class="pct">${pp}&nbsp;%</div></div>`}).join('')}
${multi?`<p class="src efnote">${multi} de ces textes port${multi>1?'ent':'e'} aussi une autre étiquette. Voter contre un texte rangé ici peut tenir à ce qu'il contient par ailleurs.</p>`:''}
<p class="src efnote">Les groupes qui ont voté moins de ${MINV} de ces textes ne sont pas affichés. Les textes passés en 49.3 ne sont pas comptés : les députés ne les ont pas votés.</p></section>
<section class="overview"><div class="cat-head"><h2 style="font-size:21px">Texte par texte</h2></div>${miniMatrice(ls)}
<div class="flist" style="margin-top:12px">${ls.map(l=>{const aut=Object.keys(EFFETS[l.id]).filter(x=>x!==k);
 return `<a class="frow efrow" href="/loi/${l.id}"><span><span class="ft">${esc(l.titre)}</span>${aut.map(x=>`<span class="ebadge mini e-${x}" data-tip="${esc(EFDEF[x][1])}"><i>${EFDEF[x][2]}</i></span>`).join('')}<span class="src"> · ${esc(EFFETS[l.id][k])}</span></span><span class="fy">${l.annee}</span></a>`}).join('')}</div>
${legend()}</section>`;
}
let effSel=null;
let cmpA="Macronistes",cmpB="RN",cmpDuel=false;
function accord(a,b,ls){
  let n=0,acc=0;const rows=[];
  for(const l of (ls||LOIS)){if(l.mode==="493")continue;
    const pa=famPos(l,a),pb=famPos(l,b);
    if(["none","absent"].includes(pa)||["none","absent"].includes(pb))continue;
    n++;const same=pa===pb;if(same)acc++;rows.push({l,a:pa,b:pb,same});}
  return {n,acc,rows,pct:n?Math.round(acc/n*100):null};
}
const PALIERS=[8,20,36,62,88];
function palier(pct){const i=pct>=85?4:pct>=70?3:pct>=55?2:pct>=40?1:0;return [PALIERS[i],i>=3];}
function matriceAccord(){
  const fs=FAMS_ACTIFS;
  return `<div class="scroll"><table class="acc"><thead><tr><th></th>${fs.map(f=>`<th><span>${esc(COURT[f.id])}</span></th>`).join('')}</tr></thead>
<tbody>${fs.map(fa=>`<tr><th scope="row">${esc(COURT[fa.id])}</th>${fs.map(fb=>{
  if(fa.id===fb.id)return `<td class="self"></td>`;
  const r=accord(fa.id,fb.id);
  if(r.pct===null||r.n<5)return `<td class="self" data-tip="${esc(`${COURT[fa.id]} et ${COURT[fb.id]} ont voté ensemble sur moins de 5 textes`)}">·</td>`;
  const [w,inv]=palier(r.pct);
  return `<td class="ac${inv?' inv':''}" style="--w:${w}%"><a href="${cmpUrl(fa.id,fb.id)}" data-tip="${esc(`<b>${COURT[fa.id]} et ${COURT[fb.id]}</b><br>${r.acc} positions identiques sur ${r.n} textes votés par les deux`)}">${r.pct}</a></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
<div class="acleg"><span>Votent rarement pareil</span>${PALIERS.map(w=>`<i style="--w:${w}%"></i>`).join('')}<span>Votent presque toujours pareil</span></div>`;
}
const chipsGroupes=(attr,sel,autre)=>`<div class="famchips" role="group">${FAMS_ACTIFS.map(f=>`<button class="chip${f.id===autre?' autre':''}" ${attr}="${esc(f.id)}" aria-pressed="${f.id===sel}">${esc(COURT[f.id])}</button>`).join('')}</div>`;
// classement : avec qui un groupe vote-t-il le plus souvent ?
function classement(a){
  const rs=FAMS_ACTIFS.filter(f=>f.id!==a).map(f=>({f,r:accord(a,f.id)})).filter(x=>x.r.n>=5).sort((x,y)=>y.r.pct-x.r.pct);
  return `<div class="rank">${rs.map(({f,r})=>`<a class="rk" href="${cmpUrl(a,f.id)}"><span class="nm">${esc(COURT[f.id])}</span><span class="rb"><i style="width:${r.pct}%"></i></span><span class="pc">${r.pct}&nbsp;%</span><span class="src">${r.acc}/${r.n}</span></a>`).join('')}</div>`;
}
function vueComparer(){
  if(!cmpDuel){
    return `<div class="cat-head"><h2>Qui vote comme qui</h2><p>Choisissez un groupe, puis cliquez sur un autre pour comparer texte par texte.</p></div>
${chipsGroupes('data-cmpa',cmpA)}
<section class="overview"><div class="cat-head"><h2 style="font-size:23px">Avec qui vote ${esc(COURT[cmpA])}&nbsp;?</h2><p>Part des textes où les deux groupes ont eu la même position</p></div>
${classement(cmpA)}
<p class="src" style="margin-top:10px">Même position : les deux groupes ont voté pour, ou tous deux contre, ou se sont tous deux abstenus. Seuls comptent les textes votés par les deux groupes. Les textes passés en 49.3, sans vote des députés, ne sont pas comptés.</p></section>
<details class="efdet panel"><summary>Tous les groupes face à tous les groupes</summary><p class="src" style="margin:10px 0">Plus la case est foncée, plus les deux groupes votent pareil. Les groupes ayant voté moins de 10 textes ne sont pas affichés.</p>${matriceAccord()}</details>`;
  }
  const r=accord(cmpA,cmpB);
  const des=r.rows.filter(x=>!x.same),mem=r.rows.filter(x=>x.same);
  const A=esc(COURT[cmpA]),B=esc(COURT[cmpB]);
  const ligne=x=>`<a class="frow" href="/loi/${x.l.id}" style="grid-template-columns:auto auto minmax(0,1fr) auto">${cellBig(x.l,cmpA)}${cellBig(x.l,cmpB)}<span><span class="ft">${esc(x.l.titre)}</span> <span class="src">· ${A} : ${LAB[x.a].toLowerCase()} · ${B} : ${LAB[x.b].toLowerCase()}</span></span><span class="fy">${x.l.annee}</span></a>`;
  const parEffet=EFFETS_DEF.map(([k,lab,gl])=>{const vs=loisEffet(k).filter(l=>l.mode!=="493");const ta=tally(vs,cmpA),tb=tally(vs,cmpB);
    const na=ta.pour+ta.contre+ta.abstention,nb=tb.pour+tb.contre+tb.abstention;const pa=na>=MINV?partPour(ta):null,pb=nb>=MINV?partPour(tb):null;
    const dot=(p,c)=>p===null?'':`<i class="dot ${c}" style="left:${p}%"></i>`;
    const seg=(pa!==null&&pb!==null)?`<i class="seg" style="left:${Math.min(pa,pb)}%;width:${Math.abs(pa-pb)}%"></i>`:'';
    return `<a class="db" href="${effUrl(k)}"><span class="nm"><span class="ebadge mini e-${k}"><i>${gl}</i></span>${esc(lab)}</span><span class="pa">${pa===null?'–':pa+'&nbsp;%'}</span><span class="track">${seg}${dot(pa,'da')}${dot(pb,'dbb')}</span><span class="pb">${pb===null?'–':pb+'&nbsp;%'}</span></a>`}).join('');
  const chrono=LOIS.filter(l=>famPos(l,cmpA)!=="none"||famPos(l,cmpB)!=="none");
  return `<a class="back" href="/comparer">← Tous les groupes</a>
<div class="duelpick"><div><span class="k a">Groupe 1</span>${chipsGroupes('data-duela',cmpA,cmpB)}</div><div><span class="k b">Groupe 2</span>${chipsGroupes('data-duelb',cmpB,cmpA)}</div></div>
${r.n?`<div class="duel"><div class="vs"><span class="ga">${A}</span><span class="duelnum">${r.pct}&nbsp;%</span><span class="gb">${B}</span></div><div><p style="margin:0 0 8px">Même position sur <b>${r.acc} des ${r.n}</b> textes votés par les deux groupes.</p>
<div class="stack" style="height:26px"><i class="same" style="flex:${r.acc}"><b>${r.acc}</b></i>${r.n-r.acc?`<i class="diff" style="flex:${r.n-r.acc}"><b>${r.n-r.acc}</b></i>`:''}</div>
<div class="lg" style="margin-top:6px">${r.acc} fois d'accord · ${r.n-r.acc} fois en désaccord</div></div></div>
<section class="overview"><div class="cat-head"><h2 style="font-size:23px">Ce qu'ils soutiennent</h2><p>Part des textes votés « pour », par catégorie</p></div>
<div class="dbleg"><span><i class="dot da"></i>${A} <span class="src">chiffre de gauche</span></span><span><i class="dot dbb"></i>${B} <span class="src">chiffre de droite</span></span></div>${parEffet}
<p class="src" style="margin-top:8px">– : moins de ${MINV} textes votés dans la catégorie.</p></section>
<section class="overview"><div class="cat-head"><h2 style="font-size:23px">Texte par texte</h2><p>Dans l'ordre chronologique. Les textes en désaccord sont signalés.</p></div>
<div class="scroll"><div class="tl">${chrono.map(l=>{const pa=famPos(l,cmpA),pb=famPos(l,cmpB);const diff=l.mode!=="493"&&!["none","absent"].includes(pa)&&!["none","absent"].includes(pb)&&pa!==pb;
 return `<a class="tli${diff?' diff':''}" href="/loi/${l.id}" data-tip="${esc(`<b>${l.titre}</b>, ${l.annee}<br>${COURT[cmpA]} : ${LAB[pa]}<br>${COURT[cmpB]} : ${LAB[pb]}`)}"><span class="y">${l.annee}</span>${cell(pa)}${cell(pb)}<span class="t">${esc(l.titre)}</span></a>`}).join('')}</div></div>
<div class="tlleg"><span>Ligne du haut : ${A}</span><span>Ligne du bas : ${B}</span><span><i class="mk"></i> désaccord</span></div>${legend()}</section>
${des.length?`<div class="panel"><h3>Là où ils ne sont pas d'accord</h3><div class="flist">${des.map(ligne).join('')}</div></div>`:''}
${mem.length?`<details class="panel efdet" style="margin-top:18px"><summary>Là où ils votent pareil (${mem.length})</summary><div class="flist">${mem.map(ligne).join('')}</div></details>`:''}
<p class="src" style="margin-top:12px">Les textes passés en 49.3 ne sont pas comptés dans le pourcentage : les députés ne les ont pas votés.</p>`:`<div class="panel"><p>Ces deux groupes n'ont jamais siégé en même temps sur les textes de cette sélection.</p></div>`}`;
}
function vueMethode(){return `<div class="panel method"><h3 style="margin-top:0">D'où viennent les chiffres</h3>
<p>Tous les votes proviennent des données ouvertes de l'Assemblée nationale (archives des scrutins publics des 14e, 15e, 16e et 17e législatures). Chaque vote affiché renvoie à sa page officielle. Un échantillon de 10 scrutins a été vérifié groupe par groupe contre ces pages : les chiffres sont identiques.</p>
<h3>Quels votes</h3><p>${LOIS.filter(l=>l.mode!=="493").length} lois sur le travail, les retraites et l'assurance chômage, votées de 2016 à 2026, plus ${LOIS.filter(l=>l.mode==="493").length} textes adoptés par 49.3 sans vote. Pour chaque texte, un vote de référence (le vote final quand il existe) et quelques votes d'amendements qui ont marqué le débat. Seuls les scrutins publics sont connus groupe par groupe : les votes à main levée ne laissent pas de trace.</p>
<h3>La position d'un groupe</h3><p>C'est la position qui recueille le plus de voix parmi les députés du groupe qui ont voté : pour, contre ou abstention. Si aucun député du groupe n'a voté, le groupe « n'a pas pris part au vote ». Les « votants » sont les députés qui ont voté pour, contre ou se sont abstenus : ce n'est pas le nombre de présents.</p>
<h3>Le 49.3</h3><p>Quand le gouvernement engage sa responsabilité (article 49.3 de la Constitution), le texte est adopté sans vote, sauf si une motion de censure est votée. Pour ces textes, on montre qui a voté la censure. Ne pas voter la censure ne veut pas dire soutenir le texte.</p>
<h3>Les familles politiques</h3><p>Les groupes changent de nom d'une législature à l'autre. On les regroupe en familles (par exemple LREM, puis Renaissance, puis Ensemble pour la République), en s'appuyant sur le parcours des députés d'un groupe à l'autre. Le nom officiel du groupe au moment du vote reste affiché sur chaque page. Les députés non inscrits ne sont pas montrés dans les tableaux.</p>
<h3>Les étiquettes d'effet</h3><p>Chaque texte reçoit une ou plusieurs étiquettes qui décrivent ce qu'il fait, pas ce qu'il vaut. Elles sont posées à partir du contenu du texte, et chacune est justifiée en une phrase sur la fiche de la loi. Une loi peut en porter plusieurs : la loi Travail de 2016 crée le compte personnel d'activité et fait passer le temps de travail à l'accord d'entreprise, elle porte donc les deux étiquettes correspondantes.</p>
<ul class="mlist">${EFFETS_DEF.map(e=>`<li><b>${esc(e[1])}</b> ${esc(e[3])}</li>`).join('')}</ul>
<p>Les étiquettes servent aussi d'entrée sur la page d'accueil : elles permettent de voir, par grandes masses, qui soutient quel type de texte. Le chiffre affiché est la part des textes de l'étiquette sur lesquels le groupe a voté pour, abstentions comprises dans le total. Un groupe qui a voté moins de 3 textes d'une étiquette n'a pas de chiffre.</p>
<p>Deux textes ne sont rangés sous aucune étiquette, parce qu'aucune règle n'en est sortie : le projet de retraite universelle, abandonné en mars 2020, et la proposition d'abrogation de 2024, vidée de son contenu en commission puis rejetée.</p>
<p>Ces étiquettes sont le seul endroit du site où un jugement de contenu est porté. Elles décrivent la direction d'un texte, pas sa valeur : « flexibilisation » n'est ni un reproche ni un compliment. Si une étiquette vous paraît mal posée, écrivez-nous, l'argument et la source nous intéressent.</p>
<h3>Neutralité</h3><p>Aucun vote n'est qualifié de « bon » ou de « mauvais ». Vert pour « a voté pour », rouge pour « a voté contre », gris pour l'abstention, violet pour « a voté la censure ». Chaque case porte aussi un symbole, pour rester lisible sans distinguer les couleurs.</p></div>`}

const STAT={article:["Voté par les députés","vote","Les députés se sont prononcés sur la mesure elle-même, en scrutin public."],
 loi:["Voté dans une loi","vote","La mesure figure dans une loi votée par l'Assemblée, mais le vote a porté sur l'ensemble du texte."],
 budget:["Voté dans un budget","partiel","Arrivé par amendement budgétaire, sans examen en commission ni étude d'impact."],
 "493":["Passé en 49.3","novote","Le texte est bien en vigueur, mais les députés ne l'ont jamais voté : le gouvernement a engagé sa responsabilité, et seule une motion de censure aurait pu l'arrêter."],
 ordonnance:["Écrit par ordonnance","novote","Le texte est en vigueur. Il a été écrit par le gouvernement : les députés ont voté l'autorisation de l'écrire, puis sa ratification, pas son contenu."],
 decret:["Imposé par décret","novote","Le texte est en vigueur. Il a été fixé par le gouvernement seul, sans passage devant le Parlement."],
 rien:["Sans texte de loi","novote","Rien dans la loi. La pratique dépend des accords d'entreprise ou de consignes sans valeur contraignante."]};
const ORDRE_ST=["article","loi","budget","493","ordonnance","decret","rien"];
const VOTE_ST=["article","loi","budget"];
// barre voté / pas voté, en deux blocs
function barreStatuts(){
  const parSt=Object.fromEntries(ORDRE_ST.map(k=>[k,MES.filter(m=>m.statut===k)]));
  const seg=k=>{const v=parSt[k].length;if(!v)return '';const c=STAT[k][1]==="vote"?'var(--pour)':(STAT[k][1]==="partiel"?'color-mix(in srgb,var(--pour) 55%,var(--abst))':'var(--contre)');
    return `<i style="flex:${v};background:${c}" data-tip="${esc(`<b>${STAT[k][0]}</b><br>${v} mesure${v>1?'s':''}`)}"><b>${v}</b><span>${esc(STAT[k][0])}</span></i>`};
  const nv=MES.filter(m=>VOTE_ST.includes(m.statut)).length;
  return `<div class="vnv"><div class="vh2"><span style="flex:${nv}"><b>${nv}</b> votées</span><span style="flex:${MES.length-nv}"><b>${MES.length-nv}</b> pas votées</span></div><div class="msum">${ORDRE_ST.map(seg).join('')}</div></div>`;
}
function vueMesures(){
  const n=MES.length, votees=MES.filter(m=>VOTE_ST.includes(m.statut)).length;
  const parSt=Object.fromEntries(ORDRE_ST.map(k=>[k,MES.filter(m=>m.statut===k)]));
  return `<section class="overview"><div class="cat-head"><h2>Ce qui a changé dans votre travail</h2><p>${n} mesures concrètes des dix dernières années, et la façon dont elles sont arrivées dans votre quotidien.</p></div>
${barreStatuts()}
<p class="src"><b>${votees} mesures sur ${n}</b> ont été votées par les députés. Les ${n-votees} autres s'appliquent sans que les députés aient voté dessus : passées en 49.3, écrites par ordonnance, imposées par décret, ou sans texte de loi.</p>
<div class="stjump">${ORDRE_ST.filter(k=>parSt[k].length).map(k=>`<a href="#st-${k}" class="badge ${STAT[k][1]}">${esc(STAT[k][0])} · ${parSt[k].length}</a>`).join('')}</div></section>
${ORDRE_ST.map(k=>{const ms=parSt[k];if(!ms.length)return '';const [lab,cls,desc]=STAT[k];
 return `<div class="mgroup" id="st-${k}"><h2>${esc(lab)}</h2><span>${ms.length} mesure${ms.length>1?'s':''} · ${esc(desc)}</span></div>
<div class="mz">${ms.map(m=>{const s=m.scrutin;const loi=s?LOIS.find(l=>[l.reference,...l.autres].some(x=>x.uid===s.uid)):null;
 return `<article class="mcard"><div class="meta"><span class="badge ${cls}">${esc(lab)}</span><span>${esc(m.categorie)}</span></div>
 <h3>${esc(m.nom)}</h3><p class="ch">${esc(m.change)}</p>
 <div class="note">${esc(m.note)}</div>
 <div class="meta"><span>${esc(m.vehicule)}</span><span>Vérifié le ${esc(VERIF)}</span>${s?`<span class="num">${s.sort==="adopté"?"Adopté":"Rejeté"} ${s.pour}-${s.contre}</span>`:''}
 ${s?`<span class="dots">${FAMS.filter(f=>s.f[f.id]).map(f=>`<span data-tip="${esc(`<b>${COURT[f.id]}</b><br>${LAB[s.f[f.id][4]]}<br>${s.f[f.id][0]} pour · ${s.f[f.id][1]} contre · ${s.f[f.id][2]} abst.`)}">${cell(s.f[f.id][4],1)}</span>`).join('')}</span>`:''}
 ${loi?`<a href="/loi/${loi.id}">voir la loi</a>`:''}${s?` · <a href="${s.lien}" target="_blank" rel="noopener">le scrutin</a>`:''} · <a href="${esc(m.source)}" target="_blank" rel="noopener">source</a></div></article>`}).join('')}</div>`}).join('')}
<p class="src" style="margin-top:18px">Chaque mesure a été vérifiée dans une source publique, citée ligne par ligne. Quand une mesure vient d'un accord entre syndicats et patronat, d'une ordonnance ou d'un décret, c'est écrit.</p>`;
}

function vueMentions(){return `<div class="panel method"><h3 style="margin-top:0">Mentions légales</h3>
<p><b>Éditeur du site</b><br>SAMJOHD, EURL au capital de 1 000 €, immatriculée au RCS de Lyon sous le numéro 884 283 698.<br>Siège social : 6 rue Hippolyte Flandrin, 69001 Lyon.<br>Directeur de la publication : Samuel Durand.<br>Contact : <a href="mailto:contact@letravailvote.fr">contact@letravailvote.fr</a></p>
<p><b>Hébergeur</b><br>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. <a href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a></p>
<p><b>Données personnelles</b><br>Ce site ne collecte aucune donnée personnelle. Il n'utilise ni cookie, ni traceur, ni outil de mesure d'audience. Aucun compte n'est nécessaire pour le consulter.</p>
<p><b>Données affichées</b><br>Les votes proviennent des données ouvertes de l'Assemblée nationale, publiées sous licence ouverte. Les textes de présentation et les regroupements par famille politique sont le travail de l'éditeur, et sont réutilisables en citant la source.</p>
<h3>Signaler une erreur</h3>
<p>Ce site affiche des milliers de chiffres. Une erreur est toujours possible, et chaque signalement est utile.</p>
<p>Écrivez à <a href="mailto:contact@letravailvote.fr">contact@letravailvote.fr</a> en indiquant la page concernée, l'information qui vous semble fausse, et si possible la source qui dit le contraire. Les corrections sont apportées dès vérification, et la date de mise à jour du site en bas de page change à chaque correction.</p>
<h3>Ce que ce site n'est pas</h3>
<p>Ce site ne dit pas si un vote est bon ou mauvais. Il ne note pas les groupes, ne classe pas les députés, et ne recommande rien. Il montre des votes, leur contexte, et renvoie à la source officielle de chacun.</p>
<p class="src">Dernière mise à jour des données et des textes : ${esc(VERIF)}.</p></div>`}
// ---------- adresses
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const FAMSLUG=Object.fromEntries(FAMS.map(f=>[slug(COURT[f.id]),f.id]));const CATSLUG=Object.fromEntries(DATA.categories.map(c=>[slug(c),c]));
const catUrl=c=>c==="Toutes"?'/sujets':`/sujets/${slug(c)}`;const famUrl=f=>`/groupes/${slug(COURT[f])}`;const cmpUrl=(a,b)=>`/comparer/${slug(COURT[a])}/${slug(COURT[b])}`;
// même titre que les pages générées par generer_pages.py
function titre(v,arg){
  if(v==="loi"&&BYID[arg])return `${BYID[arg].titre}, ${BYID[arg].annee} : qui a voté quoi`;
  if(v==="sujets")return catSel==="Toutes"?"Les votes par sujet":`${catSel} : qui a voté quoi`;
  if(v==="effets")return EFSLUG[arg]?`${EFDEF[EFSLUG[arg]][1]} : qui a voté quoi`:"";
  if(v==="concretement")return "Ce qui a changé dans votre travail";
  if(v==="groupes")return arg?`Comment ${COURT[famSel]} a voté sur le travail`:"Les votes par groupe politique";
  if(v==="comparer")return arg?`${COURT[cmpA]} et ${COURT[cmpB]} : leurs votes comparés`:"Comparer deux groupes";
  return {methode:"Méthode",mentions:"Mentions légales"}[v]||"";
}
// ---------- routeur
function render(){
  const p=location.pathname.split('/').filter(Boolean);let v=p[0]||"accueil";const arg=p[1];
  if(v==="effets"&&!arg){history.replaceState(null,'','/');v="accueil"}
  if(v==="sujets")catSel=CATSLUG[arg]||"Toutes";
  if(v==="effets")effSel=arg||null;
  cmpDuel=(v==="comparer"&&!!arg);
  if(v==="groupes"&&FAMSLUG[arg])famSel=FAMSLUG[arg];
  if(v==="comparer"){if(FAMSLUG[arg])cmpA=FAMSLUG[arg];if(FAMSLUG[p[2]])cmpB=FAMSLUG[p[2]];}
  const map={accueil:vueAccueil,concretement:vueMesures,sujets:vueSujets,effets:vueEffets,groupes:vueGroupes,comparer:vueComparer,methode:vueMethode,mentions:vueMentions};
  $('#view').innerHTML=`<div class="view">${v==="loi"?vueLoi(arg):map[v]?map[v]():`<p>Cette page n'existe pas. <a href="/">Revenir à l'accueil</a></p>`}</div>`;
  const cur=(v==="accueil"||v==="effets")?"/":"/"+(v==="loi"?"sujets":v);
  document.querySelectorAll('nav.tabs a').forEach(a=>a.setAttribute('aria-current',a.getAttribute('href')===cur?'page':'false'));
  const t=titre(v,arg);document.title=t?`${t} · Le Travail Voté`:"Le Travail Voté";
  tip.hidden=true;
}
function go(url,haut){if(url!==location.pathname)history.pushState(null,'',url);render();if(haut)scrollTo({top:0})}
// anciennes adresses en #, encore présentes dans des liens partagés
function depuisHash(){const h=location.hash.slice(1);if(/^(mesures|sujets|groupes|comparer|methode|mentions|loi\/[\w-]+)$/.test(h)){history.replaceState(null,'',h==="mesures"?'/concretement':'/'+h);return true}}
addEventListener('popstate',()=>{render();scrollTo({top:0})});
addEventListener('hashchange',()=>{if(depuisHash()){render();scrollTo({top:0})}});
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="/"]');
  if(a&&!a.target&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();go(a.getAttribute('href'),true);return}
  const c=e.target.closest('[data-cat]');if(c){go(catUrl(c.dataset.cat));return}
  const g=e.target.closest('[data-fam]');if(g){go(famUrl(g.dataset.fam),true);return}
  const ca=e.target.closest('[data-cmpa]');if(ca){cmpA=ca.dataset.cmpa;render();return}
  const da=e.target.closest('[data-duela]');if(da){const x=da.dataset.duela;go(x===cmpB?cmpUrl(x,cmpA):cmpUrl(x,cmpB));return}
  const db=e.target.closest('[data-duelb]');if(db){const x=db.dataset.duelb;go(x===cmpA?cmpUrl(cmpB,x):cmpUrl(cmpA,x));return}});
$('#maj').textContent=VERIF||$('#maj').textContent;
depuisHash();render();
