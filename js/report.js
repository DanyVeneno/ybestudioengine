let current=null;
const names={strategy:'Estrategia',customer:'Cliente',ux:'UX/CX',processes:'Procesos',technology:'Tecnología',data:'Datos',automation:'Automatización',ai:'Inteligencia artificial'};
export function buildReport({state,questions,knowledge={}},date=new Date()){
 if(!state.result||!questions.every(q=>q.levels.some(l=>l.score===Number(state.answers[q.id]))))throw new Error('Completa las respuestas válidas antes de generar un reporte.');
 const r=state.result;
 return {schemaVersion:1,methodologyVersion:'YBE-V5-40Q-1',generatedAt:date.toISOString(),type:'Autoevaluación orientativa',context:{...state.context},intent:state.intent||null,overall:r.overall,maturity:r.level.label,signal:r.overall<40?'Rojo':r.overall<80?'Amarillo':'Verde',dimensions:Object.entries(r.dimensions).map(([id,score])=>({id,label:names[id]||id,score,signal:score<40?'Rojo':score<80?'Amarillo':'Verde'})),priorities:r.priorities.map(([id,score])=>({id,label:names[id]||id,score,actions:knowledge[id]?.actions||[]})),answers:questions.map(q=>({id:q.id,dimension:q.dimension,question:q.text,score:Number(state.answers[q.id])})),limitations:['Refleja respuestas declaradas; no verifica evidencias ni certifica madurez.','El rango posible es 25–100, con cuatro niveles de respuesta de igual peso.','Semáforo: rojo <40, amarillo 40–79, verde 80–100.','Los empates se ordenan según la secuencia de dimensiones; no implican diferencias reales.']};
}
function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.appendChild(el);return el;}
function render(report){
 const box=document.querySelector('#reportPreview');box.replaceChildren();
 text('h2','YBESTUDIO · Reporte de madurez digital',box);
 text('p',`Emitido: ${new Date(report.generatedAt).toLocaleString('es-MX')}`,box);
 text('p',`Metodología: ${report.methodologyVersion} · ${report.type}`,box);
 text('h3',report.context.businessName||'Organización sin nombre',box);
 if(report.context.businessChallenge)text('p',`Reto declarado: ${report.context.businessChallenge}`,box);
 text('p',`Resultado: ${report.overall}/100 · ${report.maturity} · ${report.signal}`,box);
 const table=document.createElement('table');table.setAttribute('aria-label','Resultados por dimensión');box.appendChild(table);
 const head=document.createElement('thead');table.appendChild(head);const row=document.createElement('tr');head.appendChild(row);
 for(const label of ['Dimensión','Puntuación','Semáforo']){const th=text('th',label,row);th.scope='col';}
 const body=document.createElement('tbody');table.appendChild(body);
 for(const d of report.dimensions){const tr=document.createElement('tr');body.appendChild(tr);text('td',d.label,tr);text('td',`${d.score}/100`,tr);text('td',d.signal,tr);}
 text('h3','Prioridades orientativas',box);const list=document.createElement('ol');box.appendChild(list);report.priorities.forEach(p=>{const item=text('li',`${p.label} · ${p.score}/100`,list);p.actions.forEach(action=>text('p',action,item));});
 text('h3','Alcance del resultado',box);report.limitations.forEach(l=>text('p',l,box));
 const detail=document.createElement('details');box.appendChild(detail);text('summary','Ver las 40 respuestas',detail);const answers=document.createElement('ol');detail.appendChild(answers);report.answers.forEach(a=>text('li',`${a.question} — ${a.score}/100`,answers));
}
export function updateReport(input){current=input?buildReport(input):null;const box=document.querySelector('#reportPreview');if(!current){box.hidden=true;box.replaceChildren();document.querySelector('#previewReport').textContent='Ver reporte';document.querySelector('#previewReport').setAttribute('aria-expanded','false');return;}render(current);}
export function setupReports(){
 document.querySelector('#previewReport').onclick=()=>{if(!current)return;const box=document.querySelector('#reportPreview');box.hidden=!box.hidden;document.querySelector('#previewReport').setAttribute('aria-expanded',String(!box.hidden));document.querySelector('#previewReport').textContent=box.hidden?'Ver reporte':'Ocultar reporte';};
 document.querySelector('#printReport').onclick=()=>{if(!current)return;document.querySelector('#reportPreview').hidden=false;document.querySelector('#reportPreview details').open=true;window.print();};
 document.querySelector('#exportReport').onclick=()=>{if(!current)return;const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='YBESTUDIO-diagnostico.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
