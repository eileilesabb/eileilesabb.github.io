const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const setBackgroundInert = (inert) => {
  document.querySelector('#content')?.toggleAttribute('inert', inert);
  document.querySelector('.site-footer')?.toggleAttribute('inert', inert);
};

menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  mainNav?.toggleAttribute('data-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  setBackgroundInert(open);
});

document.querySelectorAll('.nav-dropdown > button').forEach((button) => {
  button.addEventListener('click', () => {
    const parent = button.closest('.nav-dropdown');
    const open = !parent.hasAttribute('data-open');
    parent.toggleAttribute('data-open', open);
    button.setAttribute('aria-expanded', String(open));
  });
});

document.querySelectorAll('.service-menu details').forEach((panel) => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    panel.parentElement.querySelectorAll('details').forEach((other) => {
      if (other !== panel) other.open = false;
    });
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.nav-dropdown[data-open]').forEach((node) => {
    node.removeAttribute('data-open');
    const button = node.querySelector('button');
    button?.setAttribute('aria-expanded', 'false');
    button?.focus();
  });
  if (mainNav?.hasAttribute('data-open')) {
    mainNav.removeAttribute('data-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setBackgroundInert(false);
    menuToggle?.focus();
  }
});

window.matchMedia('(min-width: 761px)').addEventListener('change', ({ matches }) => {
  if (!matches) return;
  mainNav?.removeAttribute('data-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  setBackgroundInert(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || !mainNav?.hasAttribute('data-open')) return;
  const controls = [menuToggle, ...mainNav.querySelectorAll('a,button')].filter((control) => control && control.getClientRects().length && getComputedStyle(control).visibility !== 'hidden');
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
document.querySelectorAll('a[href]').forEach((link) => {
  if (link.getAttribute('href') === location.pathname) link.setAttribute('aria-current', 'page');
});

document.querySelectorAll('[data-project-list]').forEach((list) => {
  const items = [...list.querySelectorAll('[data-project-index]')];
  const more = document.querySelector('[data-projects-more]');
  const count = document.querySelector('[data-projects-count]');
  const queryPage = Number(new URLSearchParams(location.search).get('page')) || 1;
  let shown = Math.min(items.length, Math.max(1, queryPage) * 24);
  const render = () => {
    items.forEach((item, index) => { item.hidden = index >= shown; });
    if (more) more.hidden = shown >= items.length;
    if (count) count.textContent = `Показано ${shown} из ${items.length}`;
  };
  more?.addEventListener('click', () => {
    const firstNew = items[shown]?.querySelector('a');
    shown = Math.min(shown + 24, items.length);
    render();
    const url = new URL(location.href);
    url.searchParams.set('page', String(Math.ceil(shown / 24)));
    history.replaceState(null, '', url);
    firstNew?.focus({ preventScroll: true });
  });
  render();
});

document.querySelectorAll('[data-gallery-image]').forEach((button) => {
  button.addEventListener('click', () => {
    const gallery = button.closest('.project-gallery');
    const main = gallery.querySelector('.project-gallery__main');
    main.src = button.dataset.galleryImage;
    gallery.querySelectorAll('[data-gallery-image]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  });
});

document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('[data-slider-track]');
  const previous = slider.querySelector('[data-slider-prev]');
  const next = slider.querySelector('[data-slider-next]');
  const status = slider.querySelector('[data-slider-status]');
  const cards = [...track.children];
  const motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const move = (direction) => track.scrollBy({ left: direction * track.clientWidth, behavior: motion() });
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', (event) => {
    if (event.target !== track) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: motion() });
    }
  });
  let frame;
  const update = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    const width = cards[0]?.getBoundingClientRect().width || 1;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const first = Math.min(cards.length, Math.round(track.scrollLeft / (width + gap)) + 1);
    const last = Math.min(cards.length, Math.max(first, Math.ceil((track.scrollLeft + track.clientWidth) / (width + gap))));
    status.textContent = `${first}–${last} из ${cards.length}`;
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
  track.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(schedule).observe(track);
  update();
});

