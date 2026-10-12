// ACELERA — comportamiento del sitio
// GSAP + ScrollTrigger se cargan por CDN antes de este archivo; todo aquí
// tiene un fallback sin animación si no están disponibles (offline, bloqueo
// de red) o si el visitante pide prefers-reduced-motion.

(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------- Entrada de página (fade-in) ----------
  // La clase js-loading la agrega un script inline en <head> (evita FOUC);
  // acá simplemente la quitamos un frame después para que la transición
  // CSS de opacity/transform en body dispare.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.documentElement.classList.remove('js-loading');
    });
  });

  // ---------- Transición de salida al navegar entre páginas internas ----------
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    var url;
    try { url = new URL(href, window.location.href); } catch (err) { return; }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    e.preventDefault();
    if (reduceMotion) { window.location.href = url.href; return; }
    document.documentElement.classList.add('js-leaving');
    setTimeout(function () { window.location.href = url.href; }, 320);
  });

  document.addEventListener('DOMContentLoaded', function () {
    // ---------- Nav móvil ----------
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(links.classList.contains('is-open')));
      });
    }

    // ---------- Reveals (stagger) ----------
    // Selectores simples primero (.reveal), luego grupos que se animan en
    // cascada (grids de tarjetas, el bloque de headline+sub+body del hero).
    var singleReveals = document.querySelectorAll('.reveal');
    var staggerGroupSelectors = [
      '.hero-reveal-section .container > *',
      '.plans-head > *',
      '.index-grid > .index-card',
      '.criteria-grid > .criteria-item',
      '.pricing-grid > .pricing-card',
      '.people-grid > .person-card',
      '.stat-band > .stat-card'
    ];

    if (hasGsap) {
      singleReveals.forEach(function (el) {
        gsap.fromTo(el, { opacity: 0, y: 18 }, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power1.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
        });
      });

      staggerGroupSelectors.forEach(function (sel) {
        var items = document.querySelectorAll(sel);
        if (!items.length) return;
        gsap.fromTo(items, { opacity: 0, y: 22 }, {
          opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power1.out',
          delay: parseFloat(items[0].parentElement.getAttribute('data-delay')) || 0,
          scrollTrigger: { trigger: items[0].closest('section') || items[0].parentElement, start: 'top 80%', toggleActions: 'play none none reverse' }
        });
      });
    } else {
      singleReveals.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // ---------- Botones magnéticos (solo los 2 CTA focales del hero) ----------
    if (hasGsap) {
      var magneticEls = document.querySelectorAll('.hero .btn');
      magneticEls.forEach(function (el) {
        el.classList.add('is-magnetic');
        var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1,0.4)' });
        var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1,0.4)' });
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.25);
          yTo((e.clientY - r.top - r.height / 2) * 0.25);
        });
        el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
      });

      // ---------- Parallax sutil en la imagen del hero ----------
      document.querySelectorAll('.hero:not(.hero--split) .hero-media').forEach(function (media) {
        var hero = media.closest('.hero');
        if (!hero) return;
        gsap.to(media, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
      });
    }

    // ---------- Proceso: crossfade de la imagen sticky según el paso visible ----------
    var processMedia = document.querySelector('.process-media');
    var mediaLayers = processMedia ? processMedia.querySelectorAll('.process-media-layer') : [];
    var steps = document.querySelectorAll('.process-step');
    var activeLayerIndex = 0;
    var currentProcessImg = mediaLayers.length ? mediaLayers[0].style.backgroundImage : '';

    // Precarga: sin esto la primera vez que cambia el paso, la foto se
    // descarga recién al asignarla y el crossfade muestra un parpadeo.
    steps.forEach(function (step) {
      var src = step.getAttribute('data-media');
      if (src) { var pre = new Image(); pre.src = src; }
    });

    function crossfadeProcessImage(url) {
      if (!mediaLayers.length || !url) return;
      if (("url(\"" + url + "\")") === currentProcessImg || ("url('" + url + "')") === currentProcessImg) return;
      var nextIndex = 1 - activeLayerIndex;
      var nextLayer = mediaLayers[nextIndex];
      var curLayer = mediaLayers[activeLayerIndex];
      nextLayer.style.backgroundImage = "url('" + url + "')";
      void nextLayer.offsetWidth; // fuerza reflow para que la transición arranque desde el estado inicial
      nextLayer.classList.add('is-active');
      curLayer.classList.remove('is-active');
      activeLayerIndex = nextIndex;
      currentProcessImg = "url('" + url + "')";
    }

    if (processMedia && steps.length && 'IntersectionObserver' in window) {
      var stepIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target.getAttribute('data-media');
            crossfadeProcessImage(img);
          }
        });
      }, { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' });
      steps.forEach(function (el) { stepIO.observe(el); });
    }

    // ---------- Contadores animados (.counter[data-target]) ----------
    var counters = document.querySelectorAll('.counter[data-target]');
    if (counters.length) {
      var animateCounter = function (el) {
        var target = parseFloat(el.getAttribute('data-target'));
        var duration = 1200;
        var start = null;
        var suffix = el.getAttribute('data-suffix') || '';
        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      };
      if ('IntersectionObserver' in window) {
        var counterIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterIO.unobserve(entry.target);
            }
          });
        }, { threshold: 0.6 });
        counters.forEach(function (el) { counterIO.observe(el); });
      } else {
        counters.forEach(function (el) { animateCounter(el); });
      }
    }

    // ---------- Acordeón FAQ con altura animada ----------
    // <details>/<summary> se mantiene por semántica y accesibilidad, pero el
    // toggle nativo (instantáneo) se reemplaza por una transición de
    // max-height controlada acá, sincronizando el atributo `open`.
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var summary = item.querySelector('summary');
      var answer = item.querySelector('.faq-answer');
      if (!summary || !answer) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = item.classList.contains('is-open');

        if (isOpen) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { answer.style.maxHeight = '0px'; });
          });
          item.classList.remove('is-open');
          setTimeout(function () { item.removeAttribute('open'); }, 360);
        } else {
          item.setAttribute('open', '');
          item.classList.add('is-open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          answer.addEventListener('transitionend', function onEnd(ev) {
            if (ev.propertyName !== 'max-height') return;
            if (item.classList.contains('is-open')) answer.style.maxHeight = 'none';
            answer.removeEventListener('transitionend', onEnd);
          });
        }
      });
    });

    // ---------- Desglose de precios (etapa por etapa) ----------
    // Cada tarjeta de precio es independiente: abrir una no afecta a las
    // otras. align-items:start en .pricing-grid (css/styles.css) evita que
    // el grid estire las tarjetas colapsadas a la altura de la abierta.
    document.querySelectorAll('.pricing-stages').forEach(function (item) {
      var summary = item.querySelector('summary');
      var body = item.querySelector('.pricing-stages-body');
      if (!summary || !body) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = item.classList.contains('is-open');

        if (isOpen) {
          body.style.maxHeight = body.scrollHeight + 'px';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { body.style.maxHeight = '0px'; });
          });
          item.classList.remove('is-open');
          setTimeout(function () { item.removeAttribute('open'); }, 400);
        } else {
          item.setAttribute('open', '');
          item.classList.add('is-open');
          body.style.maxHeight = body.scrollHeight + 'px';
          body.addEventListener('transitionend', function onEnd(ev) {
            if (ev.propertyName !== 'max-height') return;
            if (item.classList.contains('is-open')) body.style.maxHeight = 'none';
            body.removeEventListener('transitionend', onEnd);
          });
        }
      });
    });

    // ---------- Formulario de contacto ----------
    // Envía por AJAX a Web3Forms (data-endpoint) con la clave pública del
    // input access_key. Solo muestra éxito si el servicio lo confirma. Si falla
    // o la clave aún no está puesta, ofrece un mailto al correo de
    // data-fallback-email para que ningún contacto se pierda.
    /* Buscador de nivel (Cómo funciona) */
    var finder = document.querySelector('.finder-form');
    if (finder) {
      var LEVELS = {
        core: { name: 'ACELERA Core', price: '$1,400', setup: '+ $900 de setup inicial', desc: 'Lo esencial para dejar de depender de la suerte: posicionamiento, captación y un seguimiento ordenado para que ningún cliente interesado se pierda.' },
        growth: { name: 'ACELERA Growth', price: '$2,100', setup: '+ $1,400 de setup inicial', desc: 'Ya tienes movimiento. Growth conecta pauta, conversión y automatización para que cada cliente reciba seguimiento sin depender del asesor.', badge: 'El más elegido' },
        scale: { name: 'ACELERA Scale', price: '$2,800', setup: '+ $1,800 de setup inicial', desc: 'Operación completa con inteligencia de datos: medir, comparar puntos de venta y optimizar el ciclo entero, desde el anuncio hasta la venta.' }
      };
      var box = document.getElementById('finder-result-box');
      var statusEl = document.getElementById('finder-status');
      var resetBtn = finder.querySelector('.finder-reset');
      var barFill = finder.querySelector('.finder-bar > span');
      var progText = document.getElementById('finder-progress-text');
      var EMPTY = '<div class="finder-card finder-card--empty"><strong>Tu recomendación aparece aquí</strong><span>Responde las tres preguntas y te decimos qué nivel encaja con tu operación actual.</span><div class="finder-levels"><span>Core</span><span>Growth</span><span>Scale</span></div></div>';
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      box.innerHTML = EMPTY;

      var update = function () {
        var v = {};
        ['sedes', 'pauta', 'seg'].forEach(function (n) {
          var c = finder.querySelector('input[name="' + n + '"]:checked');
          if (c) v[n] = c.value;
        });
        var done = Object.keys(v).length;
        progText.textContent = done + ' de 3 respondidas';
        barFill.style.width = (done / 3 * 100) + '%';
        resetBtn.hidden = done === 0;
        if (done < 3) { box.innerHTML = EMPTY; statusEl.textContent = ''; return; }

        var score = (v.sedes === '2' ? 2 : 0) + (v.pauta === 'si' ? 1 : 0) + (v.seg === 'proceso' ? 2 : v.seg === 'crm' ? 1 : 0);
        var key = score >= 4 ? 'scale' : score >= 2 ? 'growth' : 'core';
        var L = LEVELS[key];
        var chips = [];
        if (v.pauta === 'no') chips.push('Captación de clientes');
        if (v.seg === 'whatsapp') chips.push('Seguimiento ordenado');
        if (v.seg === 'crm') chips.push('Automatizar el seguimiento');
        if (v.pauta === 'si' && v.seg !== 'proceso') chips.push('Convertir la pauta en citas');
        if (v.sedes === '2') chips.push('Medir cada punto de venta');
        if (v.seg === 'proceso') chips.push('Optimizar con datos');
        var href = 'contacto.html?nivel=' + key;
        box.innerHTML =
          '<div class="finder-card' + (reduce ? '' : ' is-in') + '">' +
          '<p class="finder-kicker">Tu punto de partida</p>' +
          '<h3 class="finder-level">' + L.name + (L.badge ? '<span class="finder-badge">' + L.badge + '</span>' : '') + '</h3>' +
          '<p class="finder-desc">' + L.desc + '</p>' +
          '<div class="finder-price"><span class="amount">' + L.price + '</span><span class="period">/mes</span><span class="setup">' + L.setup + '</span></div>' +
          '<div class="finder-priority"><p class="finder-kicker">Por dónde empezaríamos</p><ul class="finder-chips">' +
          chips.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul></div>' +
          '<div class="finder-actions"><a class="btn btn-primary" href="' + href + '">Hablar de ' + L.name.replace('ACELERA ', '') + '</a>' +
          '<a class="link-arrow" href="planes.html">Ver qué incluye cada nivel</a></div>' +
          '<p class="finder-note">Es una orientación, no un compromiso. En la reunión ajustamos el nivel a tu caso real.</p></div>';
        statusEl.textContent = 'Recomendación: ' + L.name + '.';
      };
      finder.addEventListener('change', update);
      finder.addEventListener('submit', function (e) { e.preventDefault(); });
      finder.addEventListener('reset', function () { setTimeout(update, 0); });
    }

    /* Prellenar nivel en contacto desde ?nivel= */
    var nivelSel = document.getElementById('nivel');
    if (nivelSel) {
      try {
        var q = new URLSearchParams(window.location.search).get('nivel');
        if (q && /^(core|growth|scale)$/.test(q)) nivelSel.value = q;
      } catch (err) {}
    }

    var form = document.getElementById('contact-form');
    if (form) {
      var status = document.getElementById('form-status');
      var submitBtn = form.querySelector('button[type="submit"]');
      var fallbackTo = (form.getAttribute('data-fallback-email') || '').trim();
      var setStatus = function (msg, kind) {
        status.textContent = msg;
        status.classList.remove('is-success', 'is-error');
        status.classList.add('is-visible', kind);
      };
      var showMailFallback = function (data) {
        setStatus('No pudimos enviar tu mensaje automáticamente. ', 'is-error');
        if (!fallbackTo) return;
        var body = [
          'Nombre: ' + (data.nombre || ''),
          'Concesionario: ' + (data.concesionario || ''),
          'Correo: ' + (data.email || ''),
          'Teléfono: ' + (data.telefono || ''),
          'Nivel de interés: ' + (data.nivel || '—'),
          '',
          data.mensaje || ''
        ].join('\n');
        var a = document.createElement('a');
        a.href = 'mailto:' + fallbackTo + '?subject=' + encodeURIComponent('Nuevo contacto desde acelerasystems.com') + '&body=' + encodeURIComponent(body);
        a.textContent = 'Envíalo por correo con un clic.';
        a.style.textDecoration = 'underline';
        status.appendChild(a);
      };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;
        form.querySelectorAll('[required]').forEach(function (field) { if (!field.value.trim()) valid = false; });
        if (!valid) { setStatus('Por favor completa todos los campos obligatorios.', 'is-error'); return; }

        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });
        if (data.botcheck) { setStatus('Gracias — recibimos tu información. Te contactaremos pronto.', 'is-success'); form.reset(); return; }

        var endpoint = form.getAttribute('data-endpoint') || '';
        if (!endpoint || !data.access_key || data.access_key.indexOf('__') === 0) { showMailFallback(data); return; }
        data.name = data.nombre;
        data.message = data.mensaje;

        var label = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (res.ok && (res.d.success === true || res.d.success === 'true')) {
              setStatus('Gracias — recibimos tu información. Te contactaremos pronto.', 'is-success');
              form.reset();
            } else { throw new Error('send failed'); }
          })
          .catch(function () { showMailFallback(data); })
          .then(function () { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = label; } });
      });
    }
  });
})();
