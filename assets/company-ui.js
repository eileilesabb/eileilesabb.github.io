import { rankVacancy } from './vacancy-search.js';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const jumpTo=(top)=>{
  const root=document.documentElement;
  const previous=root.style.scrollBehavior;
  root.style.scrollBehavior='auto';
  window.scrollTo({top,behavior:'auto'});
  root.style.scrollBehavior=previous;
};

const vacancyItems = [...document.querySelectorAll('[data-vacancy]')];
const closeVacancy = (article, returnFocus = false) => {
  const button = article.querySelector('.vacancy__trigger');
  const panel = article.querySelector('.vacancy__panel');
  article.classList.remove('is-open');
  button?.setAttribute('aria-expanded', 'false');
  panel?.setAttribute('aria-hidden', 'true');
  if (panel) panel.inert = true;
  if (returnFocus) button?.focus();
};
const closeOtherVacancies = (current) => vacancyItems.forEach((article) => {
  if (article !== current) closeVacancy(article);
});
const openVacancy = (article) => {
  closeOtherVacancies(article);
  const button = article.querySelector('.vacancy__trigger');
  const panel = article.querySelector('.vacancy__panel');
  article.classList.add('is-open');
  button?.setAttribute('aria-expanded', 'true');
  panel?.setAttribute('aria-hidden', 'false');
  if (panel) panel.inert = false;
};

vacancyItems.forEach((article) => {
  const button = article.querySelector('.vacancy__trigger');
  const panel = article.querySelector('.vacancy__panel');
  let pointerType = 'mouse';
  panel?.setAttribute('aria-hidden', 'true');

  article.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') openVacancy(article);
  });
  article.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !article.contains(document.activeElement)) closeVacancy(article);
  });
  button?.addEventListener('pointerdown', (event) => { pointerType = event.pointerType || 'mouse'; });
  button?.addEventListener('click', (event) => {
    const open = article.classList.contains('is-open');
    if (pointerType === 'mouse' && event.detail > 0) {
      if (!open) openVacancy(article);
      return;
    }
    open ? closeVacancy(article) : openVacancy(article);
  });
  article.addEventListener('focusin', () => {
    if (button?.matches(':focus-visible') || panel?.contains(document.activeElement)) openVacancy(article);
  });
  article.addEventListener('focusout', () => requestAnimationFrame(() => {
    if (!article.contains(document.activeElement) && !article.matches(':hover')) closeVacancy(article);
  }));
  article.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeVacancy(article, true);
  });
});

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('[data-vacancy]')) vacancyItems.forEach((article) => closeVacancy(article));
});

const search = document.querySelector('[data-vacancy-search]');
if (search) {
  const results = document.querySelector('#vacancy-results');
  const count = document.querySelector('[data-vacancy-count]');
  const empty = document.querySelector('[data-vacancy-empty]');
  const clear = document.querySelector('[data-vacancy-clear]');
  const updateEdges = () => {
    const columns = getComputedStyle(results).gridTemplateColumns.split(' ').length;
    [...results.children].filter(item=>!item.hidden).forEach((item,index,list)=>item.toggleAttribute('data-row-end',(index+1)%columns===0||index===list.length-1));
  };
  const filter = () => {
    const ranked = vacancyItems.map(article=>({article,score:rankVacancy(search.value,article.dataset.vacancyName,article.dataset.vacancyTask,Number(article.dataset.vacancyIndex))}));
    ranked.sort((a,b)=>b.score-a.score||Number(a.article.dataset.vacancyIndex)-Number(b.article.dataset.vacancyIndex));
    ranked.forEach(({article,score})=>{closeVacancy(article);article.hidden=score===0;article.removeAttribute('data-row-end');results.append(article);});
    const total=ranked.filter(item=>item.score>0).length;
    count.textContent=search.value.trim()?`Найдено специализаций: ${total}`:`Все специализации: ${total}`;
    empty.hidden=total>0;
    clear.disabled=!search.value;
    const url=new URL(location.href);
    search.value.trim()?url.searchParams.set('q',search.value.trim()):url.searchParams.delete('q');
    history.replaceState(null,'',url);
    updateEdges();
  };
  search.value=new URLSearchParams(location.search).get('q')||'';
  search.addEventListener('input',filter);
  clear?.addEventListener('click',()=>{search.value='';filter();search.focus();});
  window.addEventListener('resize',updateEdges);
  filter();
}

const specialization = document.querySelector('[data-form-type="contractor"] select[name="specialization"]');
if (specialization) {
  const requested = new URLSearchParams(location.search).get('specialization');
  const option = [...specialization.options].find((item) => item.textContent.trim() === requested);
  if (option) specialization.value = option.value;
}

