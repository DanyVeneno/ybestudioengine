import {calculate,scoreText,signalLabel,dimNames} from './engine.js';
import {exportDiagnostic} from './storage.js';
let current=null,getState=null,flushState=null;
export function buildReport({state,questions,knowledge={},result,intention},date=new Date()){
  const r=result||calculate(questions,state.answers);
  return {schemaVersion:state.schemaVersion,assessmentId:state.assessmentId,questionnaireVersion:state.questionnaireVersion,
    methodologyVersion:state.methodologyVersion,createdAt:state.createdAt,updatedAt:state.updatedAt,closedAt:state.closedAt,status:state.status,
    generatedAt:date.toISOString(),type:'Autoevaluación orientativa',context:{...state.context},intent:state.intent,intentLabel:intention?.title||'Sin definir',
    overall:r.overall,signal:signalLabel(r.overall),coverage:r.coverage,progress:r.progress,
    dimensions:Object.entries(r.dimensions).map(([id,score])=>({id,label:dimNames[id],score,signal:signalLabel(score),coverage:r.coverage[id],
      strength:r.strengths.some(x=>x[0]===id)})),recommendations:r.recommendations||[],
    answers:questions.map(q=>({id:q.id,dimension:q.dimension,question:q.text,status:state.answers[q.id]?.status||'pending',
      value:state.answers[q.id]?.value??null,note:state.answers[q.id]?.note||'',answeredAt:state.answers[q.id]?.answeredAt||null})),
    actions:state.actions.map(a=>({...a})),revisions:state.revisions,
    limitations:['Declaraciones de autoevaluación: las notas aportadas no han sido verificadas. No es una certificación ni un instrumento científicamente validado.',
      'Rango evaluado 25–100. “No lo sé” no tiene puntuación; avance y cobertura son conceptos distintos.',
      'Mínimo 3/5 puntuables por dimensión; el global solo existe si las ocho dimensiones cumplen. Regla provisional pendiente de validación metodológica.',
      'Semáforo sobre puntuación sin redondear: rojo <40, amarillo ≥40 y <80, verde ≥80. El redondeo visual a dos decimales no modifica el cálculo.',
      'Dependencias débiles <65: regla provisional. Las dimensiones sin cobertura requieren información; no se clasifican como baja madurez.',
      'Objetivo y contexto orientan acciones sin modificar la puntuación base. Fortalezas declaradas requieren verde y cobertura 5/5.']};
}
function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.appendChild(el);return el;}
export function renderReport(report,box=document.querySelector('#reportPreview')){
  box.replaceChildren();text('h2','YBESTUDIO · Reporte de madurez declarada',box);
  text('p','ID: '+report.assessmentId+' · '+(report.status==='finalized'?'Finalizado':'Borrador'),box);
  text('p','Cuestionario: '+report.questionnaireVersion+' · Metodología: '+report.methodologyVersion,box);
  text('p','Creación: '+(report.createdAt||'desconocida')+' · Actualización: '+(report.updatedAt||'desconocida')+' · Cierre: '+(report.closedAt||'no registrado')+' · Emitido: '+report.generatedAt,box);
  text('p','Objetivo: '+report.intentLabel,box);
  const contextLabels={businessName:'Negocio',businessSize:'Organización',digitalState:'Etapa digital',businessChallenge:'Reto'};
  const contextValues={emprendimiento:'Emprendimiento / profesional',pequena:'Empresa pequeña',mediana:'Empresa mediana',grande:'Empresa grande',institucion:'Institución / organización',
    inicio:'Comenzando',herramientas:'Herramientas aisladas',integracion:'Integrando procesos y tecnología',automatizacion:'Automatización parcial',inteligencia:'Aprovechando datos e IA'};
  text('p','Contexto: '+Object.entries(report.context).map(([k,v])=>(contextLabels[k]||k)+': '+(contextValues[v]||v||'sin declarar')).join(' · '),box);
  text('p','Resultado: '+scoreText(report.overall)+' · '+report.signal+' · Cobertura '+report.progress.scored+'/40 puntuables · '+report.progress.responded+'/40 respondidas',box);
  text('p','Desconocidas: '+(report.progress.unknown.join(', ')||'ninguna')+' · Pendientes: '+(report.progress.pending.join(', ')||'ninguna')+' · Notas: '+report.progress.notes+' (no verificadas)',box);
  const table=document.createElement('table');table.setAttribute('aria-label','Resultados por dimensión');box.appendChild(table);
  const head=document.createElement('thead');table.appendChild(head);const row=document.createElement('tr');head.appendChild(row);
  for(const label of ['Dimensión','Puntuación / cobertura','Semáforo'])text('th',label,row).scope='col';
  const body=document.createElement('tbody');table.appendChild(body);
  report.dimensions.forEach(d=>{const tr=document.createElement('tr');body.appendChild(tr);text('td',d.label+(d.strength?' · Fortaleza declarada':''),tr);text('td',scoreText(d.score)+' · '+d.coverage.scored+'/5',tr);text('td',d.signal,tr);});
  text('h3','Prioridades y dependencias',box);
  report.recommendations.forEach(rec=>{
    text('h4',dimNames[rec.id]+' · '+scoreText(rec.score)+' · '+rec.coverage.scored+'/5',box);
    text('p',rec.capacity,box);text('p','Origen: '+rec.source.map(a=>a.id+' ('+(a.value??a.status)+') '+a.text).join('; '),box);
    text('p','Regla: '+rec.rule,box);text('p',rec.goal,box);
    text('p','Dependencias primero: '+(rec.dependencies.map(d=>dimNames[d]).join(' → ')||'ninguna débil identificada'),box);
    text('p','Acción sugerida: '+rec.action,box);if(rec.cycles.length)text('p','Ciclos detectados: '+rec.cycles.join(', '),box);
  });
  text('h3','Acciones elegidas',box);
  if(!report.actions.length)text('p','No se seleccionaron acciones.',box);
  report.actions.forEach(a=>text('p',a.description+' · Responsable: '+(a.owner||'sin asignar')+' · Fecha objetivo: '+(a.targetDate||'sin definir')+' · Estado: '+({pending:'Pendiente',in_progress:'En curso',completed:'Completada'})[a.status],box));
  text('h3','Limitaciones',box);report.limitations.forEach(l=>text('p',l,box));
  const detail=document.createElement('details');box.appendChild(detail);text('summary','Ver las 40 respuestas y notas',detail);
  const list=document.createElement('ol');detail.appendChild(list);
  report.answers.forEach(a=>{const li=text('li',a.id+' · '+a.question+' — '+(a.status==='unknown'?'No lo sé':a.status==='pending'?'Pendiente':a.value+'/100')+' · Fecha: '+(a.answeredAt||'sin respuesta'),list);if(a.note)text('p','Nota (no verificada): '+a.note,li);});
  text('p','Revisiones confirmadas: '+report.revisions.length+'. El JSON conserva su detalle.',box);
}
export function updateReport(input){
  current=input?buildReport(input):null;
  const box=document.querySelector('#reportPreview');
  if(!current){box.hidden=true;box.replaceChildren();document.querySelector('#previewReport').textContent='Ver reporte';document.querySelector('#previewReport').setAttribute('aria-expanded','false');return;}
  renderReport(current);
}
export function downloadJSON(json,name){
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function setupReports(get,flush){
  getState=get;flushState=flush;
  document.querySelector('#previewReport').onclick=()=>{
    if(!current)return;const box=document.querySelector('#reportPreview');box.hidden=!box.hidden;
    document.querySelector('#previewReport').setAttribute('aria-expanded',String(!box.hidden));document.querySelector('#previewReport').textContent=box.hidden?'Ver reporte':'Ocultar reporte';
  };
  document.querySelector('#printReport').onclick=()=>{
    if(!current)return;flushState?.();document.querySelector('#reportPreview').hidden=false;
    document.querySelector('#reportPreview details').open=true;document.querySelector('#previewReport').setAttribute('aria-expanded','true');document.querySelector('#previewReport').textContent='Ocultar reporte';window.print();
  };
  document.querySelector('#exportReport').onclick=()=>{
    const s=flushState?.()||getState?.();if(!s)return;downloadJSON(exportDiagnostic(s,current),s.assessmentId+'.json');
  };
}
