/* sv-motion.js — Serra Vasconcellos motion enhancements.
 * - Scroll-based header shadow (sv-header-scrolled on <body>)
 * - IntersectionObserver reveal for [data-sv-reveal]
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

  /* ---- 2. Reveal via IntersectionObserver, dispara 1x, stagger por grupo ---- */
  function initReveal() {
    // Auto-opt-in: componentes sv-* ganham reveal + stagger onde cabe
    var autoRevealTargets = [
      { sel: '.sv-process__title', group: null },
      { sel: '.sv-process__lede', group: null },
      { sel: '.sv-process__step', group: 'process-steps' },
      { sel: '.sv-timeline__title', group: null },
      { sel: '.sv-timeline__item', group: 'timeline' },
      { sel: '.sv-legal-wrap h2', group: 'legal-h2' },
      { sel: '.sv-spotlight-card', group: 'spotlight' },
      { sel: '.sv-trio-card', group: 'trio' },
    ];
    autoRevealTargets.forEach(function (t) {
      document.querySelectorAll(t.sel).forEach(function (el) {
        if (el.hasAttribute('data-sv-reveal')) return;
        el.setAttribute('data-sv-reveal', '');
        if (t.group) el.setAttribute('data-sv-reveal-group', t.group);
      });
    });

    function forceAllVisible() {
      document.querySelectorAll('[data-sv-reveal], .sv-process__title, .sv-process__lede, .sv-process__step, .sv-timeline__title, .sv-timeline__item, .sv-legal-wrap h2, .sv-spotlight-card, .sv-trio-card').forEach(function (el) {
        el.classList.add('is-visible');
      });
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      forceAllVisible();
      return;
    }

    // Liga o pré-hide no body SÓ agora (CSS depende de body.sv-reveal-ready)
    document.body.classList.add('sv-reveal-ready');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var group = el.getAttribute('data-sv-reveal-group');
          var delay = 0;
          if (group) {
            var siblings = document.querySelectorAll('[data-sv-reveal-group="' + group + '"]:not(.is-visible)');
            var idx = Array.prototype.indexOf.call(siblings, el);
            if (idx > -1) delay = idx * 40;
          }
          el.style.setProperty('--sv-reveal-delay', delay + 'ms');
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });

    document.querySelectorAll('[data-sv-reveal]').forEach(function (el) {
      io.observe(el);
    });

    // Safety net: se IO não disparar em 2.5s (ex: fullpage screenshot, JS tool, etc.),
    // força tudo visível pra nunca ter conteúdo oculto permanente.
    window.setTimeout(forceAllVisible, 2500);
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
