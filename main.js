const GH_USER = 'programmingwithprince';
const CACHE_KEY = 'gh_telemetry_cache';
const MIN_STARS = 2;

function appendSysLog(tag, message) {
  const feed = document.getElementById('log-feed');
  if (!feed) return;
  const entry = document.createElement('div');
  entry.className = 'log-line';
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  entry.innerHTML = `<span class="log-ts">[${timeStr}]</span> <span class="log-msg"><span class="log-highlight">${tag}:</span> ${message}</span>`;
  feed.appendChild(entry);
}

function tickClock() {
  const clockEl = document.getElementById('system-time');
  if (!clockEl) return;
  const now = new Date();
  const timeParts = now.toUTCString().split(' ');
  const utcFormatted = timeParts[4] || '00:00:00';
  clockEl.textContent = `UTC: ${utcFormatted}`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function applyUserStats(data) {
  if (!data) return;
  if (data.avatar_url) {
    const avatarEl = document.getElementById('gh-avatar');
    if (avatarEl) avatarEl.src = data.avatar_url;
  }
  if (data.name) {
    const nameEl = document.getElementById('gh-name');
    if (nameEl) nameEl.textContent = data.name;
  }
  if (typeof data.public_repos !== 'undefined') {
    const repoEl = document.getElementById('gh-repos');
    if (repoEl) repoEl.textContent = data.public_repos;
  }
  if (typeof data.followers !== 'undefined') {
    const followEl = document.getElementById('gh-followers');
    if (followEl) followEl.textContent = data.followers;
  }
  if (typeof data.following !== 'undefined') {
    const followingEl = document.getElementById('gh-following');
    if (followingEl) followingEl.textContent = data.following;
  }
}

function createCardHTML(repo) {
  const desc = repo.description || 'No system description logged for this repository.';
  const lang = repo.language || 'Multi-Stack';
  const stars = repo.stargazers_count ?? 0;

  return `
    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card">
      <div>
        <div class="repo-card-header">
          <span class="repo-name">${escapeHTML(repo.name)}</span>
          <span class="repo-stars-badge">&starf; ${stars}</span>
        </div>
        <p class="repo-desc">${escapeHTML(desc)}</p>
      </div>
      <div class="repo-card-footer">
        <span class="repo-lang"><span class="lang-indicator"></span>${escapeHTML(lang)}</span>
        <span class="repo-link-action">INSPECT &nearr;</span>
      </div>
    </a>
  `;
}

function renderCarousel(repos) {
  const track = document.getElementById('repos-track');
  if (!track) return;

  if (!repos || repos.length === 0) {
    track.innerHTML = `
      <div class="repo-card skeleton">
        [NO REPOSITORIES CURRENTLY MEET &ge; ${MIN_STARS} &starf; THRESHOLD]
      </div>`;
    return;
  }

  const cardsHTML = repos.map(createCardHTML).join('');
  track.innerHTML = cardsHTML + cardsHTML;

  const totalItems = repos.length * 2;
  const computedDuration = Math.max(22, totalItems * 3.5);
  track.style.animationDuration = `${computedDuration}s`;
}

function renderStaticFallback() {
  const staticRepos = [
    {
      name: 'Keep-my-Screen-Wake-Up',
      stargazers_count: 5,
      description: 'A lightweight focus utility with a full-screen clock that keeps your display awake using the Screen Wake Lock API.',
      language: 'JavaScript',
      html_url: 'https://github.com/programmingwithprince/Keep-my-Screen-Wake-Up'
    },
    {
      name: 'File-Sharing',
      stargazers_count: 3,
      description: 'Network file transfer engine running on Python/Flask for direct peer transmission across local devices.',
      language: 'Python',
      html_url: 'https://github.com/programmingwithprince/File-Sharing'
    },
    {
      name: 'height-percentile',
      stargazers_count: 2,
      description: 'Anthropometric percentile evaluation tool based on CDC and WHO statistical growth distribution matrices.',
      language: 'JavaScript',
      html_url: 'https://github.com/programmingwithprince/height-percentile'
    }
  ];
  renderCarousel(staticRepos);
}

async function initTelemetryAndCarousel() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { user, repos } = JSON.parse(cached);
      applyUserStats(user);
      processCarouselRepos(repos);
      appendSysLog('CACHE', `Telemetry restored from session storage (@${user.login || GH_USER})`);
      return;
    } catch (e) {
      sessionStorage.removeItem(CACHE_KEY);
    }
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GH_USER}`),
      fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      })
    ]);

    if (userRes.status === 403 || reposRes.status === 403) {
      appendSysLog('API', 'Rate limit encountered. Fallback engaged.');
      renderStaticFallback();
      return;
    }

    if (!userRes.ok || !reposRes.ok) throw new Error('API fetch error');

    const userData = await userRes.json();
    const reposData = await reposRes.json();

    applyUserStats(userData);
    processCarouselRepos(reposData);

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user: userData, repos: reposData }));
    appendSysLog('AUTH', `Telemetry synchronized for @${userData.login}`);
  } catch (err) {
    console.warn('Network sync failed, engaging fallback:', err);
    appendSysLog('WARN', 'Offline mode active. Rendering local models.');
    renderStaticFallback();
  }
}

function processCarouselRepos(repos) {
  if (!Array.isArray(repos)) {
    renderStaticFallback();
    return;
  }

  let filtered = repos.filter(repo => !repo.fork && repo.stargazers_count >= MIN_STARS);
  filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);

  if (filtered.length === 0) {
    filtered = repos
      .filter(repo => !repo.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6);
  }

  renderCarousel(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  tickClock();
  setInterval(tickClock, 1000);
  initTelemetryAndCarousel();
});
