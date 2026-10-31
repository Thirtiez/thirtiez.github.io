(function () {
    'use strict';

    const CATEGORY_LABELS = { professional: 'Professional', personal: 'Personal', university: 'University', jam: 'Game Jam' };
    const TAG_FILTERS = ['XR', 'Mobile', 'PC', 'Web'];

    const featuredGrid = document.getElementById('featured-grid');
    const moreGrid = document.getElementById('more-grid');
    const filtersEl = document.getElementById('filters');
    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body');

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const initials = (title) => title.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    /* ======= Project cards ======= */

    function media(p, loading) {
        if (p.image) {
            return `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || '')}" loading="${loading}" decoding="async">`;
        }
        return `<div class="card-placeholder" aria-hidden="true">${esc(initials(p.title))}</div>`;
    }

    function badges(p) {
        const list = [];
        if (p.live) list.push('<span class="badge badge-live">Live</span>');
        if (p.wip) list.push('<span class="badge">WIP</span>');
        if (p.aiAssisted) list.push('<span class="badge badge-ai">AI-assisted</span>');
        return list.length ? `<div class="badges">${list.join('')}</div>` : '';
    }

    // "Miniclip · Professional", but just "Personal project" when the org already says it
    function orgLine(p) {
        const category = CATEGORY_LABELS[p.category];
        return p.org.toLowerCase().includes(category.toLowerCase()) ? p.org : `${p.org} · ${category}`;
    }

    function card(p, loading) {
        const tags = [...p.tech.slice(0, 2), ...p.platforms].map((t) => `<li>${esc(t)}</li>`).join('');
        return `
            <button class="card" type="button" data-slug="${esc(p.slug)}" aria-haspopup="dialog">
                <div class="card-media">${media(p, loading)}${badges(p)}</div>
                <div class="card-body">
                    <span class="card-org">${esc(p.org)}</span>
                    <h3 class="card-title">${esc(p.title)}${p.subtitle ? ` <small>(${esc(p.subtitle)})</small>` : ''}</h3>
                    <p class="card-summary">${esc(p.summary)}</p>
                    <ul class="tags" aria-label="Technologies and platforms">${tags}</ul>
                </div>
            </button>`;
    }

    const featured = PROJECTS.filter((p) => p.featured);
    const more = PROJECTS.filter((p) => !p.featured);

    featuredGrid.innerHTML = featured.map((p, i) => card(p, i < 3 ? 'eager' : 'lazy')).join('');

    /* ======= Filters ======= */

    let activeFilter = 'all';

    function matches(p, filter) {
        if (filter === 'all') return true;
        if (filter === 'ai') return !!p.aiAssisted;
        if (filter.startsWith('cat:')) return p.category === filter.slice(4);
        return (p.tags || []).includes(filter.slice(4));
    }

    function renderMore() {
        const list = more.filter((p) => matches(p, activeFilter));
        moreGrid.innerHTML = list.length
            ? list.map((p) => card(p, 'lazy')).join('')
            : '<p class="empty">Nothing here yet.</p>';
    }

    function renderFilters() {
        const chip = (value, label) => {
            const count = more.filter((p) => matches(p, value)).length;
            if (!count) return '';
            return `<button class="chip" type="button" data-filter="${value}" aria-pressed="${value === activeFilter}">${label}</button>`;
        };
        const categories = Object.entries(CATEGORY_LABELS).map(([k, v]) => chip('cat:' + k, v)).join('');
        const tags = TAG_FILTERS.map((t) => chip('tag:' + t, t)).join('');
        const sep = '<span class="chip-sep" aria-hidden="true"></span>';
        filtersEl.innerHTML = chip('all', 'All') + categories + sep + tags + sep + chip('ai', 'AI-assisted');
    }

    filtersEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        activeFilter = btn.dataset.filter;
        filtersEl.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === btn));
        renderMore();
    });

    renderFilters();
    renderMore();

    // Links elsewhere on the page can preselect a filter, e.g. data-filter-link="ai"
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-filter-link]');
        const chip = link && filtersEl.querySelector(`[data-filter="${link.dataset.filterLink}"]`);
        if (!chip) return;
        e.preventDefault();
        chip.click();
        document.querySelector('.more-head').scrollIntoView();
    });

    /* ======= Project modal ======= */

    let lastFocus = null;

    function openProject(slug, fromHash) {
        const p = PROJECTS.find((x) => x.slug === slug);
        if (!p) return;

        const details = (p.details || []).map((d) => `<p>${esc(d)}</p>`).join('');
        const list = (items) => `<ul class="tags">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
        const links = p.links.map((l) =>
            `<a class="btn btn-ghost" href="${esc(l.url)}" target="_blank" rel="noopener"><svg class="icon"><use href="#i-external"/></svg>${esc(l.label)}</a>`
        ).join('');

        modalBody.innerHTML = `
            ${p.image ? `<div class="modal-media"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || '')}"></div>` : ''}
            <div class="modal-content">
                ${badges(p)}
                <h2 id="modal-title">${esc(p.title)}${p.subtitle ? ` <small>(${esc(p.subtitle)})</small>` : ''}</h2>
                <p class="modal-org">${esc(orgLine(p))}</p>
                <p class="modal-summary">${esc(p.summary)}</p>
                ${details}
                ${p.role ? `<h3>My role</h3><p>${esc(p.role)}</p>` : ''}
                <div class="modal-meta">
                    <div><h3>Tech</h3>${list(p.tech)}</div>
                    <div><h3>Platforms</h3>${list(p.platforms)}</div>
                </div>
                ${links ? `<div class="modal-links">${links}</div>` : ''}
            </div>`;

        if (!fromHash) {
            lastFocus = document.activeElement;
            history.pushState(null, '', '#project-' + slug);
        }
        if (!modal.open) modal.showModal();
        modal.scrollTop = 0;
    }

    function closeProject() {
        if (modal.open) modal.close();
    }

    modal.addEventListener('close', () => {
        // Drop the #project- hash in place; history.back() here is async and can race a quick reopen
        if (location.hash.startsWith('#project-')) {
            history.replaceState(null, '', location.pathname + location.search);
        }
        if (lastFocus) lastFocus.focus();
    });

    modal.querySelector('.modal-close').addEventListener('click', closeProject);

    // Click on the backdrop (outside the dialog box) closes it
    modal.addEventListener('click', (e) => {
        const r = modal.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) closeProject();
    });

    document.addEventListener('click', (e) => {
        const c = e.target.closest('.card');
        if (c) openProject(c.dataset.slug);
    });

    function syncHash() {
        const m = location.hash.match(/^#project-(.+)$/);
        if (m) openProject(m[1], true);
        else closeProject();
    }
    window.addEventListener('popstate', syncHash);
    syncHash();

    /* ======= Nav ======= */

    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.getElementById('nav-links');

    toggle.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    navLinks.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            navLinks.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Highlight the nav link of the section in view
    const sections = ['work', 'about', 'ai', 'experience', 'contact'].map((id) => document.getElementById(id));
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (!en.isIntersecting) return;
            navLinks.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => s && spy.observe(s));

    /* ======= Contact ======= */

    const copyBtn = document.getElementById('copy-email');
    copyBtn.addEventListener('click', async () => {
        const label = copyBtn.querySelector('span');
        try {
            await navigator.clipboard.writeText(copyBtn.dataset.email);
            label.textContent = 'Copied!';
        } catch {
            label.textContent = copyBtn.dataset.email;
        }
        setTimeout(() => { label.textContent = 'Copy email'; }, 2000);
    });

    document.getElementById('year').textContent = new Date().getFullYear();
})();
