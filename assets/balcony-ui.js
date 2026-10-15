import { balconyShapes, windowProfiles, calculateGlazing, calculateFinishing } from './balcony-engine.js';

const rubles = new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', maximumFractionDigits:0 });
const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits:2 });
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-photo-carousel]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('[data-photo-slide]')];
  const pause = carousel.querySelector('[data-photo-pause]');
  const caption = carousel.querySelector('[data-photo-caption]');
  const status = carousel.querySelector('[data-photo-status]');
  let index=0, timer, paused=motionPreference.matches, inView=false;
  const buttonState = () => {
    pause.textContent=paused?'Продолжить':'Пауза';
    pause.setAttribute('aria-pressed',String(paused));
    pause.setAttribute('aria-label',paused?'Продолжить смену фотографий':'Приостановить смену фотографий');
  };
  const show = (next,manual=false) => {
    index=(next+slides.length)%slides.length;
    slides[index].querySelector('img').loading='eager';
    slides.forEach((slide,i)=>{
      slide.classList.toggle('is-active',i===index);
      slide.inert=i!==index;
      slide.setAttribute('aria-hidden',String(i!==index));
    });
    caption.href=slides[index].getAttribute('href');
    caption.textContent=slides[index].getAttribute('aria-label')+' ↗';
    status.setAttribute('aria-live',manual?'polite':'off');
    status.textContent=`${index+1} из ${slides.length}`;
    slides[(index+1)%slides.length].querySelector('img').loading='eager';
  };
  const restart = () => {
    clearInterval(timer);
    if(paused || !inView || document.hidden || carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
    timer=setInterval(()=>show(index+1),5000);
  };
  carousel.querySelector('[data-photo-prev]').addEventListener('click',()=>{show(index-1,true);restart();});
  carousel.querySelector('[data-photo-next]').addEventListener('click',()=>{show(index+1,true);restart();});
  pause.addEventListener('click',()=>{paused=!paused;buttonState();restart();});
  carousel.addEventListener('mouseenter',restart);
  carousel.addEventListener('mouseleave',restart);
  carousel.addEventListener('focusin',restart);
  carousel.addEventListener('focusout',()=>requestAnimationFrame(restart));
  document.addEventListener('visibilitychange',restart);
  motionPreference.addEventListener('change',event=>{paused=event.matches;buttonState();restart();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;restart();},{threshold:.15}).observe(carousel);
  buttonState();show(0);
});