const calculatorForm = document.querySelector('[data-calculator]');
if (calculatorForm) {
  const number = new Intl.NumberFormat('ru-RU');
  const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
  const query = new URLSearchParams(location.search);
  const field = (name) => calculatorForm.elements.namedItem(name);
  for (const name of ['type_house', 'type_apartment', 'type_repair', 'area_preset']) {
    const input = field(name);
    if ([...input.options].some((option) => option.value === query.get(name))) input.value = query.get(name);
  }
  if (query.has('size')) field('size').value = query.get('size');
  const customArea = calculatorForm.querySelector('[data-custom-area]');
  const toggleArea = () => {
    customArea.hidden = field('area_preset').value !== 'custom';
    field('size').disabled = customArea.hidden;
  };
  field('area_preset').addEventListener('change', toggleArea);
  toggleArea();
  const invalidateResult = () => {
    document.querySelector('[data-calculator-total]').textContent = '—';
    document.querySelector('[data-calculator-summary]').textContent = 'Параметры изменились. Нажмите «Рассчитать», чтобы обновить оценку.';
    document.querySelector('[data-calculator-detail]').textContent = 'Стоимость материалов уточняется после выбора и расчёта количества.';
    document.querySelector('.calculator-result .repair-action a').href = '/customers/request/';
  };
  calculatorForm.addEventListener('change', invalidateResult);
  field('size').addEventListener('input', invalidateResult);
  calculatorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const area = Number(field('area_preset').value === 'custom' ? field('size').value : field('area_preset').value);
    const error = calculatorForm.querySelector('[data-calculator-error]');
    const invalid = !Number.isFinite(area) || area < 1 || area > 10000;
    field('size').setAttribute('aria-invalid', String(invalid));
    field('size').setAttribute('aria-describedby', 'calc-area-error');
    error.id = 'calc-area-error';
    error.textContent = invalid ? 'Укажите площадь от 1 до 10 000 м².' : '';
    if (invalid) { field('size').focus(); return; }
    const label = (name) => field(name).selectedOptions[0].textContent;
    const summary = `${label('type_house')}. ${label('type_apartment')}. ${label('type_repair')}. ${number.format(area)} м².`;
    const rate = { cosmetic: 3500, standard: 9000 }[field('type_repair').value];
    document.querySelector('[data-calculator-summary]').textContent = summary;
    document.querySelector('[data-calculator-total]').textContent = rate ? `от ${money.format(rate * area)}` : 'По смете';
    document.querySelector('[data-calculator-detail]').textContent = rate
      ? `Работы: ${number.format(area)} м² × ${money.format(rate)}/м². Материалы рассчитываются отдельно после подбора.`
      : 'Оставьте заявку с выбранными параметрами — уточним состав работ и материалов.';
    const params = new URLSearchParams();
    for (const name of ['type_house', 'type_apartment', 'type_repair', 'area_preset']) params.set(name, field(name).value);
    if (field('area_preset').value === 'custom') params.set('size', String(area));
    history.replaceState(null, '', `${location.pathname}?${params}`);
    const request = document.querySelector('.calculator-result .repair-action a');
    request.href = `/customers/request/?${params}`;
    if (window.matchMedia('(max-width: 760px)').matches) {
      const result = document.querySelector('.calculator-result');
      result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  });
}

if (location.pathname === '/customers/request/') {
  const params = new URLSearchParams(location.search);
  const room = { apartment: 'Квартира', office: 'Офис', cottage: 'Коттедж', bathroom: 'Ванна и туалет' }[params.get('type_apartment')];
  const repair = { cosmetic: 'Косметический', standard: 'Стандартный', business: 'Бизнес-класса', exclusive: 'Эксклюзивный' }[params.get('type_repair')];
  const house = { new: 'Новое жильё', secondary: 'Вторичное жильё' }[params.get('type_house')];
  const area = Number(params.get('area_preset') === 'custom' ? params.get('size') : params.get('area_preset'));
  const comment = document.querySelector('textarea[name="comment"]');
  if (comment && house && room && repair && area > 0) comment.value = `${house}. ${room}. ${repair} ремонт. Площадь: ${new Intl.NumberFormat('ru-RU').format(area)} м².`;
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-dropdown')) {
    document.querySelectorAll('.nav-dropdown[data-open]').forEach((node) => {
      node.removeAttribute('data-open');
      node.querySelector('button')?.setAttribute('aria-expanded', 'false');
    });
  }
});

