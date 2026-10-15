const normalize=value=>String(value).toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const aliases=[
  'подсобник помощник грузчик разнорабочий подсобный',
  'разнорабочий универсал подсобник помощник',
  'маляр моляр малярщик молярщик покраска окраска шпаклевка шпатлевка',
  'штукатур штукатурщик штукатурка выравнивание маяки',
  'обойщик обойщица обои поклейка',
  'плиточник кафельщик мозаичник плитка кафель мозаика',
  'гипсокартонщик гипрочник гипрок гкл гипсокартон',
  'стяжка стяжечник бетонщик пол',
  'ламинат ламинатчик напольные покрытия пол',
  'паркет паркетчик паркетная доска пол',
  'потолочник натяжные потолки монтажник',
  'двери дверник установка монтажник',
  'перегородки гкл гипсокартон монтажник',
  'окна оконщик откосы остекление монтажник',
  'декоративная штукатурка декоратор венецианка',
  'фасад фасадчик облицовка наружная отделка',
  'смр стройка строительство общестроительные мастер',
  'сантехник сантехника водопровод канализация трубы',
  'электрик электрика электромонтажник проводка розетки кабель',
  'пто инженер документация сметы исполнительная',
  'стройконтроль технадзор строительный контроль качество инженер',
  'проектировщик проектирование чертежи инженер',
  'овик овк вентиляция отопление кондиционирование инженер',
  'вк водоснабжение канализация инженер',
  'эом электроснабжение электрооборудование электричество инженер',
  'геодезист геодезия обмеры съемка разбивка',
  'охрана труда от тб безопасность специалист',
  'прораб производитель работ бригадир руководитель',
  'начальник участка руководитель строительство'
];
export const searchTokens=(name,task,index)=>normalize(`${name} ${task} ${aliases[index]||''}`).split(' ');
const oneTypo=(a,b)=>{
  if(a.length<4||Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,errors=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}
  return errors+(i<a.length||j<b.length?1:0)<=1;
};
export function rankVacancy(query,name,task,index){
  const terms=normalize(query).split(' ').filter(Boolean);
  if(!terms.length)return 1;
  const title=normalize(name),tokens=searchTokens(name,task,index);
  let score=title.startsWith(normalize(query))?100:0;
  for(const term of terms){
    const direct=tokens.filter(token=>token.startsWith(term));
    if(direct.length){score+=direct.some(token=>title.includes(token))?20:10;continue;}
    if(tokens.some(token=>oneTypo(term,token.slice(0,term.length)))){score+=2;continue;}
    return 0;
  }
  return score;
}
