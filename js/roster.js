document.addEventListener('DOMContentLoaded', () => {
  // --- Background rotator -- use images in ../images/ (stars.jpg, rocket.jpg, mars.jpg)
  (function setupBackgroundRotator(){
    // use images from images/rosterImages and shuffle them
    const images = [
      '../images/rosterImages/mars.jpg',
      '../images/rosterImages/moon.jpg',
      '../images/rosterImages/moonastronaut.jpg',
      '../images/rosterImages/moonastronaut2.jpg',
      '../images/rosterImages/rocket.jpg',
      '../images/rosterImages/stars.jpg'
    ];
    // simple Fisher-Yates shuffle
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }
    // respect prefers-reduced-motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!images.length || reduce) return;

    const rotator = document.createElement('div');
    rotator.className = 'bg-rotator';
    // two layers for crossfade
    const a = document.createElement('div'); a.className = 'bg-item bg-a';
    const b = document.createElement('div'); b.className = 'bg-item bg-b';
    rotator.appendChild(a); rotator.appendChild(b);
    document.body.insertBefore(rotator, document.body.firstChild);

    // preload images
    const cache = [];
    images.forEach(src => { const img = new Image(); img.src = src; cache.push(img); });

    let i = 0; // current index shown in 'a'
    a.style.backgroundImage = `url(${images[0]})`;
    b.style.opacity = '0';

    function showNext(){
      const next = (i + 1) % images.length;
      // place next in hidden layer
      const top = (a.style.opacity === '1' || a.style.opacity === '') ? b : a;
      top.style.backgroundImage = `url(${images[next]})`;
      // trigger crossfade
      requestAnimationFrame(() => {
        a.style.opacity = a === top ? '1' : '0';
        b.style.opacity = b === top ? '1' : '0';
      });
      i = next;
    }

    let timer = null;
    function start(){ if (timer) clearInterval(timer); timer = setInterval(showNext, 6000); }
    function stop(){ if (timer) clearInterval(timer); timer = null; }

    // start only on screens wide enough (avoid mobile perf issues)
    function updateAuto(){ if (window.innerWidth >= 520) start(); else stop(); }
    updateAuto();
    window.addEventListener('resize', () => { updateAuto(); });

    // pause on hover (optional)
    rotator.addEventListener('mouseenter', stop);
    rotator.addEventListener('mouseleave', start);
  })();

  const STORAGE_KEY = 'astronauts';
  const tableBody = document.querySelector('#rosterTable tbody');
  const crewSummary = document.getElementById('crewSummary');
  const crewCounters = document.getElementById('crewCounters');
  const filterInput = document.getElementById('rosterFilter');

  // current UI state
  let currentFilter = '';
  let sortKey = null; // one of 'name','role','destination','experience','email'
  let sortDir = 1; // 1 = asc, -1 = desc

  function readRoster() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '[]';
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      console.warn('Failed to read roster from localStorage', e);
      return [];
    }
  }

  function saveRoster(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
    } catch (e) {
      console.warn('Failed to save roster to localStorage', e);
    }
  }

  function renderSummary(arr) {
    const count = (arr || []).length;
    crewSummary.textContent = `Total Crew Members: ${count}`;
  }

  function renderCounters(arr, visibleCount) {
    if (!crewCounters) return;
    crewCounters.innerHTML = '';
    const total = (arr || []).length;

    const totalEl = document.createElement('div');
    totalEl.className = 'counter-total';
    totalEl.textContent = `Total Crew: ${total}` + (typeof visibleCount === 'number' && visibleCount !== total ? ` (showing ${visibleCount})` : '');
    crewCounters.appendChild(totalEl);

    // group by destination
    const map = {};
    (arr || []).forEach(item => {
      const d = (item.destination || 'Unknown').trim() || 'Unknown';
      map[d] = (map[d] || 0) + 1;
    });

    const destWrap = document.createElement('div');
    destWrap.className = 'dest-wrap';
    // sort destinations by count desc then name
    const entries = Object.entries(map).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    entries.forEach(([dest, cnt]) => {
      const badge = document.createElement('span');
      badge.className = 'dest-badge';
      const name = document.createElement('span'); name.className = 'dest-name'; name.textContent = dest;
      const c = document.createElement('span'); c.className = 'dest-count'; c.textContent = String(cnt);
      badge.appendChild(name);
      badge.appendChild(c);
      destWrap.appendChild(badge);
    });
    crewCounters.appendChild(destWrap);
  }
  

  function createCell(text, label) {
    const td = document.createElement('td');
    td.textContent = text == null ? '' : String(text);
    if (label) td.dataset.label = label;
    return td;
  }

  function renderRow(item, originalIndex) {
    const tr = document.createElement('tr');
    tr.dataset.originalIndex = originalIndex;

    tr.appendChild(createCell(item.name || '', 'Name'));
    tr.appendChild(createCell(item.role || '', 'Role'));
    tr.appendChild(createCell(item.destination || '', 'Destination'));
    tr.appendChild(createCell(item.experience || '', 'Experience'));

    // email cell with mailto
    const emailTd = document.createElement('td');
    if (item.email) {
      const a = document.createElement('a');
      a.href = `mailto:${item.email}`;
      a.textContent = item.email;
      a.rel = 'noopener';
      emailTd.appendChild(a);
    }
    emailTd.dataset.label = 'Email';
    tr.appendChild(emailTd);

    // actions
    const actionsTd = document.createElement('td');

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.dataset.index = originalIndex;
    actionsTd.appendChild(removeBtn);

    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.className = 'details-btn';
    detailsBtn.textContent = 'Details';
    detailsBtn.dataset.index = originalIndex;
    actionsTd.appendChild(detailsBtn);

    tr.appendChild(actionsTd);

    return { tr, item };
  }

  function renderRoster() {
    const arr = readRoster();
    tableBody.innerHTML = '';

    if (arr.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.opacity = '0.9';
      td.textContent = 'No crew members yet. Go to the signup page to add astronauts.';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      renderSummary(arr);
      
      return;
    }

    // build a view with original indices so filtering/sorting don't lose mapping
    let view = arr.map((item, idx) => ({ item, originalIndex: idx }));

    // filter
    if (currentFilter && currentFilter.trim()) {
      const q = currentFilter.trim().toLowerCase();
      view = view.filter(({ item }) => {
        return (item.name || '').toLowerCase().includes(q)
          || (item.role || '').toLowerCase().includes(q)
          || (item.destination || '').toLowerCase().includes(q)
          || (item.email || '').toLowerCase().includes(q)
          || (item.motto || '').toLowerCase().includes(q);
      });
    }

    // sort
    if (sortKey) {
      view.sort((a, b) => {
        const va = String(a.item[sortKey] || '').toLowerCase();
        const vb = String(b.item[sortKey] || '').toLowerCase();
        if (va < vb) return -1 * sortDir;
        if (va > vb) return 1 * sortDir;
        return 0;
      });
    }

    // render view
    view.forEach(({ item, originalIndex }) => {
      const { tr } = renderRow(item, originalIndex);
      tableBody.appendChild(tr);
    });
    renderSummary(arr);
    renderCounters(arr, view.length);
  }

  // Event delegation for remove / details
  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (Number.isNaN(idx)) return;

    if (btn.classList.contains('remove-btn')) {
      // confirm then remove
      const roster = readRoster();
      const person = roster[idx];
      if (!person) return;
      const ok = confirm(`Remove ${person.name || 'this person'} from the roster?`);
      if (!ok) return;
      roster.splice(idx, 1);
      saveRoster(roster);
      renderRoster();
      return;
    }

    if (btn.classList.contains('details-btn')) {
      const roster = readRoster();
      const person = roster[idx];
      if (!person) return;
      // simple details dialog
      const lines = [];
      lines.push(`Name: ${person.name || ''}`);
      lines.push(`Role: ${person.role || ''}`);
      lines.push(`Destination: ${person.destination || ''}`);
      lines.push(`Experience: ${person.experience || ''}`);
      if (person.snack) lines.push(`Fav snack: ${person.snack}`);
      if (person.motto) lines.push(`Motto: ${person.motto}`);
      if (person.email) lines.push(`Email: ${person.email}`);
      alert(lines.join('\n'));
      return;
    }
  });

  // header sorting: click a header to sort by that column
  (function setupSortingOnHeaders(){
    const thead = document.querySelector('#rosterTable thead');
    if (!thead) return;
    const map = ['name','role','destination','experience','email'];
    thead.addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      // determine column index
      const cells = Array.from(th.parentNode.children);
      const colIndex = cells.indexOf(th);
      const key = map[colIndex];
      if (!key) return;
      if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
      renderRoster();
    });
  })();

  // filtering input
  if (filterInput) {
    let ftimer = null;
    filterInput.addEventListener('input', (e) => {
      const v = e.target.value || '';
      if (ftimer) clearTimeout(ftimer);
      ftimer = setTimeout(() => { currentFilter = v; renderRoster(); ftimer = null; }, 200);
    });
  }

  // optional: clear all button (not present in markup) — create and insert near footer
  const footer = document.querySelector('footer');
  if (footer) {
    const clearAll = document.createElement('button');
    clearAll.type = 'button';
    clearAll.textContent = 'Clear All';
    clearAll.style.marginLeft = '0.5rem';
    clearAll.addEventListener('click', () => {
      const ok = confirm('Remove all crew members? This cannot be undone.');
      if (!ok) return;
      saveRoster([]);
      renderRoster();
    });
    footer.appendChild(clearAll);
  }

  // initial render
  renderRoster();
});
