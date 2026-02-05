(function () {
  "use strict";

  /* ——— Звёздное небо: несколько слоёв + падающие звёзды + параллакс от мыши ——— */
  var canvas = document.getElementById("starfield");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var layers = [];
  var twinklePhase = 0;
  var mouseX = 0;
  var mouseY = 0;
  var centerX = 0;
  var centerY = 0;

  // Три слоя: далёкие (мелкие), средние, близкие (крупные и яркие)
  var LAYER_CONFIG = [
    { count: 250, rMin: 0.3, rMax: 0.8, opacityMin: 0.2, opacityMax: 0.6, speed: 0.5, parallax: 0.03 },
    { count: 120, rMin: 0.8, rMax: 1.8, opacityMin: 0.4, opacityMax: 0.9, speed: 1, parallax: 0.08 },
    { count: 50, rMin: 1.2, rMax: 2.5, opacityMin: 0.6, opacityMax: 1, speed: 1.5, parallax: 0.15 }
  ];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    initStarLayers();
    shootingStars = [];
  }

  function initStarLayers() {
    layers = [];
    LAYER_CONFIG.forEach(function (cfg, layerIndex) {
      var stars = [];
      for (var i = 0; i < cfg.count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin),
          opacity: cfg.opacityMin + Math.random() * (cfg.opacityMax - cfg.opacityMin),
          phase: Math.random() * Math.PI * 2,
          speed: cfg.speed,
          parallax: cfg.parallax
        });
      }
      layers.push(stars);
    });
  }

  // Падающие звёзды
  var shootingStars = [];
  var lastShooting = 0;
  var SHOOT_INTERVAL_MIN = 1500;
  var SHOOT_INTERVAL_MAX = 4500;

  function maybeAddShootingStar(now) {
    if (now - lastShooting < SHOOT_INTERVAL_MIN + Math.random() * (SHOOT_INTERVAL_MAX - SHOOT_INTERVAL_MIN)) return;
    lastShooting = now;
    var angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.4;
    var len = 80 + Math.random() * 120;
    var x = Math.random() * (canvas.width + 100) - 50;
    var y = -20 - Math.random() * 100;
    shootingStars.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * 18,
      vy: Math.sin(angle) * 18,
      len: len,
      life: 1
    });
  }

  function drawStars(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    twinklePhase += 0.015;
    var dx = (mouseX - centerX) * 0.002;
    var dy = (mouseY - centerY) * 0.002;

    // Обычные звёзды по слоям
    layers.forEach(function (stars) {
      stars.forEach(function (s, i) {
        var px = s.parallax ? s.x + dx * s.parallax * 400 : s.x;
        var py = s.parallax ? s.y + dy * s.parallax * 400 : s.y;
        var twinkle = 0.5 + 0.5 * Math.sin(twinklePhase * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, " + (s.opacity * twinkle) + ")";
        ctx.fill();
      });
    });

    // Падающие звёзды
    maybeAddShootingStar(time);
    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var ss = shootingStars[j];
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.025;
      if (ss.life <= 0) {
        shootingStars.splice(j, 1);
        continue;
      }
      var alpha = ss.life;
      var trail = ss.len * ss.life;
      var tx = ss.x - Math.cos(-Math.PI / 4) * trail;
      var ty = ss.y - Math.sin(-Math.PI / 4) * trail;
      var grad = ctx.createLinearGradient(ss.x, ss.y, tx, ty);
      grad.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
      grad.addColorStop(1, "rgba(200, 220, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
      ctx.fill();
    }
  }

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function loop(time) {
    drawStars(time || 0);
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  loop(0);

  /* ——— Искры при клике ——— */
  document.body.addEventListener("click", function (e) {
    var x = e.clientX;
    var y = e.clientY;
    var sparks = 8 + Math.floor(Math.random() * 5);
    for (var s = 0; s < sparks; s++) {
      var angle = (Math.PI * 2 * s) / sparks + Math.random() * 0.5;
      var dist = 15 + Math.random() * 25;
      var dx = Math.cos(angle) * dist * 2;
      var dy = Math.sin(angle) * dist * 2;
      var el = document.createElement("span");
      el.className = "spark";
      el.style.cssText = "left:" + x + "px;top:" + y + "px;--dx:" + dx + "px;--dy:" + dy + "px;--delay:" + (Math.random() * 0.1) + "s";
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 700);
    }
  });

  /* ——— Летающая ракета ——— */
  var rocket = document.getElementById("rocket");
  if (rocket) {
    var rocketInterval;
    function flyRocket() {
      rocket.classList.remove("rocket-fly");
      rocket.offsetHeight;
      rocket.style.setProperty("--rocket-start-x", (Math.random() * 20 - 10) + "%");
      rocket.style.setProperty("--rocket-end-x", (Math.random() * 20 - 10) + "%");
      setTimeout(function () {
        rocket.classList.add("rocket-fly");
      }, 50);
    }
    rocketInterval = setInterval(flyRocket, 22000);
    setTimeout(flyRocket, 4000);
  }

  /* ——— Появление секций при прокрутке (с задержкой по очереди) ——— */
  var sections = document.querySelectorAll("main section");
  var observerOptions = { root: null, rootMargin: "0px 0px -80px 0px", threshold: 0.1 };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        var idx = Array.prototype.indexOf.call(sections, entry.target);
        entry.target.style.setProperty("--reveal-delay", (idx * 0.12) + "s");
      }
    });
  }, observerOptions);

  for (var k = 0; k < sections.length; k++) {
    sections[k].classList.add("reveal");
    sections[k].style.setProperty("--reveal-delay", (k * 0.12) + "s");
    observer.observe(sections[k]);
  }

  /* ——— Параллакс фона при скролле ——— */
  var pageWrap = document.getElementById("page-wrap");
  if (pageWrap) {
    window.addEventListener("scroll", function () {
      var scrolled = window.pageYOffset;
      pageWrap.style.setProperty("--scroll-offset", scrolled * 0.2 + "px");
    }, { passive: true });
  }

  /* ——— Активная ссылка в навигации ——— */
  var navLinks = document.querySelectorAll("nav a");
  function updateActiveLink() {
    var fromTop = window.pageYOffset + 120;
    navLinks.forEach(function (link) {
      var id = link.getAttribute("href");
      if (id && id.charAt(0) === "#") {
        var section = document.querySelector(id);
        if (section) {
          var top = section.offsetTop;
          var height = section.offsetHeight;
          if (fromTop >= top && fromTop < top + height) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        }
      }
    });
  }
  window.addEventListener("scroll", updateActiveLink, { passive: true });
  window.addEventListener("load", updateActiveLink);

  /* ——— Планеты: лёгкое покачивание при наведении (добавляем класс) ——— */
  var planets = document.querySelectorAll(".planet");
  planets.forEach(function (p) {
    p.addEventListener("mouseenter", function () { p.classList.add("planet-hover"); });
    p.addEventListener("mouseleave", function () { p.classList.remove("planet-hover"); });
  });
})();