document.querySelectorAll('input[name="phone"]').forEach((input) => {
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
    const body = digits.startsWith('7') ? digits.slice(1) : digits;
    let formatted = '+7';
    if (body.length) formatted += ` (${body.slice(0, 3)}`;
    if (body.length >= 3) formatted += ')';
    if (body.length > 3) formatted += ` ${body.slice(3, 6)}`;
    if (body.length > 6) formatted += `-${body.slice(6, 8)}`;
    if (body.length > 8) formatted += `-${body.slice(8, 10)}`;
    input.value = formatted;
  });
});

const submissionDialog = document.querySelector('[data-submission-dialog]');
let submissionReturnFocus = null;
const closeSubmissionDialog = () => {
  if (!submissionDialog || submissionDialog.hidden) return;
  submissionDialog.hidden = true;
  document.body.classList.remove('has-open-dialog');
  submissionReturnFocus?.focus();
};
const openSubmissionDialog = (trigger) => {
  if (!submissionDialog) return;
  submissionReturnFocus = trigger;
  submissionDialog.hidden = false;
  document.body.classList.add('has-open-dialog');
  submissionDialog.querySelector('.submission-dialog__close')?.focus();
};
submissionDialog?.querySelectorAll('[data-submission-close]').forEach((button) => button.addEventListener('click', closeSubmissionDialog));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSubmissionDialog();
});

document.querySelectorAll('[data-lead-form]').forEach((form) => {
  let dirty = false;
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('change', () => { dirty = true; });
  form.querySelectorAll('[required],input[type="email"]').forEach((field) => {
    field.addEventListener('input', () => {
      field.removeAttribute('aria-invalid');
      const error = field.closest('.field')?.querySelector('.field-error');
      if (error) error.remove();
      field.removeAttribute('aria-describedby');
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    let valid = true;
    form.querySelectorAll('[required],input[type="email"]').forEach((field) => {
      field.closest('.field')?.querySelector('.field-error')?.remove();
      const phoneTooShort = field.name === 'phone' && field.value.replace(/\D/g, '').length < 11;
      const emailInvalid = field.type === 'email' && Boolean(field.value.trim()) && !field.validity.valid;
      const tooLong = field.maxLength > 0 && field.value.length > field.maxLength;
      const invalid = field.type === 'checkbox' ? !field.checked : (field.required && !field.value.trim()) || phoneTooShort || emailInvalid || tooLong;
      field.setAttribute('aria-invalid', String(invalid));
      if (invalid) {
        valid = false;
        const error = document.createElement('span');
        error.className = 'field-error';
        error.id = `${field.id}-error`;
        error.textContent = field.type === 'checkbox' ? 'Подтвердите согласие с политикой конфиденциальности.' : tooLong ? `Не более ${field.maxLength} символов.` : emailInvalid ? 'Введите корректный e-mail, например name@example.ru.' : phoneTooShort ? 'Введите полный номер телефона.' : 'Заполните это поле.';
        field.setAttribute('aria-describedby', error.id);
        field.closest('.field')?.append(error);
      }
    });
    if (!valid) {
      status.textContent = 'Проверьте отмеченные поля формы.';
      status.className = 'form-status';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    status.textContent = 'Спасибо за заявку! Мы скоро с вами свяжемся.';
    status.className = 'form-status is-success';
    dirty = false;
    const submitButton = form.querySelector('[type="submit"]');
    form.reset();
    openSubmissionDialog(submitButton);
  });
  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
});

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('.feedback-card')];
  let index = 0;
  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
  };
  carousel.querySelector('[data-prev]')?.addEventListener('click', () => show(index - 1));
  carousel.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
  show(0);
});

document.querySelectorAll('[data-repair-types]').forEach((widget) => {
  const tabs = [...widget.querySelectorAll('[role="tab"]')];
  const activate = (tab, updateUrl = false) => {
    tabs.forEach((other) => {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
    });
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('repair-type', tab.id.replace('tab-', ''));
      history.replaceState(null, '', url);
      window.ScrollTrigger?.refresh();
    }
  };
  const restore = () => activate(tabs.find((tab) => tab.id === `tab-${new URLSearchParams(location.search).get('repair-type')}`) || tabs[0]);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab, true));
    tab.addEventListener('keydown', (event) => {
      const direction = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!direction && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + direction + tabs.length) % tabs.length];
      activate(next, true);
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });
  restore();
  window.addEventListener('popstate', restore);
});