document.querySelectorAll('[data-commercial-objects]').forEach((widget) => {
  const slides = [...widget.querySelectorAll('[data-object-slide]')];
  const selectors = [...widget.querySelectorAll('[data-object-select]')];
  const previous = widget.querySelector('[data-object-prev]');
  const next = widget.querySelector('[data-object-next]');
  const status = widget.querySelector('[data-object-status]');
  let current = 0;

  const show = (index, moveFocus = false) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.hidden = !active;
      slide.setAttribute('aria-hidden', String(!active));
      if (active) slide.querySelector('img')?.setAttribute('loading', 'eager');
    });
    selectors.forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === current)));
    if (status) status.textContent = `${current + 1} из ${slides.length}: ${selectors[current]?.textContent.trim()}`;
    if (moveFocus) selectors[current]?.focus({ preventScroll: true });
  };

  previous?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () => show(current + 1));
  selectors.forEach((button, index) => button.addEventListener('click', () => show(index)));
  widget.addEventListener('keydown', (event) => {
    if (!event.target.matches('[data-object-select]')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowLeft' ? -1 : 1);
    show(index, true);
  });
  show(0);
});

document.querySelectorAll('[data-growth-chart]').forEach(chart=>{
  const points=[...chart.querySelectorAll('[data-chart-point]')];
  const select=index=>{
    const point=points[index];
    points.forEach(button=>button.setAttribute('aria-pressed',String(button===point)));
    chart.querySelector('[data-chart-value]').textContent=point.dataset.value;
    chart.querySelector('[data-chart-description]').textContent=point.dataset.description;
  };
  points.forEach((point,index)=>{
    point.addEventListener('pointerenter',()=>select(index));
    point.addEventListener('focus',()=>select(index));
    point.addEventListener('click',()=>select(index));
    point.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,index+(event.key==='ArrowLeft'?-1:1)));
      points[next].focus();
    });
  });
});

const journey=document.querySelector('[data-company-journey]');
let journeyTrigger;
let currentStage=-1;
const frames=journey?[...journey.querySelectorAll('[data-journey-frame]')]:[];
const yearButtons=journey?[...journey.querySelectorAll('[data-journey-select]')]:[];
const showStage=(index,animate=false)=>{
  if(index===currentStage||!frames[index])return;
  currentStage=index;
  frames.forEach((frame,i)=>{frame.hidden=i!==index;frame.inert=i!==index;});
  yearButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  journey.querySelector('[data-journey-status]').textContent=yearButtons[index].textContent;
  frames[index].querySelector('img').loading='eager';
  if(animate&&!reducedMotion.matches&&window.gsap){
    window.gsap.fromTo(frames[index].querySelector('img'),{opacity:.45,scale:.96},{opacity:1,scale:1,duration:.45,overwrite:true,ease:'power2.out'});
    window.gsap.fromTo(frames[index].querySelector('.company-journey__copy'),{opacity:.5,y:10},{opacity:1,y:0,duration:.4,overwrite:true});
  }
};
yearButtons.forEach((button,index)=>{
  button.addEventListener('click',()=>{
    showStage(index,true);
    const url=new URL(location.href);url.searchParams.set('year',button.textContent.trim());history.replaceState(null,'',url);
    if(journeyTrigger){
      jumpTo(journeyTrigger.start+(journeyTrigger.end-journeyTrigger.start)*(index+.5)/frames.length);
      window.ScrollTrigger.update();
      button.focus({preventScroll:true});
    }
  });
  button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?frames.length-1:Math.max(0,Math.min(frames.length-1,index+(event.key==='ArrowLeft'?-1:1)));
    yearButtons[next].focus();yearButtons[next].click();
  });
});
if(journey){
  const requested=new URLSearchParams(location.search).get('year');
  const stage=yearButtons.findIndex(button=>button.textContent.trim()===requested);
  showStage(stage>=0?stage:0);
}
window.addEventListener('load',()=>{
  if(!journey||!window.gsap||!window.ScrollTrigger)return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.gsap.matchMedia().add('(min-width: 1200px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)',()=>{
    journey.classList.add('is-pinned');
    journeyTrigger=window.ScrollTrigger.create({
      trigger:journey,
      start:'top 100px',
      end:()=>`+=${window.innerHeight*3.2}`,
      pin:journey.querySelector('.company-journey__scene'),
      pinSpacing:true,
      anticipatePin:1,
      invalidateOnRefresh:true,
      onUpdate:self=>showStage(Math.min(frames.length-1,Math.floor(self.progress*frames.length)),true)
    });
    return()=>{journeyTrigger=null;journey.classList.remove('is-pinned');};
  });
});
