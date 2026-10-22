/* sv-motion.js — Serra Vasconcellos motion enhancements.
 * - Scroll-based header shadow (sv-header-scrolled on <body>)
 * - Reveal ao rolar (único sistema de entrada do site; ver initReveal)
 * - Form field states (invalid/sending/success) for .sv-contact-form
 * All animations respect prefers-reduced-motion: reduce
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Sticky-header shadow on scroll (rAF-throttled) ---- */
  function initHeaderScroll() {
    // Mark the first .e-con.e-parent (which carries the nav) as .sv-site-header
    var firstContainer = document.querySelector('.elementor > .e-con.e-parent');
    if (firstContainer) firstContainer.classList.add('sv-site-header');

    var body = document.body;
    var ticking = false;
    var lastY = -1;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var y = window.scrollY || window.pageYOffset;
          if (y !== lastY) {
            if (y > 40) {
              body.classList.add('sv-header-scrolled');
            } else {
              body.classList.remove('sv-header-scrolled');
            }
            lastY = y;
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- 2. Reveal ao rolar — sistema único (substitui as entradas do Elementor)
     - Cada widget/cartão sobe 24px e aparece (700ms, cubic-bezier(.22,1,.36,1)),
       uma única vez, quando entra na tela.
     - Itens do mesmo grupo (cards de uma grade, passos, linha do tempo, FAQ)
       entram em sequência, 100ms entre um e outro.
     - Títulos de topo (h1) e o letreiro entram linha por linha.
     - Imagens dos cards entram com leve zoom (1.06 → 1).
     - Cabeçalho e rodapé não animam.
     O <head> marca <html class="sv-motion"> só quando o usuário não pediu
     menos movimento; sem essa classe nada fica escondido. */
  var GROUP_ITEMS = [
    '.e-grid > .e-con',
    '.sv-process__step',
    '.sv-timeline__item',
    '.e-n-accordion-item',
    '.sv-legal-wrap h2'
  ].join(',');
  var STEP = 100, MAX_STEP = 6;

  function splitLines(el) {
    if (!el || el.querySelector('.sv-line')) return;
    var html = el.innerHTML.trim();
    var parts = html.split(/<br\s*\/?>/i).map(function (s) { return s.trim(); }).filter(Boolean);
    el.innerHTML = parts.map(function (p, i) {
      return '<span class="sv-line"><span style="--sv-ld:' + (i * 110) + 'ms">' + p + '</span></span>';
    }).join('');
    el.classList.add('sv-lines');
  }

  function initReveal() {
    var root = document.documentElement;
    if (!root.classList.contains('sv-motion') || !('IntersectionObserver' in window)) {
      root.classList.remove('sv-motion');
      return;
    }
    var sections = Array.prototype.slice.call(document.querySelectorAll('.elementor > .e-con.e-parent, .elementor > .sv-form-wrap'));
    var header = sections[0];
    var targets = [];

    sections.forEach(function (sec) {
      if (sec === header || sec.querySelector('.sv-copy')) return; // cabeçalho e rodapé
      // títulos de topo linha por linha
      sec.querySelectorAll('h1').forEach(splitLines);
      // grupos (cards, passos, timeline, FAQ)
      var groupEls = Array.prototype.slice.call(sec.querySelectorAll(GROUP_ITEMS));
      groupEls.forEach(function (el) {
        if (el.closest('.sv-rv')) return;
        var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.matches(GROUP_ITEMS); });
        var i = Math.min(sibs.indexOf(el), MAX_STEP);
        el.style.setProperty('--sv-d', (i * STEP) + 'ms');
        el.classList.add('sv-rv');
        targets.push(el);
      });
      // widgets soltos (títulos, textos, botões, imagens, letreiro)
      sec.querySelectorAll('.elementor-widget, .sv-letreiro, .sv-process__eyebrow, .sv-process__title, .sv-process__lede, .sv-timeline__eyebrow, .sv-timeline__title, .sv-timeline__lede, .sv-marquee, .sv-contact-form').forEach(function (el) {
        if (el.closest('.sv-rv') || el.querySelector('.sv-rv')) return;
        var parent = el.parentElement;
        var sibs = Array.prototype.filter.call(parent.children, function (c) { return !c.classList.contains('sv-rv-skip'); });
        var i = Math.min(Math.max(sibs.indexOf(el), 0), MAX_STEP);
        el.style.setProperty('--sv-d', (i * STEP) + 'ms');
        el.classList.add('sv-rv');
        targets.push(el);
      });
    });

    function show(el) {
      el.classList.add('sv-in');
      var done = function () { el.classList.add('sv-done'); };
      el.addEventListener('transitionend', done, { once: true });
      window.setTimeout(done, 1600);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });

    root.classList.add('sv-booted');
    // Rede de segurança: nada fica escondido se algo falhar
    window.setTimeout(function () {
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el);
      });
    }, 1200);
    window.addEventListener('beforeprint', function () { targets.forEach(show); });
  }

  /* ---- 3. Enhanced contact form (progressive enhancement) ---- */
  function initContactForm() {
    var form = document.querySelector('form.sv-contact-form');
    if (!form) return;

    // Wrap each label as "field" group so we can show inline errors
    form.querySelectorAll('label').forEach(function (label) {
      if (label.classList.contains('sv-field')) return;
      label.classList.add('sv-field');
      // Append an error slot if not present
      if (!label.querySelector('.sv-field__error')) {
        var err = document.createElement('small');
        err.className = 'sv-field__error';
        err.setAttribute('aria-live', 'polite');
        label.appendChild(err);
      }
    });

    // Create success slot once
    if (!form.querySelector('.sv-form-success')) {
      var ok = document.createElement('div');
      ok.className = 'sv-form-success';
      ok.setAttribute('role', 'status');
      ok.textContent = 'Mensagem preparada no seu cliente de e-mail. Finalize o envio por lá.';
      form.appendChild(ok);
    }

    function setFieldInvalid(field, msg) {
      var label = field.closest('label') || field.parentElement;
      if (!label) return;
      label.classList.add('sv-field--invalid');
      var slot = label.querySelector('.sv-field__error');
      if (slot) slot.textContent = msg || 'Campo obrigatório.';
    }
    function clearFieldInvalid(field) {
      var label = field.closest('label') || field.parentElement;
      if (!label) return;
      label.classList.remove('sv-field--invalid');
      var slot = label.querySelector('.sv-field__error');
      if (slot) slot.textContent = '';
    }

    form.querySelectorAll('input, select, textarea').forEach(function (f) {
      f.addEventListener('input', function () { clearFieldInvalid(f); });
      f.addEventListener('blur', function () {
        if (f.required && !f.value.trim()) {
          setFieldInvalid(f, 'Preencha este campo.');
        } else if (f.type === 'email' && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) {
          setFieldInvalid(f, 'E-mail inválido.');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      // Validate manually so we can show stylized errors
      var firstInvalid = null;
      form.querySelectorAll('input, select, textarea').forEach(function (f) {
        if (f.required && !f.value.trim()) {
          setFieldInvalid(f, 'Preencha este campo.');
          if (!firstInvalid) firstInvalid = f;
        } else if (f.type === 'email' && f.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) {
          setFieldInvalid(f, 'E-mail inválido.');
          if (!firstInvalid) firstInvalid = f;
        }
      });
      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.focus();
        return;
      }
      // Visual "sending" state while mail client opens
      form.classList.add('is-sending');
      // After mailto opens, mark success + reset sending (small delay)
      window.setTimeout(function () {
        form.classList.remove('is-sending');
        form.classList.add('is-success');
      }, 700);
    });
  }

  /* ---- 0. Dispara entries DEPOIS do primeiro paint (via body.sv-loaded)
     Também remove .elementor-invisible pra Elementor não interferir */
  function initElementorAnimations() {
    document.querySelectorAll('.elementor-invisible').forEach(function (el) {
      el.classList.remove('elementor-invisible');
    });
    // Marca body no próximo rAF (garante que já ocorreu primeiro paint)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add('sv-loaded');
      });
    });
  }

  /* ---- 4. Boot ---- */
  function boot() {
    initElementorAnimations();
    initHeaderScroll();
    initReveal();
    initContactForm();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
