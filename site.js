(() => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...document.querySelectorAll('.reveal')];
  let observer;
  const revealAll = () => {
    observer?.disconnect();
    document.body.classList.remove('motion-ready');
    items.forEach(item => item.classList.add('is-visible'));
  };
  if (!media.matches && 'IntersectionObserver' in window) {
    try {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0 });
      items.forEach(item => observer.observe(item));
      document.body.classList.add('motion-ready');
    } catch { revealAll(); }
  }
  media.addEventListener?.('change', event => { if (event.matches) revealAll(); });

  const revealAnchor = (id) => {
    if (!id) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(id)); } catch { return; }
    if (target?.classList.contains('reveal')) target.classList.add('is-visible');
    target?.querySelectorAll('.reveal').forEach(item => item.classList.add('is-visible'));
  };

  const bar = document.querySelector('.scroll-progress');
  let pending = false;
  function updateProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? Math.max(0, Math.min(1, window.scrollY / total)) : 0;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    pending = false;
  }
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  window.addEventListener('load', updateProgress);
  window.addEventListener('pageshow', updateProgress);
  document.fonts?.ready.then(updateProgress);
  updateProgress();

  // Expose for hash module
  window.__royRevealAnchor = revealAnchor;
})();

(() => {
  const gallery = document.getElementById('merch-gallery');
  const previous = document.getElementById('merch-prev');
  const next = document.getElementById('merch-next');
  const controls = document.querySelector('.merch-controls');
  if (!gallery || !previous || !next || !controls) return;
  controls.hidden = false;
  const position = document.querySelector('.gallery-position');
  const cards = [...gallery.querySelectorAll('.merch-card')];
  let framePending = false;
  const update = () => {
    framePending = false;
    const bounds = gallery.getBoundingClientRect();
    const visible = cards.map((card, index) => ({rect: card.getBoundingClientRect(), index}))
      .filter(({rect}) => rect.right > bounds.left + 2 && rect.left < bounds.right - 2);
    const first = visible[0]?.index ?? 0;
    const last = visible[visible.length - 1]?.index ?? first;
    const label = index => String(index + 1).padStart(2, '0');
    const value = `${label(first)}${last > first ? '–' + label(last) : ''} / ${String(cards.length).padStart(2, '0')}`;
    if (position && position.textContent !== value) position.textContent = value;
    previous.disabled = gallery.scrollLeft <= 2;
    next.disabled = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 2;
  };
  const scheduleUpdate = () => {
    if (!framePending) { framePending = true; requestAnimationFrame(update); }
  };
  const move = direction => {
    const card = gallery.querySelector('.merch-card');
    if (!card) return;
    const gap = parseFloat(getComputedStyle(gallery).gap) || 0;
    gallery.scrollBy({left: direction * (card.getBoundingClientRect().width + gap), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  gallery.addEventListener('keydown', event => {
    if (event.target !== gallery || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') move(event.key === 'ArrowLeft' ? -1 : 1);
    else gallery.scrollTo({left: event.key === 'Home' ? 0 : gallery.scrollWidth, behavior: 'auto'});
  });
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  gallery.addEventListener('scroll', scheduleUpdate, {passive:true});
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  document.fonts?.ready.then(update);
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(gallery);
  update();
})();

/* ========== P0: Mobile navigation ========== */
(() => {
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('site-nav');
  const toggle = document.getElementById('nav-toggle');
  const closeBtn = document.getElementById('nav-close');
  const backdrop = document.getElementById('nav-backdrop');
  if (!header || !nav || !toggle) return;

  const mq = window.matchMedia('(max-width: 1023px)');
  let open = false;

  const setOpen = (next) => {
    open = next;
    nav.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-open', open);
    if (open) {
      closeBtn?.focus();
    }
  };

  const close = () => { if (open) setOpen(false); };
  const openMenu = () => { if (mq.matches) setOpen(true); };

  toggle.addEventListener('click', () => {
    if (!mq.matches) return;
    setOpen(!open);
  });
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  nav.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => { close(); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  const onMq = () => { if (!mq.matches) close(); };
  mq.addEventListener?.('change', onMq);
  window.addEventListener('orientationchange', close);

  // Active section underline (desktop + mobile list)
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = [...document.querySelectorAll('main section[id]')].filter(section =>
    links.some(link => link.hash === '#' + section.id)
  );
  let scheduled = false;
  let hashLockUntil = 0;

  const updateActive = () => {
    scheduled = false;
    if (Date.now() < hashLockUntil) return;
    const threshold = header.getBoundingClientRect().height + 80;
    let active = null;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    });
    links.forEach(link => {
      if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateActive); }
  }, { passive: true });

  const measure = () => {
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    updateActive();
  };
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  window.addEventListener('pageshow', measure);
  document.fonts?.ready.then(measure);
  measure();

  // Allow hash module to debounce active-section updates
  window.__royLockNavActive = (ms = 800) => {
    hashLockUntil = Date.now() + ms;
  };
})();

/* ========== P0: Hash aliases + scroll-to-hash ========== */
(() => {
  const ALIASES = {
    cloud: 'music',
    contact: 'bookings' // legacy id used before P0
  };
  const KNOWN = new Set(['home', 'about', 'music', 'tour', 'bookings', 'services', 'merchandise', 'presskit']);

  const resolveHash = (raw) => {
    if (!raw) return null;
    let id = raw;
    try { id = decodeURIComponent(raw); } catch { /* keep raw */ }
    id = id.replace(/^#/, '');
    if (ALIASES[id]) id = ALIASES[id];
    if (!KNOWN.has(id)) return null;
    if (!document.getElementById(id)) return null;
    return id;
  };

  const scrollToId = (id, { smooth = true } = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    window.__royRevealAnchor?.(id);
    window.__royLockNavActive?.(900);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: (!smooth || reduce) ? 'auto' : 'smooth', block: 'start' });
    // Sync URL to canonical id when alias was used
    const canonical = '#' + id;
    if (location.hash !== canonical) {
      history.replaceState(null, '', canonical);
    }
  };

  const handleHash = ({ smooth = true } = {}) => {
    const raw = location.hash.slice(1);
    if (!raw) return;
    const id = resolveHash(raw);
    if (!id) {
      // Unknown → top, no error; clear bad hash quietly
      window.__royLockNavActive?.(400);
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      return;
    }
    scrollToId(id, { smooth });
  };

  // Intercept in-page clicks that use aliases
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const id = resolveHash(href);
    if (!id) return;
    // Let browser handle known direct ids normally except aliases / bookings remap
    const raw = href.slice(1);
    if (ALIASES[raw] || raw !== id) {
      e.preventDefault();
      history.pushState(null, '', '#' + id);
      scrollToId(id, { smooth: true });
    }
  });

  window.addEventListener('hashchange', () => handleHash({ smooth: true }));
  window.addEventListener('popstate', () => handleHash({ smooth: true }));

  // On load: scroll-to-hash once (after layout)
  const boot = () => handleHash({ smooth: false });
  if (document.readyState === 'complete') {
    requestAnimationFrame(boot);
  } else {
    window.addEventListener('load', () => requestAnimationFrame(boot), { once: true });
  }
})();