document.querySelectorAll('[data-balcony-calculator]').forEach(section=>{
  const mode=section.dataset.balconyCalculator;
  const form=section.querySelector('form');
  const prefix=mode==='glazing'?'gl':'fi';
  const dimensions=section.querySelector('[data-balcony-dimensions]');
  const error=section.querySelector('[data-balcony-error]');
  const request=section.querySelector('[data-balcony-request]');
  const total=section.querySelector('[data-balcony-total]');
  const monthly=section.querySelector('[data-balcony-monthly]');
  const breakdown=section.querySelector('[data-balcony-breakdown]');
  const field=name=>form.elements.namedItem(name);
  const dimensionRow=(name,label,value,min=500,max=10000)=>{
    const row=document.createElement('div');
    row.className='balcony-dimension';row.dataset.dimension=name;
    const id=`balcony-${mode}-${name}`;
    row.innerHTML=`<label for="${id}">${label} <span>мм</span></label><div><input type="range" min="${min}" max="${max}" step="100" value="${value}" data-dimension-range="${name}" aria-label="${label}, мм"><input id="${id}" name="${name}" type="number" min="${min}" max="${max}" step="1" value="${value}" inputmode="numeric" required autocomplete="off" data-dimension-number="${name}"></div>`;
    return row;
  };
  const setShape=(preserve=false)=>{
    const shape=balconyShapes.find(shape=>shape.id===field('shape').value) || balconyShapes[0];
    const previous=Object.fromEntries(new FormData(form));
    const image=section.querySelector('[data-balcony-diagram]');
    image.src=`/assets/balcony/diagram-${shape.diagram}.png`;
    image.alt=`Схема: ${shape.title}`;
    section.querySelector('[data-shape-caption]').textContent=shape.title;
    dimensions.replaceChildren(dimensionRow('height','Высота остекления',previous.height||1500,500,5000));
    shape.sides.forEach((side,i)=>dimensions.append(dimensionRow(`side${i+1}`,`Секция ${i+1}`,preserve&&previous[`side${i+1}`]?previous[`side${i+1}`]:side)));
    if(mode==='finishing')dimensions.append(dimensionRow('depth','Глубина балкона',preserve?previous.depth||shape.depth:shape.depth,500,4000),dimensionRow('roomHeight','Высота помещения',previous.roomHeight||2700,1800,4000));
  };
  const syncProfiles=()=>{
    if(mode!=='glazing')return;
    const type=field('type').value;
    for(const option of field('profile').options){
      const available=windowProfiles.find(profile=>profile.id===option.value)?.type===type;
      option.disabled=!available;option.hidden=!available;
    }
    if(field('profile').selectedOptions[0]?.disabled)field('profile').value=windowProfiles.find(profile=>profile.type===type).id;
  };
  const data=()=>{
    const input=Object.fromEntries(new FormData(form));
    const shape=balconyShapes.find(shape=>shape.id===input.shape);
    input.sides=shape.sides.map((_,i)=>input[`side${i+1}`]);
    for(const name of ['installation','accessories','heatedFloor','wardrobe','dryer'])input[name]=Boolean(field(name)?.checked);
    return input;
  };
  const labels={window:'Конструкция',accessories:'Комплектующие',installation:'Монтаж',walls:'Стены',ceiling:'Потолок',floor:'Пол',exterior:'Внешняя отделка',insulation:'Утепление',electrical:'Электрика',heatedFloor:'Тёплый пол',wardrobe:'Шкаф',dryer:'Сушка'};
  const queryState=()=>{
    const url=new URL(location.href);
    for(const key of [...url.searchParams.keys()])if(key.startsWith(prefix+'-'))url.searchParams.delete(key);
    for(const [name,value] of new FormData(form))url.searchParams.set(`${prefix}-${name}`,String(value));
    history.replaceState(null,'',url);
  };
  const update=(save=false)=>{
    try{
      const input=data();
      const result=mode==='glazing'?calculateGlazing(input):calculateFinishing(input);
      error.textContent='';
      form.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
      total.textContent=rubles.format(result.total);monthly.textContent=rubles.format(result.monthly);
      const costs=mode==='glazing'?{window:result.window,accessories:result.accessories,installation:result.installation}:result.costs;
      breakdown.replaceChildren();
      const add=(label,value)=>{const row=document.createElement('div');const term=document.createElement('dt');const description=document.createElement('dd');term.textContent=label;description.textContent=value;row.append(term,description);breakdown.append(row);};
      for(const [name,value]of Object.entries(costs))if(value)add(labels[name],rubles.format(value));
      if(mode==='finishing'){
        add('Стены, примерно',decimal.format(result.areas.walls)+' м²');
        add('Пол и потолок, каждый',decimal.format(result.areas.floor)+' м²');
        add('Наружная облицовка',decimal.format(result.areas.exterior)+' м²');
      }else add('Площадь остекления',decimal.format(result.areas.glazing)+' м²');
      const choices=Object.keys(costs).filter(key=>costs[key]).map(key=>`${labels[key]}${field(key)?.tagName==='SELECT'?': '+field(key).selectedOptions[0].textContent:''}`);
      const summary=`${mode==='glazing'?'Остекление':'Отделка'} балкона ${balconyShapes.find(shape=>shape.id===input.shape).title}. Секции ${input.sides.join(' / ')} мм, высота остекления ${input.height} мм. ${mode==='glazing'?`Профиль ${windowProfiles.find(profile=>profile.id===input.profile).title}. `:`Глубина ${input.depth} мм, высота помещения ${input.roomHeight} мм. `}Выбрано: ${choices.join(', ')||'без работ'}. Ориентир ${rubles.format(result.total)}.`;
      request.href=`/customers/request/?comment=${encodeURIComponent(summary)}`;
      request.removeAttribute('aria-disabled');
      if(save)queryState();
    }catch(problem){
      error.textContent=problem.message;
      total.textContent='Проверьте размеры';monthly.textContent='—';breakdown.replaceChildren();
      request.removeAttribute('href');request.setAttribute('aria-disabled','true');
      form.querySelectorAll('input[type="number"]').forEach(input=>{if(!input.value||!input.validity.valid)input.setAttribute('aria-invalid','true');});
    }
  };
  const restore=()=>{
    const query=new URLSearchParams(location.search);
    const wanted=query.get(`${prefix}-shape`);
    if(balconyShapes.some(shape=>shape.id===wanted))field('shape').value=wanted;
    setShape(true);
    const type=query.get(`${prefix}-type`);
    if(mode==='glazing'&&['warm','cold'].includes(type))field('type').value=type;
    syncProfiles();
    for(const input of form.elements){
      if(!input.name||input.name==='shape')continue;
      const value=query.get(`${prefix}-${input.name}`);
      if(value===null)continue;
      if(input.type==='checkbox')input.checked=value==='on';
      else if(input.type==='radio')input.checked=input.value===value;
      else if(input.tagName==='SELECT'){
        if([...input.options].some(option=>option.value===value&&!option.disabled))input.value=value;
      }else input.value=value;
    }
    for(const range of form.querySelectorAll('[data-dimension-range]'))range.value=field(range.dataset.dimensionRange).value;
    update();
  };
  form.addEventListener('submit',event=>{event.preventDefault();update(true);});
  form.addEventListener('input',event=>{
    const input=event.target;
    if(input.name==='shape')setShape();
    if(input.name==='type')syncProfiles();
    if(input.dataset.dimensionRange)field(input.dataset.dimensionRange).value=input.value;
    if(input.dataset.dimensionNumber)form.querySelector(`[data-dimension-range="${input.name}"]`).value=input.value;
    update(false);
  });
  form.addEventListener('change',()=>update(true));
  window.addEventListener('popstate',restore);
  restore();
});

