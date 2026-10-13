import {progress,registered} from './engine.js';
export function renderQuestion({questions,state,onSelect,onNote,focus=false}) {
  const q=questions[state.index],answer=state.answers[q.id],p=progress(questions,state.answers);
  document.querySelector('#dimensionLabel').textContent=q.dimensionLabel+' · '+questions.filter(x=>x.dimension===q.dimension&&registered(state.answers[x.id])).length+'/5 respondidas';
  document.querySelector('#questionText').textContent=q.text;
  document.querySelector('#questionExplanation').textContent=q.explanation;
  document.querySelector('#questionExample').textContent='Ejemplo: '+q.example;
  document.querySelector('#counter').textContent='Pregunta '+(state.index+1)+' de 40';
  document.querySelector('#progressLabel').textContent=p.responded+'/40 respondidas · Cobertura '+p.scored+'/40 puntuables';
  document.querySelector('#progress').style.width=p.percent+'%';
  const track=document.querySelector('#progressTrack');track.setAttribute('aria-valuenow',String(p.responded));track.setAttribute('aria-valuetext',p.responded+' de 40 respondidas');
  const box=document.querySelector('#answers');box.replaceChildren();
  const levels=[...q.levels,{label:'No lo sé',score:null,description:'Necesito aclarar o recopilar información; esta respuesta no puntúa.'}];
  levels.forEach(l=>{
    const selected=l.score===null?answer?.status==='unknown':answer?.status==='scored'&&answer.value===l.score;
    const b=document.createElement('button');b.type='button';b.className='answer'+(selected?' selected':'');
    const title=document.createElement('b');title.textContent=(selected?'✓ Seleccionada · ':'')+l.label+(l.score===null?'':' · '+l.score);
    const description=document.createElement('small');description.textContent=l.description;b.append(title,description);
    b.setAttribute('aria-pressed',String(selected));
    b.onclick=()=>{onSelect(q,l.score===null?'unknown':'scored',l.score);box.querySelectorAll('button')[levels.indexOf(l)]?.focus();};
    box.appendChild(b);
  });
  const note=document.querySelector('#answerNote');note.value=answer?.note||'';note.oninput=()=>onNote(q,note.value);
  document.querySelector('#back').disabled=false;
  document.querySelector('#next').disabled=!registered(answer);
  document.querySelector('#next').textContent=(state.index+1)%5===0?'Ver resumen del bloque →':'Siguiente →';
  document.querySelectorAll('.node').forEach(n=>n.classList.toggle('hot',n.dataset.dim===q.dimension));
  if(focus){const heading=document.querySelector('#questionText');heading.tabIndex=-1;heading.focus();}
}
