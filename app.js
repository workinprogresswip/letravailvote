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
  return `<div class="scroll"><table class="mx"><thead><tr><th></th>${ls.map(l=>`<th class="law"><a href="#loi/${l.id}"><span class="yr">${l.annee}${l.mode==="493"?" · 49.3":""}</span><span class="lt">${esc(l.titre)}</span><span class="res">${l.mode==="493"?"pas de vote":`${l.reference.sort==="adopté"?"adopté":"rejeté"} ${l.reference.pour}-${l.reference.contre}`}</span></a></th>`).join('')}${cat==="Retraites"?"":`<th class="law"><span class="yr">Tendance</span><span class="lt">sur les lois votées</span></th>`}</tr></thead>
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
<p class="src" style="margin-top:12px">Les 3 textes passés en 49.3 (loi Travail 2016, retraite universelle 2020, retraites 2023) ne sont pas comptés ici : l'Assemblée ne les a jamais votés.</p></section>`;
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
function vueLoi(id){
  const l=BYID[id];if(!l)return `<p>Loi introuvable.</p>`;const p=PET[id];const T=TEXTES[id]||(p?{bref:'',contenu:p.contenu}:{});
  const r=l.reference;
  return `<a class="back" href="#sujets">← Tous les sujets</a>
<div class="law-head"><div><span class="tag">${esc(l.categorie)}</span> <span class="tag">${l.annee}</span>${l.mode==="493"?' <span class="tag">Adoptée par 49.3</span>':''}</div><h2>${esc(l.titre)}</h2><div class="bref">${esc(T.bref||'')}</div></div>
<div class="grid2"><div class="panel"><h3>Ce que contient le texte</h3>${POURVOUS[id]?`<div class="pourvous"><span class="k">Ce que ça change pour vous</span><p>${esc(POURVOUS[id])}</p></div>`:''}${T.note493?`<div class="note493"><b>Pas de vote sur le texte.</b> ${esc(T.note493)}</div>`:''}<p>${esc(T.contenu||'')}</p>
${p?`<p class="src">${esc(p.statut)} · <a href="${esc(p.source)}" target="_blank" rel="noopener">source</a> · Vérifié le ${esc(VERIF)}</p>`:''}<p class="src">Texte de présentation rédigé pour ce site, à relire avant publication.</p></div>
<div class="panel"><h3>Les groupes en un coup d'œil</h3><div class="flist">${FAMS.filter(f=>famPos(l,f.id)!=="none").map(f=>{const v=l.mode==="493"?null:l.reference.f[f.id];const det=v?`${v[0]} pour · ${v[1]} contre · ${v[2]} abst.`:'';return `<div class="frow" style="grid-template-columns:auto minmax(0,1fr)" data-tip="${tipAttr(l,f.id)}">${cellBig(l,f.id)}<span>${esc(COURT[f.id])} <span class="src">· ${LAB[famPos(l,f.id)]}${det?` · <span class="num">${det}</span>`:''}</span></span></div>`}).join('')}</div></div></div>
<div style="display:grid;gap:18px;margin-top:18px">
${scrutinBlock(r,l.mode==="493"?"La motion de censure":"Le vote de référence")}
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
<div class="scroll"><div class="strip">${chrono.map(l=>`<a class="sitem" href="#loi/${l.id}" data-tip="${tipAttr(l,f)}"><span class="y">${l.annee}</span>${cellBig(l,f)}<span class="t">${esc(l.titre)}</span></a>`).join('')}</div></div>
${legend()}</section>
<div class="panel">${DATA.categories.map(c=>{const ls=LOIS.filter(l=>l.categorie===c&&famPos(l,f)!=="none");if(!ls.length)return '';return `<h3 style="font-size:18px;margin-top:16px">${esc(c)}</h3><div class="flist">${ls.map(l=>`<a class="frow" href="#loi/${l.id}" data-tip="${tipAttr(l,f)}">${cell(famPos(l,f),1)}<span><span class="ft">${esc(l.titre)}</span> <span class="src">· ${LAB[famPos(l,f)]}</span></span><span class="fy">${l.annee}</span></a>`).join('')}</div>`}).join('')}</div>`;
}
let cmpA="Macronistes",cmpB="RN";
function vueComparer(){
  const ls=LOIS.filter(l=>l.mode!=="493");let acc=0,n=0;const rows=[];
  for(const l of ls){const a=famPos(l,cmpA),b=famPos(l,cmpB);if(["none","absent"].includes(a)||["none","absent"].includes(b))continue;n++;const same=a===b;if(same)acc++;rows.push({l,a,b,same})}
  const opt=v=>FAMS.map(f=>`<option value="${esc(f.id)}"${f.id===v?' selected':''}>${esc(COURT[f.id])}</option>`).join('');
  return `<div class="sel"><label for="ca">Comparer</label><select id="ca">${opt(cmpA)}</select><label for="cb">avec</label><select id="cb">${opt(cmpB)}</select></div>
<div class="panel">${n?`<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;margin-bottom:14px"><div class="big num">${Math.round(acc/n*100)} %</div><p style="margin:0;max-width:44ch">${esc(COURT[cmpA])} et ${esc(COURT[cmpB])} ont eu la même position sur <b>${acc} des ${n}</b> lois où les deux groupes ont voté.</p></div>
<div class="flist">${rows.map(r=>`<a class="frow" href="#loi/${r.l.id}" style="grid-template-columns:auto auto minmax(0,1fr) auto">${cell(r.a,1)}${cell(r.b,1)}<span><span class="ft">${esc(r.l.titre)}</span> <span class="src">· ${r.same?'même position':'positions différentes'}</span></span><span class="fy">${r.l.annee}</span></a>`).join('')}</div>
<p class="src" style="margin-top:12px">Colonne de gauche : ${esc(COURT[cmpA])}. Colonne de droite : ${esc(COURT[cmpB])}. Les textes adoptés par 49.3 ne sont pas comptés.</p>`:`<p>Ces deux groupes n'ont jamais voté sur les mêmes lois de cette sélection.</p>`}</div>`;
}
function vueMethode(){return `<div class="panel method"><h3 style="margin-top:0">D'où viennent les chiffres</h3>
<p>Tous les votes proviennent des données ouvertes de l'Assemblée nationale (archives des scrutins publics des 14e, 15e, 16e et 17e législatures). Chaque vote affiché renvoie à sa page officielle. Un échantillon de 10 scrutins a été vérifié groupe par groupe contre ces pages : les chiffres sont identiques.</p>
<h3>Quels votes</h3><p>${LOIS.length} textes sur le travail, les retraites et l'assurance chômage, de 2016 à 2026. Pour chaque texte, un vote de référence (le vote final quand il existe) et quelques votes d'amendements qui ont marqué le débat. Seuls les scrutins publics sont connus groupe par groupe : les votes à main levée ne laissent pas de trace.</p>
<h3>La position d'un groupe</h3><p>C'est la position qui recueille le plus de voix parmi les députés du groupe qui ont voté : pour, contre ou abstention. Si aucun député du groupe n'a voté, le groupe « n'a pas pris part au vote ». Les « votants » sont les députés qui ont voté pour, contre ou se sont abstenus : ce n'est pas le nombre de présents.</p>
<h3>Le 49.3</h3><p>Quand le gouvernement engage sa responsabilité (article 49.3 de la Constitution), le texte est adopté sans vote, sauf si une motion de censure est votée. Pour ces textes, on montre qui a voté la censure. Ne pas voter la censure ne veut pas dire soutenir le texte.</p>
<h3>Les familles politiques</h3><p>Les groupes changent de nom d'une législature à l'autre. On les regroupe en familles (par exemple LREM, puis Renaissance, puis Ensemble pour la République), en s'appuyant sur le parcours des députés d'un groupe à l'autre. Le nom officiel du groupe au moment du vote reste affiché sur chaque page. Les députés non inscrits ne sont pas montrés dans les tableaux.</p>
<h3>Neutralité</h3><p>Aucun vote n'est qualifié de « bon » ou de « mauvais ». Vert pour « a voté pour », rouge pour « a voté contre », gris pour l'abstention, violet pour « a voté la censure ». Chaque case porte aussi un symbole, pour rester lisible sans distinguer les couleurs.</p></div>`}

