/* One official sign at a time. Training results belong to the current round. */
'use strict';
window.SignStudy=(()=>{
  let catalog,catalogs,entries,assets=new Map(),lessonId='warning-signs',batch,batchKey='',index=0,mode='learn',queue=[],answers=[],choice=null,checked=false,roundSize=0,pendingFocus=null;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const randomize=list=>{const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  const button=(action,label,primary=false,disabled=false)=>`<button type="button" class="btn ${primary?'btn-primary':''}" data-sign-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
  const sign=code=>entries.get(code);
  function picture(code,hidden=false){
    const s=sign(code),asset=assets.get(code),label=hidden?'Дорожный знак для распознавания':s.name;
    if(asset)return `<img class="sign-picture" data-sign-code="${escape(code)}" src="${escape(asset.path)}" width="156" height="156" alt="${escape(label)}" decoding="async">`;
    const [x,y,w,h]=s.crop;
    const clip=`sign-crop-${code.replaceAll('.','-')}`;
    return `<svg class="sign-picture" viewBox="${x} ${y} ${w} ${h}" width="156" height="156" role="img" aria-label="${hidden?'Дорожный знак для распознавания':escape(s.name)}" focusable="false"><defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image href="/armenia-driving-course/images/reference/pdd-02.webp" width="559" height="613" clip-path="url(#${clip})"/></svg>`;
  }
  function zoomButton(code,hidden=false){const a=assets.get(code);if(!a)return '';return `<button type="button" class="btn sign-zoom" data-action="zoom-open" data-image="${escape(a.path)}" data-title="${escape(hidden?'Дорожный знак для распознавания':sign(code).name+' · '+code)}">Увеличить знак</button>`;}
  function selectBatch(){
    const id=location.hash.split('/')[3];
    const next=catalog.batches.find(b=>b.id===id)||catalog.batches[0];
    const nextKey=lessonId+'/'+next.id;
    if(batchKey!==nextKey){batch=next;batchKey=nextKey;index=0;mode='learn';}
  }
  function selector(){
    const topic=catalog.topics?.find(t=>t.batchIds.includes(batch.id));
    const batches=topic?catalog.batches.filter(b=>topic.batchIds.includes(b.id)):catalog.batches;
    return `${catalog.topics?.length>1?`<label class="field" for="sign-topic">Раздел знаков<select id="sign-topic">${catalog.topics.map(t=>`<option value="${t.id}" ${t===topic?'selected':''}>${escape(t.title)}</option>`).join('')}</select></label>`:''}<label class="field" for="sign-batch">Небольшая группа для занятия<select id="sign-batch">${batches.map((b,i)=>`<option value="${b.id}" ${b.id===batch.id?'selected':''}>${i+1}. ${escape(b.title)} · ${b.codes.length} знаков</option>`).join('')}</select></label>`;
  }
  function learning(){
    const s=sign(batch.codes[index]),other=s.compareCode?sign(s.compareCode):null;
    return `<p class="small muted sign-position" role="status">${escape(batch.title)} · Знак ${index+1} из ${batch.codes.length}</p>
      <div class="sign-reading"><div class="sign-identity">${picture(s.code)}<span class="reference-code">${escape(s.code)}</span>${zoomButton(s.code)}</div><div class="sign-explanation"><h3 id="sign-name" tabindex="-1">${escape(s.name)}</h3><dl><dt>Что на рисунке</dt><dd>${escape(s.look)}</dd><dt>Что делать за рулём</dt><dd>${escape(s.meaning)}</dd></dl></div></div>
      ${other?`<details class="sign-compare"><summary>Как отличить от похожего знака</summary><div class="sign-pair"><figure>${picture(s.code)}<figcaption>${escape(s.name)}</figcaption></figure><figure>${picture(other.code)}<figcaption>${escape(other.name)}</figcaption></figure></div><p>${escape(s.contrast)}</p></details>`:''}
      <div class="sign-controls">${button('previous','Назад',false,index===0)}${index<batch.codes.length-1?button('next','Следующий знак',true):button('test',`Проверить эти ${batch.codes.length} знаков`,true)}</div>
      <div class="sign-shortcuts">${button('test','Узнать знаки без подписей')}<span class="small muted">Начни с рисунка и смысла. Номер оставь для справочника.</span></div>${assetCredit(s.code)}`;
  }
  function assetCredit(code){
    const a=assets.get(code);if(!a)return '';
    return `<details class="sign-credit"><summary>Источник иллюстрации</summary><p class="small muted"><a href="${escape(a.sourcePage)}" target="_blank" rel="noopener noreferrer">Векторный рисунок</a>: ${escape(a.author)}. ${a.licenseUrl?`<a href="${escape(a.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(a.license)}</a>`:escape(a.license)}. ${escape(a.changes||'Рисунок без изменений.')} Нормы и нумерация сверяются по ПДД Армении. <a href="/armenia-driving-course/sign-illustrations.html">Все иллюстрации и лицензии</a>.</p></details>`;
  }
  function optionsFor(code){
    const current=sign(code),near=current.compareCode;
    const pool=[code,...(near?[near]:[]),...randomize(batch.codes),...randomize(catalog.batches.flatMap(b=>b.codes))];
    const names=new Set(),codes=[];
    for(const candidate of pool){if(!current.testContext&&current.commonShapeWith?.includes(candidate))continue;const name=sign(candidate).name;if(names.has(name))continue;names.add(name);codes.push(candidate);if(codes.length===3)break;}
    return randomize(codes);
  }
  function testPicture(s){return s.testContext?`<div class="sign-context" aria-label="Основной знак и табличка под ним">${picture(s.testContext.signCode,true)}${picture(s.code,true)}</div>`:picture(s.code,true);}
  let options=[];
  function testing(){
    if(index>=queue.length)return results();
    const code=queue[index],s=sign(code);
    return `<p class="small muted sign-position" role="status">Без подписей · Вопрос ${index+1} из ${queue.length}</p><h3 id="sign-question" tabindex="-1">${escape(s.testContext?.prompt||'Что означает этот знак?')}</h3><div class="sign-test-image" data-test-sign-code="${code}">${testPicture(s)}</div>${zoomButton(s.code,true)}<div class="options" role="group" aria-labelledby="sign-question">${options.map((c,i)=>`<button type="button" class="option ${checked?(c===code?'correct':i===choice?'wrong':''):''}" data-sign-action="choose" data-sign-index="${i}" aria-pressed="${choice===i}" ${checked?'disabled':''}><span class="opt-num">${i+1}</span><span>${escape(sign(c).name)}</span></button>`).join('')}</div>
      ${checked?`<div class="answer-feedback ${options[choice]===code?'':'wrong'}" role="status"><strong>${options[choice]===code?'Верно.':'Пока перепутал. Разберём.'} ${escape(s.name)}</strong><p>${escape(s.look)} ${escape(s.meaning)}</p>${options[choice]!==code&&s.compareCode===options[choice]?`<p>${escape(s.contrast)}</p>`:''}</div>`:'<p class="small muted sign-test-help">Выбери ответ, затем проверь себя. Подпись появится после проверки.</p>'}
      <div class="sign-controls">${button('learn','Вернуться к разбору')}${checked?button('test-next',index===queue.length-1?'Результат тренировки':'Следующий вопрос',true):button('check','Проверить ответ',true,choice===null)}</div>`;
  }
  function results(){
    const mistakes=answers.filter(a=>!a.correct),correct=answers.length-mistakes.length;
    const next=catalog.batches[catalog.batches.indexOf(batch)+1];
    return `<div class="sign-result"><h3 id="sign-result-title" tabindex="-1">${mistakes.length?'Повторим то, что путается':'Все знаки этой группы узнал'}</h3><p><strong>${correct} из ${roundSize}</strong> верно в этой тренировке.</p>${mistakes.length?`<p>Вернись к рисункам и сравни похожие знаки. Потом проверь ошибки ещё раз.</p><ul class="sign-errors">${mistakes.map(a=>`<li>${picture(a.code)}<span>${escape(sign(a.code).name)}</span>${button('review','Разобрать').replace('data-sign-action="review"',`data-sign-action="review" data-sign-code="${a.code}"`)}</li>`).join('')}</ul>`:'<p>Вернись к ним на следующем занятии: один удачный круг ещё не означает, что всё запомнилось надолго.</p>'}<div class="buttons">${mistakes.length?button('retry','Повторить ошибки',true):next?button('batch-next','Следующая группа',true):'<a class="btn btn-primary" href="#check" data-scroll="check">К проверке урока</a>'}${button('test','Ещё один круг')}${button('learn','Снова посмотреть знаки')}</div><p class="small muted">Это учебные карточки, не официальные экзаменационные вопросы. Результат относится к этому кругу; общий прогресс урока сохраняется ниже.</p></div>`;
  }
  function content(){return selector()+(mode==='learn'?learning():testing());}
  function update(focus){
    const host=document.getElementById('sign-study');if(!host)return;
    host.innerHTML=content();
    if(focus)host.querySelector(focus)?.focus({preventScroll:true});
  }
  function begin(codes=batch.codes){mode='test';queue=randomize(codes);roundSize=queue.length;answers=[];index=0;choice=null;checked=false;options=optionsFor(queue[0]);}
  document.addEventListener('change',e=>{
    if(!['sign-batch','sign-topic'].includes(e.target.id))return;
    pendingFocus='#'+e.target.id;
    const batchId=e.target.id==='sign-topic'?catalog.topics.find(t=>t.id===e.target.value).batchIds[0]:e.target.value;
    location.hash=`#/lesson/${lessonId}/${batchId}`;
  });
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-sign-action]');if(!el||el.disabled)return;
    const action=el.dataset.signAction;
    if(action==='next'||action==='previous'){index+=action==='next'?1:-1;update('#sign-name');}
    if(action==='test'){begin();update('#sign-question');}
    if(action==='learn'){mode='learn';index=0;update('#sign-name');}
    if(action==='choose'){choice=Number(el.dataset.signIndex);update(`[data-sign-index="${choice}"]`);}
    if(action==='check'&&choice!==null&&!checked){checked=true;answers.push({code:queue[index],correct:options[choice]===queue[index]});update('[data-sign-action="test-next"]');}
    if(action==='test-next'){index++;choice=null;checked=false;if(index<queue.length)options=optionsFor(queue[index]);update(index>=queue.length?'#sign-result-title':'#sign-question');}
    if(action==='retry'){begin(answers.filter(a=>!a.correct).map(a=>a.code));update('#sign-question');}
    if(action==='review'){mode='learn';index=batch.codes.indexOf(el.dataset.signCode);update('#sign-name');}
    if(action==='batch-next'){pendingFocus='#sign-name';location.hash=`#/lesson/${lessonId}/${catalog.batches[catalog.batches.indexOf(batch)+1].id}`;}
  });
  return {
    visual:picture,
    supports:id=>catalogs.has(id),
    init(data,referenceGroups,assetData){
      const lessons=data.lessons||[{lessonId:'warning-signs',batches:data.batches,topics:[]}];
      catalogs=new Map(lessons.map(l=>[l.lessonId,l]));
      const references=referenceGroups.filter(g=>['warning-signs','priority-signs','prohibition-signs','other-signs'].includes(g.lessonId)).flatMap(g=>g.entries.flatMap(e=>e.code.split(',').map(code=>[code.trim(),e])));
      const referenceMap=new Map(references);
      entries=new Map(data.signs.map(s=>{const ref=referenceMap.get(s.code);if(!ref)throw Error(`Нет пояснения знака ${s.code}`);return [s.code,{...ref,...s}];}));
      assets=new Map((assetData?.assets||[]).map(a=>[a.code,a]));
      for(const l of lessons)l.sourceSheets=referenceGroups.filter(g=>g.lessonId===l.lessonId);
    },
    render(id='warning-signs'){
      lessonId=id;catalog=catalogs.get(id);selectBatch();
      if(pendingFocus){const selector=pendingFocus;pendingFocus=null;queueMicrotask(()=>document.querySelector(selector)?.focus({preventScroll:true}));}
      return `<section id="visual" class="sign-study-section"><h2>Разбери знаки по одному</h2><p>Смотри на рисунок, называй значение и проговаривай действие. Изучи небольшую группу, затем узнай её знаки без подписей.</p><div id="sign-study">${content()}</div><details class="sign-original"><summary>Официальные листы и нормы</summary><p class="small muted">Нормы и нумерация: <a href="https://www.arlis.am/hy/acts/212587" target="_blank" rel="noopener noreferrer">ПДД Армении</a>. Русские пояснения являются учебным пересказом. Чёткие векторные иллюстрации сверены с рисунками знаков. Примеры чисел и надписей могут отличаться от знака на конкретной дороге.</p>${catalog.sourceSheets.map(g=>`<figure><img src="${escape(g.image)}" alt="${escape(g.title)}: официальный лист" loading="lazy"><figcaption class="small muted">${escape(g.title)}</figcaption></figure>`).join('')}</details></section>`;
    }
  };
})();