// Preserve a calculator configuration when moving between service/profile pages.
document.querySelectorAll('.profile-links a,.service-carousel a,.route-card').forEach(link=>{
  link.addEventListener('click',()=>{
    const destination=new URL(link.href,location.origin);
    if(!destination.pathname.startsWith('/customers/balconies/'))return;
    for(const [key,value]of new URLSearchParams(location.search))if(/^gl-|^fi-/.test(key))destination.searchParams.set(key,value);
    const profile=destination.pathname.match(/\/profiles\/([^/]+)\//)?.[1];
    const selected=windowProfiles.find(item=>item.id===profile);
    if(selected){destination.searchParams.set('gl-profile',selected.id);destination.searchParams.set('gl-type',selected.type);}
    link.href=destination.href;
  });
});

const requestComment=document.querySelector('body[data-path="/customers/request/"] textarea[name="comment"]');
if(requestComment&&!requestComment.value){const comment=new URLSearchParams(location.search).get('comment');if(comment)requestComment.value=comment.slice(0,1800);}

document.querySelectorAll('.service-faq details').forEach(detail=>detail.addEventListener('toggle',()=>{
  const url=new URL(location.href);
  if(detail.open){url.hash=detail.id;history.replaceState(null,'',url);}
  else if(url.hash===`#${detail.id}`){url.hash='';history.replaceState(null,'',url);}
}));
const hashTarget=document.getElementById(location.hash.slice(1));
if(hashTarget?.matches('.service-faq details'))hashTarget.open=true;

window.addEventListener('load',()=>{
  if(motionPreference.matches||!window.gsap||!window.ScrollTrigger)return;
  const gsap=window.gsap;gsap.registerPlugin(window.ScrollTrigger);
  document.querySelectorAll('.glazing-guide figure,.service-carousel__image').forEach(figure=>{
    gsap.fromTo(figure.querySelector('img'),{scale:.94,opacity:.65},{scale:1,opacity:1,scrollTrigger:{trigger:figure,start:'top 95%',end:'top 55%',scrub:true},ease:'none'});
  });
});