const STAT={article:["Voté article par article","vote","Les députés se sont prononcés sur la mesure elle-même, en scrutin public."],
 loi:["Voté dans une loi","vote","La mesure figure dans une loi votée par l'Assemblée, mais le vote a porté sur l'ensemble du texte."],
 budget:["Voté dans un budget","partiel","Arrivé par amendement budgétaire, sans examen en commission ni étude d'impact."],
 "493":["Jamais voté : 49.3","novote","Le gouvernement a engagé sa responsabilité. Le texte est adopté sans vote, sauf censure."],
 ordonnance:["Jamais voté : ordonnance","novote","Règle écrite par le gouvernement. Les députés ont voté l'autorisation de l'écrire, puis sa ratification."],
 decret:["Jamais voté : décret","novote","Fixé par le gouvernement, sans passage devant le Parlement."],
 rien:["Aucun texte","novote","Rien dans la loi. La pratique dépend des accords d'entreprise ou de consignes sans valeur contraignante."]};
const ORDRE_ST=["article","loi","budget","493","ordonnance","decret","rien"];
function vueMesures(){
  const n=MES.length, votees=MES.filter(m=>["article","loi","budget"].includes(m.statut)).length;
  const parSt=Object.fromEntries(ORDRE_ST.map(k=>[k,MES.filter(m=>m.statut===k)]));
  const seg=(k)=>{const v=parSt[k].length;if(!v)return '';const c=STAT[k][1]==="vote"?'var(--pour)':(STAT[k][1]==="partiel"?'var(--abst)':'var(--contre)');
    return `<i style="flex:${v};background:${c}" data-tip="${esc(`<b>${STAT[k][0]}</b><br>${v} mesure${v>1?'s':''}`)}">${v}</i>`};
  return `<section class="overview"><div class="cat-head"><h2>Ce qui a changé dans votre travail</h2><p>${n} mesures concrètes des dix dernières années, et la façon dont elles sont arrivées dans votre quotidien.</p></div>
<div class="msum">${ORDRE_ST.map(seg).join('')}</div>
<p class="src"><b>${votees} mesures sur ${n}</b> ont été votées par l'Assemblée, d'une façon ou d'une autre. ${n-votees} ne l'ont jamais été : 49.3, ordonnance, décret, ou absence totale de texte.</p></section>
${ORDRE_ST.map(k=>{const ms=parSt[k];if(!ms.length)return '';const [lab,cls,desc]=STAT[k];
 return `<div class="mgroup"><h2>${esc(lab)}</h2><span>${ms.length} mesure${ms.length>1?'s':''} · ${esc(desc)}</span></div>
<div class="mz">${ms.map(m=>{const s=m.scrutin;const loi=s?LOIS.find(l=>[l.reference,...l.autres].some(x=>x.uid===s.uid)):null;
 return `<article class="mcard"><div class="meta"><span class="badge ${cls}">${esc(lab)}</span><span>${esc(m.categorie)}</span></div>
 <h3>${esc(m.nom)}</h3><p class="ch">${esc(m.change)}</p>
 <div class="note">${esc(m.note)}</div>
 <div class="meta"><span>${esc(m.vehicule)}</span><span>Vérifié le ${esc(VERIF)}</span>${s?`<span class="num">${s.sort==="adopté"?"Adopté":"Rejeté"} ${s.pour}-${s.contre}</span>`:''}
 ${s?`<span class="dots">${FAMS.filter(f=>s.f[f.id]).map(f=>`<span data-tip="${esc(`<b>${COURT[f.id]}</b><br>${LAB[s.f[f.id][4]]}<br>${s.f[f.id][0]} pour · ${s.f[f.id][1]} contre · ${s.f[f.id][2]} abst.`)}">${cell(s.f[f.id][4],1)}</span>`).join('')}</span>`:''}
 ${loi?`<a href="#loi/${loi.id}">voir la loi</a>`:''}${s?` · <a href="${s.lien}" target="_blank" rel="noopener">le scrutin</a>`:''} · <a href="${esc(m.source)}" target="_blank" rel="noopener">source</a></div></article>`}).join('')}</div>`}).join('')}
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
// ---------- routeur
function render(){
  const h=location.hash.slice(1)||"mesures";const [v,arg]=h.split('/');
  const map={sujets:vueSujets,mesures:vueMesures,groupes:vueGroupes,comparer:vueComparer,methode:vueMethode,mentions:vueMentions};
  $('#view').innerHTML=`<div class="view">${v==="loi"?vueLoi(arg):(map[v]||vueMesures)()}</div>`;
  document.querySelectorAll('nav.tabs a').forEach(a=>a.setAttribute('aria-current',a.getAttribute('href')==='#'+(v==="loi"?"sujets":v)?'page':'false'));
  tip.hidden=true;
}
addEventListener('hashchange',()=>{render();scrollTo({top:0})});
document.addEventListener('click',e=>{const c=e.target.closest('[data-cat]');if(c){catSel=c.dataset.cat;render();return}const g=e.target.closest('[data-fam]');if(g){famSel=g.dataset.fam;render();scrollTo({top:0})}});
document.addEventListener('change',e=>{if(e.target.id==='fam'){famSel=e.target.value;render()}if(e.target.id==='ca'){cmpA=e.target.value;render()}if(e.target.id==='cb'){cmpB=e.target.value;render()}});
render();
