const FEEDS = {
  fixtures: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTeEkmGfdMyY5ILwraF8-Axuzx8-U5IAgNO9NYzd9ua-ogBiwaMMKKAq7zpK2lBseMnJ4WAC-AQ1Glv/pub?gid=1887191572&single=true&output=csv',
  website: './website-feed.json'
};
const CACHE_KEY = 'epr-tournament-fixtures-v1';
let selectedDay = 1;
let fixtureDays = { 1: [], 2: [] };
let installPrompt = null;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(value => value !== '')) rows.push(row);
  return rows;
}

function rowsToFixtures(rows, day) {
  const range = day === 1 ? rows.slice(1, 61) : rows.slice(64, 124);
  return range.map(row => ({
    time: row[0] || 'Time TBC', pitch: row[1] || '', group: row[2] || '',
    home: row[3] || 'TBC', homeScore: row[4] || '', awayScore: row[5] || '', away: row[6] || 'TBC'
  })).filter(match => match.home !== 'TBC' || match.away !== 'TBC');
}

function isPlayed(match) { return match.homeScore !== '' && match.awayScore !== ''; }

function makeMatchCard(match, day) {
  const card = document.createElement('article'); card.className = 'match-card';
  const time = document.createElement('div'); time.className = 'match-time'; time.textContent = match.time;
  const teams = document.createElement('div'); teams.className = 'match-teams';
  const teamNames = document.createElement('strong'); teamNames.textContent = `${match.home}  ·  ${match.away}`;
  const meta = document.createElement('small');
  const metaParts = [`Day ${day}`];
  if (match.pitch) metaParts.push(`Pitch ${match.pitch}`);
  if (match.group) metaParts.push(`Group ${match.group}`);
  meta.textContent = metaParts.join(' · '); teams.append(teamNames, meta);
  const score = document.createElement('span'); score.className = isPlayed(match) ? 'match-score' : 'match-score upcoming';
  score.textContent = isPlayed(match) ? `${match.homeScore} – ${match.awayScore}` : 'UPCOMING';
  card.append(time, teams, score); return card;
}

function renderMatchList(target, matches, day) {
  target.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('div'); empty.className = 'match-empty';
    empty.textContent = 'No fixtures are available right now. Please try refreshing later.'; target.append(empty); return;
  }
  matches.forEach(match => target.append(makeMatchCard(match, day)));
}

function updateViews() {
  renderMatchList(document.getElementById('matchList'), fixtureDays[selectedDay], selectedDay);
  document.getElementById('matchDayLabel').textContent = selectedDay === 1 ? 'Thursday 5 November 2026' : 'Friday 6 November 2026';
  const all = [...fixtureDays[1].map(match => ({ match, day: 1 })), ...fixtureDays[2].map(match => ({ match, day: 2 }))];
  const recent = all.filter(item => isPlayed(item.match)).slice(-3).reverse();
  const upcoming = all.filter(item => !isPlayed(item.match)).slice(0, 3);
  const homeList = document.getElementById('homeMatches'); homeList.replaceChildren();
  const selection = recent.length ? recent : upcoming;
  if (!selection.length) {
    const empty = document.createElement('div'); empty.className = 'match-empty';
    empty.textContent = 'Tournament fixtures will appear here when the results feed is available.'; homeList.append(empty);
  } else selection.forEach(item => homeList.append(makeMatchCard(item.match, item.day)));
}

function setFeedStatus(message, isError = false) {
  for (const id of ['matchFeedStatus', 'homeFeedStatus']) {
    const status = document.getElementById(id);
    if (status) { status.textContent = message; status.classList.toggle('error', isError); }
  }
}