document.querySelectorAll('[data-reviews]').forEach((section) => {
  const cards = [...section.querySelectorAll('[data-review-index]')];
  const buttons = [...section.querySelectorAll('[data-review-page]')];
  const pageSize = Number(section.dataset.reviewPageSize) || 5;
  const render = (page, updateUrl = false) => {
    page = Math.max(1, Math.min(buttons.length, Number(page) || 1));
    cards.forEach((card, i) => { card.hidden = i < (page - 1) * pageSize || i >= page * pageSize; });
    buttons.forEach((button) => {
      if (Number(button.dataset.reviewPage) === page) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    section.querySelector('[data-review-status]').textContent = `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, cards.length)} из ${cards.length}`;
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('review-page', String(page));
      history.replaceState(null, '', url);
      const heading = cards[(page - 1) * pageSize].querySelector('h3');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };
  const restore = () => render(new URLSearchParams(location.search).get('review-page'));
  buttons.forEach((button) => button.addEventListener('click', () => render(button.dataset.reviewPage, true)));
  restore();
  window.addEventListener('popstate', restore);
});
const reviewText = document.getElementById('review-text');
reviewText?.addEventListener('input', () => {
  document.querySelector('[data-review-limit]').textContent = `${reviewText.value.length} / 500 символов`;
});

const story = document.querySelector('[data-story]');
let storyTrigger;
const jumpToStory=(top)=>{
  const root=document.documentElement;
  const previous=root.style.scrollBehavior;
  root.style.scrollBehavior='auto';
  window.scrollTo({top,behavior:'auto'});
  root.style.scrollBehavior=previous;
};
const showStoryFrame = (index) => {
  if (!story) return;
  story.querySelectorAll('[data-story-copy]').forEach((copy, i) => { copy.hidden = i !== index; });
  story.querySelectorAll('[data-story-frame]').forEach((frame, i) => {
    frame.classList.toggle('is-active', i === index);
    frame.setAttribute('aria-hidden', String(i !== index));
  });
  story.querySelectorAll('[data-story-step]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
};
story?.querySelectorAll('[data-story-step]').forEach((button, index) => button.addEventListener('click', () => {
  showStoryFrame(index);
  if (storyTrigger) {
    jumpToStory(storyTrigger.start + (storyTrigger.end - storyTrigger.start) * (index + .5) / 5);
    window.ScrollTrigger.update();
    button.focus({ preventScroll: true });
  }
}));

window.addEventListener('load', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsapReady = Boolean(window.gsap && window.ScrollTrigger);
  document.documentElement.dataset.motion = reducedMotion ? 'reduced' : gsapReady ? 'gsap' : 'fallback';
  if (!gsapReady || reducedMotion) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  document.querySelectorAll('.installment-benefits, .advantages-grid, .installment-stages ol').forEach((section) => {
    window.gsap.fromTo(section.children, { y: 24, opacity: .55 }, { y: 0, opacity: 1, duration: .65, stagger: .09, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 88%', once: true } });
  });
  document.querySelectorAll('.installment-hero figure img, .landscape-intro figure img').forEach((image) => {
    window.gsap.fromTo(image, { scale: .96 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: image, start: 'top 95%', end: 'center 45%', scrub: true } });
  });
  window.gsap.matchMedia().add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
    if (!story) return;
    let previous = -1;
    storyTrigger = window.ScrollTrigger.create({
      trigger: story,
      start: 'top 100px',
      end: () => `+=${window.innerHeight * 3}`,
      pin: story.querySelector('.story-scene'),
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: ({ progress }) => {
        const index = Math.min(4, Math.floor(progress * 5));
        if (previous === index) return;
        previous = index;
        showStoryFrame(index);
        window.gsap.fromTo(story.querySelector(`[data-story-frame="${index}"] img`), { scale: .97 }, { scale: 1, duration: .5, overwrite: true, ease: 'power2.out' });
      }
    });
    return () => { storyTrigger = null; showStoryFrame(0); };
  });
});
