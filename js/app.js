import {setupReports,updateReport,downloadJSON,buildReport} from './report.js';
import {load,save,put,newAssessment,emptyLibrary,copyForEditing,updateAnswer,importDiagnostic,exportDiagnostic,removeAssessment} from './storage.js';
import {showView} from './navigation.js';
import {renderQuestion} from './assessment.js';
import {calculate,recommendations,progress,registered,scoreText,signal,signalLabel,dimNames} from './engine.js';
import {normalizeAssessment,QUESTIONNAIRE_VERSION} from './data.js';
import {setupTools} from './tools-menu.js';
import {showModal,bindModal} from './modal.js';

const $=s=>document.querySelector(s);
const get=async p=>{const res=await fetch(p);if(!res.ok)throw new Error('No se pudo cargar '+p+' ('+res.status+')');return res.json();};
let questions=[],knowledge={},deps={},maturity=[],resources={intentions:[]},library=emptyLibrary(),state=null,dims=[];
let storageBlocked=false,saveTimer=null,noteBaseline=null,contextBaseline=null,actionBaseline=null;
const dimLabel=d=>dimNames[d]||d,clone=x=>JSON.parse(JSON.stringify(x)),now=()=>new Date().toISOString();
function text(tag,value,parent,className=''){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;parent.appendChild(el);return el;}
function button(label,parent,handler,className='secondary'){const b=text('button',label,parent,className);b.type='button';b.onclick=handler;return b;}
function announce(message,error=false){$('#storageStatus').textContent=message;$('#storageStatus').dataset.error=String(error);$('#savedState').textContent=message;}
function persist(){
  clearTimeout(saveTimer);
  if(!state)return true;
  if(storageBlocked){announce('No se pudo leer el almacenamiento. No se sobrescribirá. Exporta el trabajo actual como JSON.',true);return false;}
  try{if(state.status==='draft'&&state.questionnaireVersion===QUESTIONNAIRE_VERSION)state.updatedAt=now();put(library,state);save(library);announce('Guardado localmente · '+new Date(state.updatedAt).toLocaleTimeString('es-MX'));updateHome();return true;}
  catch{announce('No se pudo guardar. El trabajo sigue en esta pestaña; exporta JSON antes de salir.',true);return false;}
}
function scheduleSave(){announce('Cambios pendientes de guardar…');clearTimeout(saveTimer);saveTimer=setTimeout(persist,450);}
function updateHome(){const draft=library.assessments.find(s=>s.assessmentId===library.activeId&&s.status==='draft')||library.assessments.find(s=>s.status==='draft');$('#resumeAssessment').hidden=!draft;}
function commitNote(){
  if(!noteBaseline||!state)return;
  const {id,before}=noteBaseline,after=state.answers[id];
  if(after&&JSON.stringify(before&&{status:before.status,value:before.value,note:before.note})!==JSON.stringify({status:after.status,value:after.value,note:after.note}))
    state.revisions.push({type:'answer',questionId:id,at:now(),before,after:clone(after)});
  noteBaseline=null;
}
function commitContext(){
  if(!contextBaseline||!state)return;
  const after={intent:state.intent,context:clone(state.context)};
  if(JSON.stringify(contextBaseline)!==JSON.stringify(after))state.revisions.push({type:'context',at:now(),before:contextBaseline,after});
  contextBaseline=null;
}
function commitAction(){
  if(!actionBaseline||!state)return;
  const after=state.actions.find(a=>a.id===actionBaseline.id)||null;
  if(JSON.stringify(actionBaseline.before)!==JSON.stringify(after))state.revisions.push({type:'action',at:now(),actionId:actionBaseline.id,before:actionBaseline.before,after:clone(after)});
  actionBaseline=null;
}
function flush(){commitNote();commitContext();commitAction();return persist();}
function startNew(){flush();state=newAssessment();$('#resultNav').disabled=true;updateReport(null);persist();setupNeeds();syncContextForm();go('needs');}
function ensureEditable(){
  if(!state){state=newAssessment();$('#resultNav').disabled=true;persist();}
  else if(state.status==='finalized'||state.questionnaireVersion!==QUESTIONNAIRE_VERSION){
    state=copyForEditing(state);$('#resultNav').disabled=true;persist();announce('Copia editable creada. El diagnóstico original se conserva.');
  }
}
function go(id){
  flush();
  if(id==='history')renderHistory();
  if(id==='needs'){ensureEditable();setupNeeds();}
  if(id==='context'){ensureEditable();syncContextForm();}
  showView(id);
}
function setupNeeds(){
  const grid=$('#intentGrid');grid.replaceChildren();
  resources.intentions.forEach((x,i)=>{
    const b=button('',grid,()=>{ensureEditable();contextBaseline??={intent:state.intent,context:clone(state.context)};state.intent=x.id;scheduleSave();setupNeeds();grid.children[i]?.focus();},'intent-card'+(state?.intent===x.id?' selected':''));
    b.setAttribute('aria-pressed',String(state?.intent===x.id));
    text('p',String(i+1).padStart(2,'0'),b,'eyebrow');text('b',x.title,b);
    text('span',x.focus.length?'Enfoca: '+x.focus.map(dimLabel).join(' · '):'El diagnóstico te ayudará a descubrir prioridades.',b);
  });
}
function syncContextForm(){
  for(const id of ['businessName','businessSize','digitalState','businessChallenge'])$('#'+id).value=state?.context[id]||'';
}
function updateContext(){
  ensureEditable();contextBaseline??={intent:state.intent,context:clone(state.context)};
  state.context=Object.fromEntries(['businessName','businessSize','digitalState','businessChallenge'].map(id=>[id,$('#'+id).value]));
  scheduleSave();
}
function setupRail(){
  const rail=$('#dimensionRail');rail.replaceChildren();
  dims.forEach(d=>{
    const qs=questions.filter(q=>q.dimension===d),done=qs.filter(q=>registered(state.answers[q.id])).length;
    const b=button(dimLabel(d)+' · '+done+'/5',rail,()=>{flush();state.index=questions.findIndex(q=>q.dimension===d);showStage('intro');},'rail-item'+(done===5?' done':''));
    b.dataset.dim=d;b.classList.toggle('active',questions[state.index]?.dimension===d);if(questions[state.index]?.dimension===d)b.setAttribute('aria-current','step');
  });
}
function showQuestion(focus=true){
  state.stage='question';state.index=Math.max(0,Math.min(state.index,39));
  $('#assessmentStage').hidden=true;$('#questionFlow').hidden=false;setupRail();
  renderQuestion({questions,state,focus,onSelect:(q,status,value)=>{
    commitNote();updateAnswer(state,q.id,status,value,state.answers[q.id]?.note||'');persist();showQuestion(false);
  },onNote:(q,note)=>{
    noteBaseline??={id:q.id,before:clone(state.answers[q.id]||null)};
    const a=state.answers[q.id];state.answers[q.id]={status:a?.status||'pending',value:a?.value??null,note,answeredAt:a?.answeredAt||null};
    state.updatedAt=now();scheduleSave();
  }});
  $('#answerNote').onblur=()=>{commitNote();persist();};
}
function renderProgress(){
  const p=progress(questions,state.answers),q=questions[state.index];
  $('#progressLabel').textContent=p.responded+'/40 respondidas · Cobertura '+p.scored+'/40 puntuables';
  $('#progress').style.width=p.percent+'%';$('#progressTrack').setAttribute('aria-valuenow',String(p.responded));
  $('#dimensionLabel').textContent=q.dimensionLabel+' · '+questions.filter(x=>x.dimension===q.dimension&&registered(state.answers[x.id])).length+'/5 respondidas';
  $('#counter').textContent='Pregunta '+(state.index+1)+' de 40';
}
function focusStage(){const h=$('#assessmentStage h2');if(h){h.tabIndex=-1;h.focus();}}
function showStage(stage){
  flush();state.stage=stage;$('#resultNav').disabled=true;persist();showView('assessment',{scroll:false});setupRail();renderProgress();
  if(stage==='question'){showQuestion();return;}
  const box=$('#assessmentStage');box.replaceChildren();box.hidden=false;$('#questionFlow').hidden=true;
  const q=questions[state.index],qs=questions.filter(x=>x.dimension===q.dimension);
  if(stage==='intro'){
    text('h2',q.dimensionLabel+' · Introducción',box);text('p',q.introduction,box);
    text('p','Cinco preguntas. Responde según conductas actuales; selecciona el nivel que puedas sostener. Rango 25–100. “No lo sé” registra incertidumbre y no puntúa. Las notas son opcionales y no se verifican.',box);
    if(state.needsReview.some(id=>qs.some(x=>x.id===id)))text('p','La escala anterior cambió: revisa estas respuestas; no se reutilizaron puntuaciones antiguas.',box);
    button('Responder el bloque →',box,()=>{state.index=questions.indexOf(qs[0]);showStage('question');},'primary');
    button('← Objetivo y contexto',box,()=>go('context'));
  }else if(stage==='summary'){
    const p=progress(qs,state.answers);
    text('h2',q.dimensionLabel+' · Resumen del bloque',box);
    text('p',p.responded+'/5 respondidas · '+p.scored+'/5 puntuables · '+p.unknown.length+' desconocidas · '+p.notes+' notas aportadas (no verificadas).',box);
    text('p','Este resumen registra lo declarado, sin concluir una fortaleza ni una debilidad.',box);
    qs.forEach(x=>reviewAnswer(x,box));
    button(state.index<39?'Introducción del siguiente bloque →':'Revisión general →',box,()=>{if(state.index<39){state.index=questions.indexOf(qs[4])+1;showStage('intro');}else showStage('review');},'primary');
  }else if(stage==='review'){
    text('h2','Revisión de las 40 respuestas',box);
    const p=progress(questions,state.answers);text('p',p.responded+'/40 respondidas · '+p.scored+'/40 puntuables · '+p.unknown.length+' desconocidas · '+p.pending.length+' pendientes.',box);
    text('p','Confirma que lo declarado refleja la situación actual. Si falta cobertura se cerrará un resultado parcial. Necesitas registrar las 40 respuestas; puedes usar “No lo sé” cuando tengas incertidumbre.',box);
    dims.forEach(d=>{const block=document.createElement('div');block.className='review-block';box.appendChild(block);text('h3',dimLabel(d),block);questions.filter(x=>x.dimension===d).forEach(q=>reviewAnswer(q,block));});
    const confirm=button('Confirmar y finalizar diagnóstico',box,complete,'primary');confirm.disabled=p.responded!==40;
    if(p.pending.length)button('Ir a la primera pendiente',box,()=>{state.index=questions.findIndex(q=>q.id===p.pending[0]);showStage('question');});
    button('← Volver al último bloque',box,()=>{state.index=39;showStage('summary');});
  }
  focusStage();
}
function reviewAnswer(q,parent){
  const a=state.answers[q.id],label=a?.status==='unknown'?'No lo sé':a?.status==='scored'?q.levels.find(l=>l.score===a.value)?.description:'Pendiente';
  const b=button(q.id+' · '+q.text,parent,()=>{flush();state.index=questions.indexOf(q);showStage('question');},'review-answer');
  text('small',(a?.status==='scored'?a.value+' · ':'')+label,b);if(a?.note)text('small','Nota (no verificada): '+a.note,b);
}
function resultFor(s){
  const r=calculate(questions,s.answers,maturity);
  r.recommendations=recommendations(questions,s.answers,r,deps,knowledge,resources.intentions.find(x=>x.id===s.intent));
  return r;
}
function complete(){
  flush();if(!questions.every(q=>registered(state.answers[q.id])))return;
  state.result=resultFor(state);state.coverage=clone(state.result.coverage);state.status='finalized';state.closedAt=now();state.updatedAt=state.closedAt;state.stage='results';
  state.revisions.push({type:'close',at:state.closedAt});persist();renderResults();showView('results');$('#resultNav').disabled=false;
}
function list(id,arr,r,labels=false){
  const box=$(id);box.replaceChildren();arr.forEach(([d,s])=>{
    const row=document.createElement('div');row.className='result-item';box.appendChild(row);
    text('span',dimLabel(d)+(labels&&r.strengths.some(x=>x[0]===d)?' · Fortaleza declarada':''),row);
    text('b',scoreText(s)+' · '+r.coverage[d].scored+'/5',row);
  });
  if(!arr.length)text('p','Sin dimensiones puntuables en esta lista.',box);
}
function renderResults(){
  if(!state||state.questionnaireVersion!==QUESTIONNAIRE_VERSION)return;
  const r=resultFor(state); // Shared engine; closed answers cannot mutate without copy.
  $('#score').textContent=r.overall===null?'—':Number(r.overall.toFixed(2));
  $('#maturity').textContent=r.level.label;$('#maturityDesc').textContent=r.level.description;
  $('#trafficStatus').dataset.signal=signal(r.overall);$('#trafficStatus').textContent=signalLabel(r.overall);
  $('#resultCoverage').textContent=(state.status==='draft'?'Copia editable: revisa y confirma para cerrar. ':'')+
    'Cobertura '+r.progress.scored+'/40 puntuables · '+r.progress.responded+'/40 respondidas · '+r.progress.unknown.length+' desconocidas · '+r.progress.notes+' notas no verificadas.';
  const bars=$('#bars');bars.replaceChildren();Object.entries(r.dimensions).forEach(([d,s])=>{
    const row=document.createElement('div');row.className='bar-row';bars.appendChild(row);text('span',dimLabel(d),row);
    const track=document.createElement('div');track.className='bar-track';row.appendChild(track);
    const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=(s??0)+'%';track.appendChild(fill);
    text('b',scoreText(s)+' · '+r.coverage[d].scored+'/5 · '+signalLabel(s),row);
  });
  $('#tieNote').textContent='Rango 25–100. Los empates conservan el orden metodológico. Fortaleza declarada requiere verde y 5/5 puntuables. La cobertura mínima 3/5 y dependencias débiles <65 son reglas provisionales del producto.';
  list('#strengths',r.relativeBest,r,true);list('#gaps',r.gaps,r);list('#priorities',r.recommendations.slice(0,4).map(rec=>[rec.id,rec.score]),r);
  const route=r.recommendations.map(x=>x.id);$('#dependencyIntro').textContent='Dependencias transitivas antes de cada capacidad: aclarar las desconocidas y fortalecer las puntuadas por debajo de 65. '+(r.recommendations.some(x=>x.cycles.length)?'Se detectó un ciclo: revisar el mapa de dependencias.':'');
  $('#dependencyPath').replaceChildren();route.forEach(d=>text('span',dimLabel(d)+' · '+scoreText(r.dimensions[d])+' · '+r.coverage[d].scored+'/5',$('#dependencyPath'),'dep-node'));
  const cards=$('#knowledgeCards');cards.replaceChildren();
  r.recommendations.forEach(rec=>{
    const card=document.createElement('article');card.className='knowledge-card recommendation';cards.appendChild(card);
    text('h3',dimLabel(rec.id)+' · '+scoreText(rec.score)+' · '+rec.coverage.scored+'/5',card);
    text('p',rec.capacity,card);text('p','Origen: '+rec.source.map(x=>x.id+' ('+(x.value??x.status)+') '+x.text).join('; '),card);
    text('p','Regla: '+rec.rule,card);text('p',rec.goal,card);
    text('p','Primero: '+(rec.dependencies.length?rec.dependencies.map(dimLabel).join(' → '):'sin dependencia débil identificada'),card);
    button(state.actions.some(a=>a.id===rec.id)?'Acción seleccionada':'Seleccionar acción: '+rec.action,card,()=>{
      ensureEditable();state.stage='results';if(!state.actions.some(a=>a.id===rec.id)){
        const a={id:rec.id,description:rec.action,owner:'',targetDate:'',status:'pending'};state.actions.push(a);
        state.revisions.push({type:'action',at:now(),actionId:a.id,before:null,after:clone(a)});
      }persist();renderResults();
    });
    const k=knowledge[rec.id];if(k)k.resources.forEach(x=>{const a=text('a',x.title+' ↗',card,'resource-link');a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';});
  });
  if(!r.recommendations.length)text('p','Todas las dimensiones disponibles están en verde. Mantén seguimiento; verifica las declaraciones y la evidencia.',cards);
  $('#roadmap').replaceChildren();r.recommendations.forEach((rec,i)=>{
    const step=document.createElement('article');step.className='road-step';$('#roadmap').appendChild(step);
    text('small','Paso '+(i+1),step);text('h3',dimLabel(rec.id),step);text('p',rec.action,step);
  });
  renderActions();updateReport({state,questions,knowledge,result:r,intention:resources.intentions.find(x=>x.id===state.intent)});
  // External contact remains available but contains no diagnostic, context or answer data.
  $('#whatsapp').href='https://wa.me/?text='+encodeURIComponent('Hola YEHIIBHII Estudio. Me gustaría conversar sobre los siguientes pasos para mi negocio.');
  $('#resultNav').disabled=false;
}
function renderActions(){
  const box=$('#selectedActions');box.replaceChildren();
  if(!state.actions.length)text('p','Selecciona acciones en las recomendaciones.',box);
  state.actions.forEach(a=>{
    const editor=document.createElement('div');editor.className='action-editor';box.appendChild(editor);
    for(const [key,label,type] of [['description','Descripción','textarea'],['owner','Responsable (opcional)','text'],['targetDate','Fecha objetivo (opcional)','date'],['status','Estado','select']]){
      const field=text('label',label,editor),input=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
      if(type==='select')for(const [value,name] of [['pending','Pendiente'],['in_progress','En curso'],['completed','Completada']]){const o=text('option',name,input);o.value=value;}
      else if(type!=='textarea')input.type=type;
      input.value=a[key];if(key==='description')input.maxLength=5000;if(key==='owner')input.maxLength=500;
      input.disabled=state.status==='finalized';field.appendChild(input);
      input.oninput=()=>{
        actionBaseline??={id:a.id,before:clone(a)};a[key]=input.value;state.updatedAt=now();scheduleSave();
      };
      input.onchange=input.onblur=()=>{commitAction();persist();updateReport({state,questions,knowledge,result:resultFor(state),intention:resources.intentions.find(x=>x.id===state.intent)});};
    }
    button(state.status==='finalized'?'Crear copia para editar acciones':'Quitar acción',editor,()=>{
      if(state.status==='finalized'){ensureEditable();state.stage='results';persist();renderResults();return;}
      commitAction();state.revisions.push({type:'action',at:now(),actionId:a.id,before:clone(a),after:null});state.actions=state.actions.filter(x=>x.id!==a.id);persist();renderResults();
    });
  });
}
function renderHistory(){
  const box=$('#assessmentHistory');box.replaceChildren();
  if(!library.assessments.length)text('p','Aún no hay diagnósticos guardados.',box);
  [...library.assessments].reverse().forEach(s=>{
    const card=document.createElement('article');card.className='history-card';box.appendChild(card);
    text('h3',s.assessmentId,card);text('p',(s.status==='draft'?'Borrador':'Finalizado')+' · '+s.questionnaireVersion+' · '+s.methodologyVersion,card);
    text('p','Creación: '+(s.createdAt||'desconocida')+' · Actualización: '+(s.updatedAt||'desconocida')+' · Cierre: '+(s.closedAt||'no registrado'),card);
    if(s.legacy&&s.questionnaireVersion!==QUESTIONNAIRE_VERSION){
      text('p','Migrado el '+s.legacy.migratedAt+'. Se conserva la metodología anterior, sin recalcular. Las 40 escalas requieren revisión.',card);
      const detail=document.createElement('details');card.appendChild(detail);text('summary','Consultar datos y resultado originales',detail);text('pre',JSON.stringify(s.legacy.original,null,2),detail);
      button('Crear diagnóstico con revisión de las 40 preguntas',card,()=>{flush();state=copyForEditing(s);persist();setupNeeds();syncContextForm();go('needs');});
    }else button(s.status==='draft'?'Reanudar borrador':'Consultar resultado',card,()=>{
      flush();state=clone(s);library.activeId=s.assessmentId;
      if(s.status==='finalized'){renderResults();showView('results');}else{syncContextForm();setupNeeds();if(s.stage==='context')go('needs');else if(s.stage==='results'){renderResults();showView('results');}else showStage(s.stage);}persist();
    });
    button('Exportar JSON',card,()=>downloadJSON(exportDiagnostic(s),s.assessmentId+'.json'));
    button('Eliminar diagnóstico',card,()=>{
      if(!confirm('¿Eliminar únicamente el diagnóstico '+s.assessmentId+'? Esta eliminación es permanente en este navegador.'))return;
      const candidate=clone(library);removeAssessment(candidate,s.assessmentId);
      try{if(storageBlocked)throw new Error();save(candidate);library=candidate;if(state?.assessmentId===s.assessmentId){state=null;$('#resultNav').disabled=true;updateReport(null);}updateHome();renderHistory();announce('Diagnóstico eliminado.');}
      catch{announce('No se pudo eliminar del almacenamiento. Se conserva el diagnóstico.',true);}
    },'ghost');
  });
}
function showFatal(error){
  console.error(error);const box=document.createElement('div');box.className='fatal';text('b','Experience Engine no pudo iniciar.',box);
  text('span',error.message+'. Abre el proyecto mediante un servidor HTTP local.',box);document.body.prepend(box);
}
function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',e=>{
    e.preventDefault();const id=b.dataset.nav;
    if(id==='results'){if(!state||state.questionnaireVersion!==QUESTIONNAIRE_VERSION||state.status!=='finalized'&&state.stage!=='results')return;flush();renderResults();showView('results');return;}
    if(id==='context'){ensureEditable();go('needs');return;}go(id);
  }));
  $('#startAssessment').onclick=startNew;$('#newAssessment').onclick=startNew;$('#resetAssessment').onclick=startNew;
  $('#resumeAssessment').onclick=()=>{const s=library.assessments.find(x=>x.assessmentId===library.activeId&&x.status==='draft')||library.assessments.find(x=>x.status==='draft');if(!s)return;flush();state=clone(s);if(s.questionnaireVersion!==QUESTIONNAIRE_VERSION){go('history');return;}if(s.stage==='context'){setupNeeds();go('needs');}else if(s.stage==='results'){renderResults();showView('results');}else showStage(s.stage);};
  $('#needsContinue').onclick=()=>{ensureEditable();go('context');};
  $('#contextContinue').onclick=()=>{updateContext();flush();showStage('intro');};
  for(const id of ['businessName','businessSize','digitalState','businessChallenge']){$('#'+id).oninput=updateContext;$('#'+id).onchange=()=>{updateContext();commitContext();persist();};}
  $('#back').onclick=()=>{flush();if(state.index%5===0)showStage('intro');else{state.index--;showStage('question');}};
  $('#next').onclick=()=>{flush();if(!registered(state.answers[questions[state.index].id]))return;if((state.index+1)%5===0)showStage('summary');else{state.index++;showStage('question');}};
  $('#reviewAssessment').onclick=()=>showStage('review');
  $('#editAssessment').onclick=()=>{ensureEditable();showStage('review');};
  $('#contextSaveExit').onclick=$('#saveExit').onclick=()=>{const ok=flush();if(ok){renderHistory();showView('history');}else announce('No se guardó. Usa «Exportar borrador JSON»; el trabajo permanece en esta pestaña.',true);};
  document.querySelectorAll('[data-export-draft]').forEach(b=>b.onclick=()=>{
    if(!state){announce('No hay un diagnóstico activo para exportar.');return;}flush();
    try{downloadJSON(exportDiagnostic(state),state.assessmentId+'.json');}catch{announce('No se pudo exportar: revisa los campos del diagnóstico.',true);}
  });
  $('#importDiagnostic').onchange=async()=>{
    const file=$('#importDiagnostic').files[0];if(!file)return;
    try{if(storageBlocked)throw new Error('Almacenamiento bloqueado; no se puede importar.');if(file.size>2000000)throw new Error('Archivo demasiado grande.');
      const imported=importDiagnostic(await file.text(),library),candidate=clone(library);put(candidate,imported);save(candidate);library=candidate;
      $('#importStatus').textContent='Diagnóstico importado sin sobrescribir otros.';renderHistory();updateHome();
    }catch(error){$('#importStatus').textContent='Importación rechazada: '+error.message;}
    $('#importDiagnostic').value='';
  };
  bindModal();document.querySelectorAll('.node[data-dim]').forEach(n=>{n.setAttribute('aria-haspopup','dialog');n.setAttribute('aria-controls','modal');n.onclick=()=>openModal(n.dataset.dim);});
  window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',()=>flush());
}
function setupEcosystem(){const g=$('#ecosystemGrid');g.innerHTML='';Object.entries(knowledge).forEach(([d,k],i)=>{const c=document.createElement('button');c.type='button';c.setAttribute('aria-haspopup','dialog');c.setAttribute('aria-controls','modal');c.className='eco-card';c.innerHTML=`<p class="eyebrow">${String(i+1).padStart(2,'0')}</p><h3>${dimLabel(d)}</h3><p>${k.interpretation.slice(0,125)}…</p>`;c.onclick=()=>openModal(d);g.appendChild(c)})}
function openModal(d){const k=knowledge[d];if(!k)return;showModal(`<p class="eyebrow">CAPACIDAD YEHIIBHII</p><h3 id="modalTitle">${dimLabel(d)}</h3><p>${k.interpretation}</p><h4>Acciones sugeridas</h4><ul>${k.actions.map(x=>`<li>${x}</li>`).join('')}</ul><div class="tags">${k.methods.map(x=>`<span class="tag">${x}</span>`).join('')}</div><h4>Recursos relacionados</h4>${k.resources.map(x=>`<a class="resource-link" href="${x.url}" target="_blank" rel="noopener">${x.title} ↗</a>`).join('')}`)}
function openToolModal(tool) {
  showModal(`<p class="eyebrow">HERRAMIENTA YEHIIBHII</p>
    <h3 id="modalTitle">${tool.title}</h3><p>${tool.description}</p>
    <h4>Para qué sirve</h4><p>${tool.purpose}</p>
    <h4>Cuándo usarla</h4><p>${tool.when}</p>
    <h4>Acciones sugeridas</h4><ul>${tool.actions.map(x=>`<li>${x}</li>`).join('')}</ul>
    <div class="tags">${tool.tags.map(x=>`<span class="tag">${x}</span>`).join('')}</div>
    ${tool.accessNote?`<p>${tool.accessNote}</p>`:''}
    <div class="actions"><a class="primary link-btn" href="${tool.url}" target="_blank" rel="noopener noreferrer">Abrir herramienta ↗</a></div>
    <p><small>La herramienta se abre en una nueva pestaña.</small></p>`);
}

async function init(){
  try{
    try{library=load();state=clone(library.assessments.find(s=>s.assessmentId===library.activeId)||null);announce('Biblioteca local cargada.');}
    catch{storageBlocked=true;announce('No se pudo leer o migrar el almacenamiento. Los datos existentes se conservan. Exporta el trabajo de esta pestaña antes de cerrarla.',true);}
    const [raw,k,d,m,r,tools]=await Promise.all([get('./data/questions.json'),get('./data/knowledge-map.json'),get('./data/dependencies.json'),get('./data/maturity.json'),get('./data/resources.json'),get('./data/tools.json')]);
    questions=normalizeAssessment(raw);knowledge=k;deps=d;maturity=m;resources=r;dims=[...new Set(questions.map(q=>q.dimension))];
    bind();setupReports(()=>state,()=>{flush();return state;});setupNeeds();setupEcosystem();setupTools(tools,openToolModal);syncContextForm();updateHome();
    if(state?.status==='finalized'&&state.questionnaireVersion===QUESTIONNAIRE_VERSION)renderResults();
  }catch(error){showFatal(error);}
}
init();
