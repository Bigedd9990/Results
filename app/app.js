const FEEDS = {
  fixtures: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTeEkmGfdMyY5ILwraF8-Axuzx8-U5IAgNO9NYzd9ua-ogBiwaMMKKAq7zpK2lBseMnJ4WAC-AQ1Glv/pub?gid=1887191572&single=true&output=csv'
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
    time: row[0] || 'Time TBC',
    pitch: row[1] || '',
    group: row[2] || '',
    home: row[3] || 'TBC',
    homeScore: row[4] || '',
    awayScore: row[5] || '',
    away: row[6] || 'TBC'
  })).filter(match => match.home !== 'TBC' || match.away !== 'TBC');
}

function isPlayed(match) {
  return match.homeScore !== '' && match.awayScore !== '';
}

function makeMatchCard(match, day) {
  const card = document.createElement('article');
  card.className = 'match-card';
  const time = document.createElement('div');
  time.className = 'match-time';
  time.textContent = match.time;
  const teams = document.createElement('div');
  teams.className = 'match-teams';
  const teamNames = document.createElement('strong');
  teamNames.textContent = `${match.home}  ·  ${match.away}`;
  const meta = document.createElement('small');
  const metaParts = [`Day ${day}`];
  if (match.pitch) metaParts.push(`Pitch ${match.pitch}`);
  if (match.group) metaParts.push(`Group ${match.group}`);
  meta.textContent = metaParts.join(' · ');
  teams.append(teamNames, meta);
  const score = document.createElement('span');
  score.className = isPlayed(match) ? 'match-score' : 'match-score upcoming';
  score.textContent = isPlayed(match) ? `${match.homeScore} – ${match.awayScore}` : 'UPCOMING';
  card.append(time, teams, score);
  return card;
}

function renderMatchList(target, matches, day) {
  target.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'match-empty';
    empty.textContent = 'No fixtures are available right now. Please try refreshing later.';
    target.append(empty);
    return;
  }
  matches.forEach(match => target.append(makeMatchCard(match, day)));
}

function updateViews() {
  renderMatchList(document.getElementById('matchList'), fixtureDays[selectedDay], selectedDay);
  document.getElementById('matchDayLabel').textContent = selectedDay === 1 ? 'Thursday 5 November 2026' : 'Friday 6 November 2026';
  const homeMatches = [...fixtureDays[1].map(match => ({ match, day: 1 })), ...fixtureDays[2].map(match => ({ match, day: 2 }))];
  const recent = homeMatches.filter(item => isPlayed(item.match)).slice(-3).reverse();
  const upcoming = homeMatches.filter(item => !isPlayed(item.match)).slice(0, 3);
  const homeSelection = recent.length ? recent : upcoming;
  const homeList = document.getElementById('homeMatches');
  homeList.replaceChildren();
  if (!homeSelection.length) {
    const empty = document.createElement('div');
    empty.className = 'match-empty';
    empty.textContent = 'Tournament fixtures will appear here when the results feed is available.';
    homeList.append(empty);
  } else {
    homeSelection.forEach(item => homeList.append(makeMatchCard(item.match, item.day)));
  }
}

function setFeedStatus(message, isError = false) {
  for (const id of ['matchFeedStatus', 'homeFeedStatus']) {
    const status = document.getElementById(id);
    status.textContent = message;
    status.classList.toggle('error', isError);
  }
}

async function loadFixtures() {
  setFeedStatus('Updating fixtures…');
  try {
    const url = `${FEEDS.fixtures}&_=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    const rows = parseCSV(await response.text());
    fixtureDays = { 1: rowsToFixtures(rows, 1), 2: rowsToFixtures(rows, 2) };
    localStorage.setItem(CACHE_KEY, JSON.stringify(fixtureDays));
    updateViews();
    const count = fixtureDays[1].length + fixtureDays[2].length;
    setFeedStatus(`Live tournament feed · ${count} fixtures · Updated ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date())} (Spain)`);
  } catch (error) {
    console.warn('Could not refresh tournament fixtures:', error);
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try { fixtureDays = JSON.parse(saved); updateViews(); } catch { /* Ignore unusable cached data. */ }
      setFeedStatus('Showing saved fixtures · Could not connect to the live feed', true);
    } else {
      updateViews();
      setFeedStatus('Could not load the live fixture feed. Check your connection and try again.', true);
    }
  }
}

function showScreen(name) {
  const valid = ['home', 'matches', 'events', 'club'].includes(name) ? name : 'home';
  document.querySelectorAll('.screen').forEach(section => { section.hidden = section.id !== `screen-${valid}`; });
  document.querySelectorAll('[data-screen-link]').forEach(link => {
    const active = link.dataset.screenLink === valid;
    link.classList.toggle('active', active);
    if (link.closest('.bottom-nav')) {
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-screen-link]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const screen = link.dataset.screenLink;
    history.replaceState(null, '', `#${screen}`);
    showScreen(screen);
  });
});

document.querySelectorAll('[data-match-day]').forEach(button => {
  button.addEventListener('click', () => {
    selectedDay = Number(button.dataset.matchDay);
    document.querySelectorAll('[data-match-day]').forEach(item => {
      const active = item === button;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-pressed', String(active));
    });
    updateViews();
  });
});
document.getElementById('refreshButton').addEventListener('click', loadFixtures);
window.addEventListener('hashchange', () => showScreen(location.hash.slice(1)));
showScreen(location.hash.slice(1));
loadFixtures();
setInterval(loadFixtures, 30000);

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  const button = document.getElementById('installButton');
  button.hidden = false;
  button.setAttribute('aria-label', 'Install Esquina Park Rangers app');
});
document.getElementById('installButton').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.getElementById('installButton').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Offline support could not be enabled:', error)));
}
