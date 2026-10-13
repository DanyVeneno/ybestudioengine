// No dependencies: test ES modules through data URLs in Node.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),cache=new Map();
function moduleURL(file){
  file=path.resolve(root,'js',file);
  if(cache.has(file))return cache.get(file);
  const source=fs.readFileSync(file,'utf8').replace(/from\s*['"](.+?)['"]/g,(match,spec)=>spec.startsWith('.')?'from '+JSON.stringify(moduleURL(path.resolve(path.dirname(file),spec))):match);
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(file,url);return url;
}
class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.textContent='';this.hidden=false;this.disabled=false;this.classList={toggle(){}};}
  appendChild(el){this.children.push(el);return el;}append(...els){els.forEach(el=>this.appendChild(el));}
  replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}
  focus(){this.focused=true;}querySelectorAll(){return this.children;}
}
(async()=>{
  const data=await import(moduleURL('data.js')),engine=await import(moduleURL('engine.js')),storage=await import(moduleURL('storage.js')),report=await import(moduleURL('report.js')),assessment=await import(moduleURL('assessment.js'));
  const raw=JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'))),questions=data.normalizeAssessment(raw),
    maturity=JSON.parse(fs.readFileSync(path.join(root,'data/maturity.json'))),deps=JSON.parse(fs.readFileSync(path.join(root,'data/dependencies.json')));
  let passes=0;function test(name,fn){fn();passes++;console.log('PASS: '+name);}
  const all=value=>Object.fromEntries(questions.map(q=>[q.id,{status:'scored',value,note:'',answeredAt:'2026-10-12T12:00:00Z'}]));
  test('40 IDs estables únicos y cuatro escalas observables',()=>{
    assert.equal(questions.length,40);assert.equal(new Set(questions.map(q=>q.id)).size,40);
    questions.forEach(q=>assert.deepEqual(q.levels.map(l=>l.score),[25,50,75,100]));
    const invalid=structuredClone(raw);invalid.dimensions[0].questions[0].id='duplicate';assert.throws(()=>data.normalizeAssessment(invalid));
  });
  test('progreso inicial 0/40 y última abierta no implica 100%',()=>{
    assert.equal(engine.progress(questions,{}).responded,0);
    const answers=all(50);delete answers[questions[39].id];assert.equal(engine.progress(questions,answers).percent,97.5);
  });
  const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  global.document={querySelector:el,querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  test('render real: primera y última pregunta separan posición y avance',()=>{
    const s=storage.newAssessment();assessment.renderQuestion({questions,state:s,onSelect(){},onNote(){}});
    assert.match(el('#progressLabel').textContent,/0\/40 respondidas/);assert.equal(el('#counter').textContent,'Pregunta 1 de 40');assert.equal(el('#progress').style.width,'0%');
    s.index=39;assessment.renderQuestion({questions,state:s,onSelect(){},onNote(){}});assert.equal(el('#counter').textContent,'Pregunta 40 de 40');assert.equal(el('#progress').style.width,'0%');
  });
  test('No lo sé registra progreso sin puntuar como cero',()=>{
    const s=storage.newAssessment();storage.updateAnswer(s,questions[0].id,'unknown',null,'');
    const r=engine.calculate(questions,s.answers,maturity);assert.equal(r.progress.responded,1);assert.equal(r.progress.scored,0);assert.equal(r.dimensions.strategy,null);assert.equal(r.overall,null);
  });
  test('cobertura mínima 3/5 y global condicionado por las ocho dimensiones',()=>{
    const answers=all(100);for(let i=0;i<3;i++)answers[questions[i].id]={status:'unknown',value:null,note:'',answeredAt:'2026-10-12T12:00:00Z'};
    assert.equal(engine.calculate(questions,answers).overall,null);assert.equal(engine.calculate(questions,answers).dimensions.strategy,null);
    answers[questions[2].id]={status:'scored',value:50,note:'',answeredAt:'2026-10-12T12:00:00Z'};
    const r=engine.calculate(questions,answers);assert.equal(r.coverage.strategy.scored,3);assert.equal(r.dimensions.strategy,250/3);assert.ok(Math.abs(r.overall-(250/3+700)/8)<1e-10);
  });
  test('cuatro niveles conservan rango 25–100 y límites coherentes en reporte',()=>{
    for(const value of [25,50,75,100])assert.equal(engine.calculate(questions,all(value),maturity).overall,value);
    for(const [value,expected] of [[39.99,'Rojo'],[40,'Amarillo'],[79.99,'Amarillo'],[80,'Verde'],[null,'Sin cobertura suficiente']]){
      assert.equal(engine.signalLabel(value),expected);
      const s=storage.newAssessment({answers:all(50)}),r=engine.calculate(questions,s.answers);r.overall=value;
      assert.equal(report.buildReport({state:s,questions,result:r}).signal,expected);
    }
  });
  test('edición actualiza resultado y registra una revisión significativa',()=>{
    const s=storage.newAssessment({answers:all(50)});storage.updateAnswer(s,'ai-4','scored',100,'Una nota');
    assert.equal(engine.calculate(questions,s.answers).dimensions.ai,60);assert.equal(s.revisions.length,1);
    assert.equal(s.revisions[0].before.value,50);assert.equal(s.revisions[0].after.value,100);
    storage.updateAnswer(s,'ai-4','scored',100,'Una nota');assert.equal(s.revisions.length,1);
    storage.updateAnswer(s,'ai-4','scored',100,'Borrador',false);assert.equal(s.revisions.length,1);
  });
  test('fortalezas requieren verde y cinco puntuables; objetivo no cambia base',()=>{
    const a=all(75),r=engine.calculate(questions,a);assert.equal(r.strengths.length,0);assert.equal(r.relativeBest.length,3);
    a['strategy-1']={status:'unknown',value:null,note:'',answeredAt:'2026-10-12T12:00:00Z'};
    for(let i=2;i<=5;i++)a['strategy-'+i].value=100;
    const r2=engine.calculate(questions,a);assert.equal(r2.dimensions.strategy,100);assert.equal(r2.strengths.length,0);
    const before=JSON.stringify(r2);engine.recommendations(questions,a,r2,deps,{}, {title:'IA',focus:['ai']});assert.equal(JSON.stringify(r2),before);
  });
  test('dependencias transitivas sin duplicados detectan ciclos',()=>{
    const r=engine.calculate(questions,all(25)),route=engine.resolveDependencies(['ai','automation'],r,deps);
    assert.equal(new Set(route.route).size,route.route.length);assert.ok(route.route.indexOf('strategy')<route.route.indexOf('processes'));assert.ok(route.route.indexOf('technology')<route.route.indexOf('ai'));
    const cycle=engine.resolveDependencies(['ai'],r,{ai:['data'],data:['ai']});assert.deepEqual(cycle.cycles,['ai']);assert.deepEqual(cycle.route,['data','ai']);
    const partial=engine.calculate(questions,{});assert.ok(engine.recommendations(questions,{},partial,deps,{},null).every(x=>x.kind==='clarify'));
  });
  const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
  test('migración conserva originales y fechas desconocidas sin reinterpretar',()=>{
    const original={answers:{'automation-2':100},index:6,intent:'ai',context:{businessChallenge:'<img src=x onerror=alert(1)>'},result:{overall:100}};
    const local=memory();local.setItem(storage.LEGACY_KEY,JSON.stringify(original));
    const library=storage.load(local),s=library.assessments[0];assert.deepEqual(s.legacy.original,original);assert.equal(s.createdAt,null);assert.equal(s.updatedAt,null);assert.equal(s.closedAt,null);
    assert.deepEqual(s.answers,{});assert.equal(s.result,null);assert.equal(s.needsReview.length,40);assert.equal(s.methodologyVersion,'YBE-V5-40Q-1');
    assert.equal(local.getItem(storage.LEGACY_KEY),JSON.stringify(original));assert.equal(storage.load(local).assessments.length,1);
    const editable=storage.copyForEditing(s);assert.equal(editable.questionnaireVersion,data.QUESTIONNAIRE_VERSION);assert.deepEqual(editable.answers,{});assert.deepEqual(editable.legacy.original,original);storage.updateAnswer(editable,'strategy-1','scored',75,'');const secondCopy=storage.copyForEditing(editable);assert.equal(secondCopy.answers['strategy-1'].value,75);
  });
  test('JSON inválido e IDs duplicados no sobrescriben la biblioteca',()=>{
    const library=storage.emptyLibrary(),s=storage.newAssessment({answers:all(50)});storage.put(library,s);
    const before=JSON.stringify(library);assert.throws(()=>storage.importDiagnostic('{',library));
    assert.throws(()=>storage.importDiagnostic(storage.exportDiagnostic(s),library));
    for(const mutate of [x=>x.schemaVersion=999,x=>x.answers['strategy-1'].value=0,x=>x.questionnaireVersion='future',x=>x.actions=[{id:'x',description:'x',owner:'',targetDate:'bad',status:'bad'}]]){
      const bad=structuredClone(s);mutate(bad);assert.throws(()=>storage.importDiagnostic(JSON.stringify({schemaVersion:2,assessment:bad}),library));
    }
    assert.throws(()=>storage.importDiagnostic('{"schemaVersion":2,"assessment":{"__proto__":{}}}',library));
    assert.equal(JSON.stringify(library),before);
    const other=storage.newAssessment({answers:all(50)});const imported=storage.importDiagnostic(storage.exportDiagnostic(other),library);assert.equal(imported.assessmentId,other.assessmentId);
  });
  test('cerrado permanece al crear otro o editar copia y exportar/importar',()=>{
    const library=storage.emptyLibrary(),local=memory(),s=storage.newAssessment({answers:all(100)});
    s.result=engine.calculate(questions,s.answers);s.coverage=s.result.coverage;s.status='finalized';s.closedAt='2026-10-12T12:00:00Z';s.stage='results';
    storage.put(library,s);const snapshot=JSON.stringify(library.assessments[0]);storage.put(library,storage.newAssessment());storage.save(library,local);
    const copy=storage.copyForEditing(s);storage.updateAnswer(copy,'strategy-1','scored',25,'');storage.put(library,copy);storage.save(library,local);
    assert.equal(JSON.stringify(storage.load(local).assessments[0]),snapshot);assert.throws(()=>storage.updateAnswer(s,'strategy-1','scored',25,''));
    const imported=storage.importDiagnostic(storage.exportDiagnostic(s),storage.emptyLibrary());assert.equal(imported.result.overall,100);
    const tampered=structuredClone(s);tampered.result.overall=25;assert.throws(()=>storage.validateAssessment(tampered));
  });
  test('almacenamiento bloqueado o corrupto se informa sin borrar originales',()=>{
    const local=memory();local.setItem(storage.KEY,'broken');assert.throws(()=>storage.load(local));assert.equal(local.getItem(storage.KEY),'broken');
    assert.throws(()=>storage.save(storage.emptyLibrary(),{setItem(){throw Error('quota');}}));
  });
  test('HTML en contexto, notas y acciones se renderiza como texto',()=>{
    const attack='<img src=x onerror=alert(1)>',s=storage.newAssessment({answers:all(50)});
    s.context.businessChallenge=attack;s.answers['strategy-1'].note=attack;s.actions=[{id:'strategy',description:attack,owner:attack,targetDate:'',status:'pending'}];
    const box=new Element();report.renderReport(report.buildReport({state:s,questions}),box);
    const flatten=node=>[node,...node.children.flatMap(flatten)],nodes=flatten(box);
    assert.ok(nodes.some(n=>n.textContent.includes(attack)));assert.ok(!nodes.some(n=>n.tagName==='img'));assert.ok(nodes.every(n=>!Object.hasOwn(n,'innerHTML')));
    assessment.renderQuestion({questions,state:s,onSelect(){},onNote(){}});assert.equal(el('#answerNote').value,attack);
  });

  // Full real application handlers, with a small DOM adapter rather than a browser.
  class UIElement extends Element {
    constructor(tag='div'){super(tag);this.value='';this.isConnected=true;this.listeners={};
      const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{if(on===undefined)on=!classes.has(c);on?classes.add(c):classes.delete(c);}};}
    addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);}
    remove(){this.removed=true;}click(){this.clicked=true;this.onclick?.();}
    prepend(el){this.children.unshift(el);}
    querySelectorAll(selector){const flat=this.children.flatMap(x=>[x,...x.querySelectorAll('*')]);return selector==='*'?flat:flat.filter(x=>selector==='button'?x.tagName==='button':selector==='.tool-node'?x.className==='node tool-node':false);}
  }
  const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,new UIElement());return ui.get(id);};
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const match of html.matchAll(/id="([^"]+)"/g))get('#'+match[1]);
  get('#reportPreview').hidden=true;
  const views=['home','needs','context','history','assessment','results','ecosystem'].map(id=>{const node=get('#'+id);node.id=id;return node;});
  const draftExports=[...html.matchAll(/data-export-draft/g)].map(()=>new UIElement('button'));
  const body=new UIElement('body'),navs=[...html.matchAll(/data-nav="([^"]+)"/g)].map(m=>{const b=new UIElement('button');b.dataset.nav=m[1];return b;});
  const flat=node=>[node,...node.children.flatMap(flat)];
  global.document={
    body,activeElement:null,
    createElement:tag=>new UIElement(tag),
    getElementById:id=>get('#'+id),
    querySelector:selector=>{
      if(selector.includes(' h1')||selector.includes(' h2')||selector.includes(' details')){
        const parent=get(selector.split(' ')[0]),tag=selector.includes('details')?'details':'h2';
        return flat(parent).find(x=>x.tagName===tag)||null;
      }
      return get(selector);
    },
    querySelectorAll:selector=>selector==='.view'?views:selector==='[data-nav]'?navs:selector==='[data-export-draft]'?draftExports:[],
    addEventListener(){}
  };
  let printed=0;const blobs=[],originalURL=global.URL;
  global.window={scrollTo(){},matchMedia:()=>({matches:true}),addEventListener(){},print(){printed++;}};
  global.URL={createObjectURL:blob=>{blobs.push(blob);return 'blob:test';},revokeObjectURL(){}};
  global.localStorage=memory();global.confirm=()=>false;
  global.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url)))});
  await import(moduleURL('app.js'));
  await new Promise(resolve=>setImmediate(resolve));
  const clickStage=prefix=>{const b=flat(get('#assessmentStage')).find(x=>x.tagName==='button'&&x.textContent.startsWith(prefix));assert.ok(b,'Botón del bloque: '+prefix);b.onclick();};
  test('aplicación: iniciar, contexto automático, intro y 0/40',()=>{
    get('#startAssessment').onclick();assert.equal(storage.load(localStorage).assessments.length,1);
    get('#needsContinue').onclick();get('#businessChallenge').value='<b>Reto local</b>';get('#businessChallenge').oninput();
    get('#contextContinue').onclick();assert.ok(flat(get('#assessmentStage')).some(x=>x.textContent.includes('Introducción')));
    clickStage('Responder el bloque');assert.match(get('#progressLabel').textContent,/0\/40/);
    assert.equal(storage.load(localStorage).assessments[0].context.businessChallenge,'<b>Reto local</b>');
  });
  test('aplicación: selección sin avance, nota con una revisión y salir/reanudar',()=>{
    get('#answers').children[4].onclick();assert.equal(get('#counter').textContent,'Pregunta 1 de 40');
    assert.match(get('#progressLabel').textContent,/1\/40/);const note=get('#answerNote');
    for(const value of ['a','ab','abc']){note.value=value;note.oninput();}
    get('#saveExit').onclick();const saved=storage.load(localStorage).assessments[0];
    assert.equal(saved.answers['strategy-1'].note,'abc');assert.equal(saved.revisions.filter(r=>r.type==='answer').length,2);
    get('#resumeAssessment').onclick();assert.equal(get('#counter').textContent,'Pregunta 1 de 40');assert.equal(get('#answerNote').value,'abc');
  });
  await import(moduleURL('app.js')+'#reload');
  await new Promise(resolve=>setImmediate(resolve));
  get('#resumeAssessment').onclick();
  test('aplicación: recarga recupera progreso, contexto y nota',()=>{assert.match(get('#progressLabel').textContent,/1\/40/);assert.equal(get('#answerNote').value,'abc');});
  test('aplicación: ocho bloques, 40 respuestas, revisión antes del cierre y resultado parcial',()=>{
    for(let i=0;i<40;i++){
      if(i>0)get('#answers').children[i<3?4:2].onclick();
      get('#next').onclick();
      if((i+1)%5===0){
        assert.ok(flat(get('#assessmentStage')).some(x=>x.textContent.includes('Resumen del bloque')));
        clickStage(i<39?'Introducción del siguiente':'Revisión general');
        if(i<39)clickStage('Responder el bloque');
      }
    }
    assert.equal(storage.load(localStorage).assessments[0].status,'draft');
    assert.equal(flat(get('#assessmentStage')).filter(x=>x.className==='review-answer').length,40);
    clickStage('Confirmar y finalizar');
    const saved=storage.load(localStorage).assessments[0];
    assert.equal(saved.status,'finalized');assert.equal(saved.result.overall,null);assert.equal(saved.result.coverage.strategy.scored,2);
    assert.equal(get('#score').textContent,'—');assert.equal(get('#trafficStatus').textContent,'Sin cobertura suficiente');
  });
  test('aplicación: acciones generan copia y cerrado original permanece',()=>{
    const original=storage.load(localStorage).assessments[0];const closed=JSON.stringify(original);
    const select=flat(get('#knowledgeCards')).find(x=>x.tagName==='button'&&x.textContent.startsWith('Seleccionar acción'));
    select.onclick();const library=storage.load(localStorage);
    assert.equal(library.assessments.length,2);assert.equal(JSON.stringify(library.assessments[0]),closed);
    const editable=library.assessments[1];assert.equal(editable.status,'draft');assert.equal(editable.actions.length,1);
    const input=flat(get('#selectedActions')).find(x=>x.tagName==='input'&&x.type==='text');input.value='<script>responsable</script>';input.oninput();input.onchange();
    assert.equal(storage.load(localStorage).assessments[1].actions[0].owner,'<script>responsable</script>');
    assert.equal(original.status,'finalized');
  });
  get('#previewReport').onclick();assert.equal(get('#reportPreview').hidden,false);
  get('#exportReport').onclick();assert.equal(blobs.length,1);
  const exported=JSON.parse(await blobs[0].text());assert.equal(exported.schemaVersion,2);assert.equal(exported.assessment.actions.length,1);
  assert.equal(storage.importDiagnostic(JSON.stringify(exported),storage.emptyLibrary()).assessmentId,exported.assessment.assessmentId);
  get('#printReport').onclick();assert.equal(printed,1);assert.equal(get('#reportPreview').hidden,false);
  test('aplicación: reporte, exportación importable e invocación de impresión',()=>{
    assert.equal(exported.report.assessmentId,exported.assessment.assessmentId);
    assert.equal(exported.report.progress.unknown.length,3);assert.equal(exported.report.actions[0].owner,'<script>responsable</script>');
    assert.ok(flat(get('#reportPreview')).some(x=>x.textContent.includes('<b>Reto local</b>')));
    assert.ok(!flat(get('#reportPreview')).some(x=>x.tagName==='script'));assert.equal(printed,1);
  });

  const libraryBefore=localStorage.getItem(storage.KEY);
  get('#importDiagnostic').files=[{size:10,text:async()=>'{invalid'}];await get('#importDiagnostic').onchange();
  test('aplicación: importación inválida rechazada sin sobrescribir',()=>{
    assert.match(get('#importStatus').textContent,/Importación rechazada/);assert.equal(localStorage.getItem(storage.KEY),libraryBefore);
  });
  localStorage.setItem(storage.KEY,'corrupto');
  await import(moduleURL('app.js')+'#blocked');await new Promise(resolve=>setImmediate(resolve));
  get('#startAssessment').onclick();get('#needsContinue').onclick();
  get('#businessChallenge').value='Trabajo en memoria';get('#businessChallenge').oninput();
  draftExports[0].onclick();
  const backup=JSON.parse(await blobs.at(-1).text());
  test('aplicación: guardado bloqueado no borra y permite exportar borrador',()=>{
    assert.equal(localStorage.getItem(storage.KEY),'corrupto');assert.equal(get('#storageStatus').dataset.error,'true');
    assert.equal(backup.assessment.context.businessChallenge,'Trabajo en memoria');assert.equal(backup.assessment.status,'draft');
    assert.equal(storage.importDiagnostic(JSON.stringify(backup),storage.emptyLibrary()).context.businessChallenge,'Trabajo en memoria');
  });
  global.URL=originalURL;

  console.log('RESULTADO: '+passes+' grupos de pruebas aprobados.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