/* ========== P0: Shared audio engine + hero / music UI ========== */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const heroWrap = document.getElementById('hero-audio');
  const heroBtn = document.getElementById('hero-mute');
  const musicPlayer = document.getElementById('music-player');
  const musicToggle = document.getElementById('music-player-toggle');
  const musicTitle = document.getElementById('music-player-title');
  const musicSeek = document.getElementById('music-player-seek');
  const musicFill = document.getElementById('music-player-fill');
  const musicTime = document.getElementById('music-player-time');
  const returnCard = document.getElementById('return-card');

  const HERO_SRC = heroWrap?.dataset.audioSrc || 'assets/audio/hero-loop.mp3';
  const TEASER_SRC = musicPlayer?.dataset.audioSrc || returnCard?.dataset.audioSrc || 'assets/audio/the-return-teaser.mp3';

  /** @type {'locked'|'muted'|'playing'} */
  let heroState = 'locked';
  /** @type {'idle'|'playing'|'paused'|'ended'} */
  let musicState = 'idle';

  let heroAudio = null;
  let musicAudio = null;
  let heroAvailable = false;
  let musicAvailable = false;
  let unlocked = false;

  const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const probe = (url) => new Promise((resolve) => {
    const a = new Audio();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      a.removeAttribute('src');
      a.load?.();
      resolve(ok);
    };
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', () => done(true), { once: true });
    a.addEventListener('canplaythrough', () => done(true), { once: true });
    a.addEventListener('error', () => done(false), { once: true });
    a.src = url;
    // Timeout: treat as missing
    setTimeout(() => done(false), 2500);
  });

  const ensureHero = () => {
    if (heroAudio) return heroAudio;
    heroAudio = new Audio(HERO_SRC);
    heroAudio.loop = true;
    heroAudio.preload = 'metadata';
    heroAudio.muted = true;
    return heroAudio;
  };

  const ensureMusic = () => {
    if (musicAudio) return musicAudio;
    musicAudio = new Audio(TEASER_SRC);
    musicAudio.loop = false;
    musicAudio.preload = 'metadata';
    musicAudio.addEventListener('timeupdate', syncMusicUI);
    musicAudio.addEventListener('loadedmetadata', syncMusicUI);
    musicAudio.addEventListener('ended', () => {
      musicState = 'ended';
      syncMusicUI();
      syncCard();
    });
    musicAudio.addEventListener('play', () => {
      musicState = 'playing';
      syncMusicUI();
      syncCard();
    });
    musicAudio.addEventListener('pause', () => {
      if (musicState !== 'ended') musicState = 'paused';
      syncMusicUI();
      syncCard();
    });
    return musicAudio;
  };

  const pauseHero = () => {
    if (!heroAudio) return;
    heroAudio.pause();
    if (heroState === 'playing') heroState = 'muted';
    syncHeroUI();
  };

  const pauseMusic = () => {
    if (!musicAudio) return;
    musicAudio.pause();
  };

  const syncHeroUI = () => {
    if (!heroWrap || !heroBtn) return;
    const playing = heroState === 'playing' && !heroAudio?.paused;
    heroBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
    heroBtn.setAttribute('aria-label', playing ? 'Mute sound' : 'Unmute sound');
    const label = heroBtn.querySelector('.hero-mute-label');
    if (label) label.textContent = playing ? 'Sound on' : (unlocked ? 'Muted' : 'Tap for sound');
    heroWrap.classList.toggle('is-playing', playing && !reduceMotion.matches);
  };

  const syncMusicUI = () => {
    if (!musicPlayer) return;
    const a = musicAudio;
    const dur = a?.duration || 0;
    const cur = a?.currentTime || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (musicFill) musicFill.style.width = `${pct}%`;
    if (musicSeek && document.activeElement !== musicSeek) musicSeek.value = String(pct);
    if (musicTime) {
      musicTime.innerHTML = `<time datetime="PT${Math.floor(cur)}S">${fmt(cur)}</time> / <time datetime="PT${Math.floor(dur || 0)}S">${fmt(dur)}</time>`;
    }
    const playing = musicState === 'playing' && a && !a.paused;
    musicPlayer.classList.toggle('is-playing', !!playing);
    if (musicToggle) musicToggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };

  const syncCard = () => {
    if (!returnCard) return;
    const playing = musicState === 'playing' && musicAudio && !musicAudio.paused;
    returnCard.classList.toggle('is-playing', !!playing);
    returnCard.setAttribute('aria-label', playing ? 'Pause THE RETURN. teaser' : 'Play THE RETURN. teaser');
  };

  const playHeroUnmuted = async () => {
    if (!heroAvailable) return;
    pauseMusic();
    const a = ensureHero();
    a.muted = false;
    a.volume = 1;
    try {
      await a.play();
      unlocked = true;
      heroState = 'playing';
    } catch {
      heroState = 'muted';
    }
    syncHeroUI();
  };

  const muteHero = () => {
    if (!heroAudio) { heroState = 'muted'; syncHeroUI(); return; }
    heroAudio.muted = true;
    heroAudio.pause();
    heroState = 'muted';
    syncHeroUI();
  };

  const playMusic = async () => {
    if (!musicAvailable) return false;
    pauseHero();
    const a = ensureMusic();
    a.muted = false;
    try {
      await a.play();
      unlocked = true;
      musicState = 'playing';
      syncMusicUI();
      syncCard();
      return true;
    } catch {
      musicState = 'paused';
      syncMusicUI();
      syncCard();
      return false;
    }
  };

  const toggleMusic = async () => {
    if (!musicAvailable) return;
    const a = ensureMusic();
    if (!a.paused && musicState === 'playing') {
      a.pause();
      return;
    }
    if (musicState === 'ended') a.currentTime = 0;
    await playMusic();
  };

  // Wire controls
  heroBtn?.addEventListener('click', async () => {
    if (!heroAvailable) return;
    if (heroState === 'playing' && heroAudio && !heroAudio.paused) muteHero();
    else await playHeroUnmuted();
  });

  musicToggle?.addEventListener('click', () => { toggleMusic(); });

  musicSeek?.addEventListener('input', () => {
    if (!musicAudio || !Number.isFinite(musicAudio.duration)) return;
    const pct = parseFloat(musicSeek.value) || 0;
    musicAudio.currentTime = (pct / 100) * musicAudio.duration;
    if (musicFill) musicFill.style.width = `${pct}%`;
  });

  returnCard?.addEventListener('click', async () => {
    if (!musicAvailable) {
      const href = returnCard.dataset.fallbackHref;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (musicTitle && returnCard.dataset.trackTitle) {
      musicTitle.textContent = returnCard.dataset.trackTitle;
    }
    if (!musicPlayer.hidden) {
      // already visible
    } else {
      musicPlayer.hidden = false;
    }
    await toggleMusic();
  });

  // Tab blur → pause everything
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseHero();
      pauseMusic();
    }
  });

  // Probe assets; show / hide UI
  (async () => {
    const [heroOk, musicOk] = await Promise.all([probe(HERO_SRC), probe(TEASER_SRC)]);
    heroAvailable = heroOk;
    musicAvailable = musicOk;

    if (heroWrap) {
      if (heroOk) {
        heroWrap.hidden = false;
        ensureHero();
        // Attempt muted autoplay (may fail — fine; stays locked until gesture)
        try {
          heroAudio.muted = true;
          await heroAudio.play();
          heroState = 'muted';
          unlocked = false;
        } catch {
          heroState = 'locked';
        }
        syncHeroUI();
      } else {
        heroWrap.hidden = true;
      }
    }

    if (musicPlayer) {
      if (musicOk) {
        musicPlayer.hidden = false;
        ensureMusic();
        syncMusicUI();
      } else {
        musicPlayer.hidden = true;
      }
    }

    // Card stays visual always; play affordance only meaningful when audio exists
    if (returnCard && !musicOk) {
      returnCard.classList.add('is-fallback');
    }
  })();
})();