async function loadFixtures() {
  setFeedStatus('Updating fixtures…');
  try {
    const response = await fetch(`${FEEDS.fixtures}&_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    fixtureDays = (() => { const rows = parseCSV(''); return { 1: [], 2: [] }; })();
    const rows = parseCSV(await response.text());
    fixtureDays = { 1: rowsToFixtures(rows, 1), 2: rowsToFixtures(rows, 2) };
    localStorage.setItem(CACHE_KEY, JSON.stringify(fixtureDays)); updateViews();
    const count = fixtureDays[1].length + fixtureDays[2].length;
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date());
    setFeedStatus(`Live tournament feed · ${count} fixtures · Updated ${time} (Spain)`);
  } catch (error) {
    console.warn('Could not refresh tournament fixtures:', error);
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try { fixtureDays = JSON.parse(saved); updateViews(); } catch { /* Ignore unusable cached data. */ }
      setFeedStatus('Showing saved fixtures · Could not connect to the live feed', true);
    } else { updateViews(); setFeedStatus('Could not load the live fixture feed. Check your connection and try again.', true); }
  }
}

function renderWebsiteFeed(data) {
  const list = document.getElementById('websiteNewsList');
  const status = document.getElementById('websiteFeedStatus');
  if (!list || !status) return;
  list.replaceChildren();
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'match-empty';
    empty.textContent = 'No website changes have been detected yet. Use the official links below to see the latest club information.';
    list.append(empty);
  } else items.forEach(item => {
    const card = document.createElement('article'); card.className = 'news-card';
    const label = document.createElement('span'); label.className = 'tag'; label.textContent = item.page || 'CLUB WEBSITE UPDATE';
    const title = document.createElement('h2'); title.textContent = item.title || 'Website page updated';
    const summary = document.createElement('p'); summary.textContent = item.summary || 'The official club website has changed.';
    const date = document.createElement('small'); date.className = 'news-date';
    date.textContent = item.detectedAt ? `Change detected ${new Date(item.detectedAt).toLocaleString()}` : '';
    const link = document.createElement('a'); link.className = 'secondary-link'; link.href = item.url || 'https://www.esquinawfc.com/';
    link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Read on the club website ↗';
    card.append(label, title, summary, date, link); list.append(card);
  });
  status.textContent = data.checkedAt ? `Last website check: ${new Date(data.checkedAt).toLocaleString()}` : 'The automated website checker has not run yet.';
}

async function loadWebsiteFeed() {
  const status = document.getElementById('websiteFeedStatus');
  if (!status) return;
  try {
    const response = await fetch(`${FEEDS.website}?_=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    renderWebsiteFeed(await response.json());
  } catch (error) {
    status.textContent = 'Website updates are temporarily unavailable. The official links below still open.';
    console.warn('Could not load the club website change feed:', error);
  }
}

function showScreen(name) {
  const valid = ['home', 'matches', 'events', 'club', 'news'].includes(name) ? name : 'home';
  document.querySelectorAll('.screen').forEach(section => { section.hidden = section.id !== `screen-${valid}`; });
  document.querySelectorAll('[data-screen-link]').forEach(link => {
    const active = link.dataset.screenLink === valid; link.classList.toggle('active', active);
    if (link.closest('.bottom-nav')) { if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-screen-link]').forEach(link => {
  link.addEventListener('click', event => { event.preventDefault(); const screen = link.dataset.screenLink; history.replaceState(null, '', `#${screen}`); showScreen(screen); });
});
document.querySelectorAll('[data-match-day]').forEach(button => {
  button.addEventListener('click', () => {
    selectedDay = Number(button.dataset.matchDay);
    document.querySelectorAll('[data-match-day]').forEach(item => { const active = item === button; item.classList.toggle('selected', active); item.setAttribute('aria-pressed', String(active)); });
    updateViews();
  });
});
document.getElementById('refreshButton')?.addEventListener('click', loadFixtures);
window.addEventListener('hashchange', () => showScreen(location.hash.slice(1)));
showScreen(location.hash.slice(1));
loadFixtures(); setInterval(loadFixtures, 30000);
loadWebsiteFeed(); setInterval(loadWebsiteFeed, 30 * 60 * 1000);

// Keep push setup modular so it can be configured after creating the club's
// notification provider account without exposing any server-side secrets.
const pushScript = document.createElement('script');
pushScript.src = './push-notifications.js';
pushScript.defer = true;
document.body.append(pushScript);

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event;
  const button = document.getElementById('installButton'); button.hidden = false;
  button.setAttribute('aria-label', 'Install Esquina Park Rangers app');
});
document.getElementById('installButton').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null;
  document.getElementById('installButton').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Offline support could not be enabled:', error)));
}
