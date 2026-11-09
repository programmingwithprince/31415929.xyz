(function initStarredReposCarousel() {
  const GITHUB_USERNAME = 'programmingwithprince';
  const MIN_STARS = 2;
  const track = document.getElementById('repos-track');

  if (!track) return;

  async function fetchStarredRepos() {
    try {
      const response = await fetch(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();

      // 1. Filter: >= 2 stars & exclude forks if desired
      let filtered = repos.filter(
        repo => !repo.fork && repo.stargazers_count >= MIN_STARS
      );

      // 2. Sort: Highest stars first
      filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);

      // Fallback: If 0 repos hit the 2-star threshold yet, show top repos >= 0 stars
      if (filtered.length === 0) {
        filtered = repos
          .filter(repo => !repo.fork)
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 6);
      }

      renderCarousel(filtered);
    } catch (err) {
      console.warn('Carousel fallback engaged:', err);
      renderStaticFallback();
    }
  }

  function createCardHTML(repo) {
    const desc = repo.description || 'No system description logged for this repository.';
    const lang = repo.language || 'Multi-Stack';

    return `
      <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card">
        <div>
          <div class="repo-card-header">
            <span class="repo-name">${escapeHTML(repo.name)}</span>
            <span class="repo-stars-badge">&starf; ${repo.stargazers_count}</span>
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
    if (!repos || repos.length === 0) {
      track.innerHTML = `
        <div class="repo-card skeleton">
          [NO REPOSITORIES CURRENTLY MEET &ge; ${MIN_STARS} &starf; THRESHOLD]
        </div>`;
      return;
    }

    // Build the primary set of cards
    const cardsHTML = repos.map(createCardHTML).join('');

    // Duplicate the cards twice to create a seamless infinite CSS translateX loop
    track.innerHTML = cardsHTML + cardsHTML;

    // Dynamically adjust animation speed based on item count for smooth velocity
    const totalItems = repos.length * 2;
    const computedDuration = Math.max(22, totalItems * 3.5);
    track.style.animationDuration = `${computedDuration}s`;
  }

  function renderStaticFallback() {
    // High-signal fallback cards if rate limit (HTTP 403) occurs
    const staticRepos = [
      {
        name: 'Keep-my-Screen-Wake-Up',
        stargazers_count: 5,
        description: 'A lightweight focus utility with a full-screen clock that keeps your display awake. Uses the Screen Wake Lock API to prevent sleep during study or work.',
        language: 'JavaScript',
        html_url: 'https://github.com/programmingwithprince/Keep-my-Screen-Wake-Up'
      },
      {
        name: 'https://github.com/programmingwithprince/File-Sharing',
        stargazers_count: 3,
        description: 'File Sharing project! This repository provides a simple and efficient way to share files over a network using Flask. Whether you're working on a team project or need to transfer files between devices, this tool has got you covered.

Resources
',
        language: 'PYTHON/FLASK/HTML/CSS/JS',
        html_url: 'https://github.com/programmingwithprince/31415929.xyz'
      },
      {
        name: 'height-percentile',
        stargazers_count: 2,
        description: 'Calculate your exact height percentile across countries and worldwide populations. Compare normal distribution curves, global height rankings, and download verified telemetry visual cards.Resources',
        language: 'XML/JSON',
        html_url: 'https://github.com/programmingwithprince/height-percentile'
      }
    ];
    renderCarousel(staticRepos);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  fetchStarredRepos();
})();


// dev note: keeping this pure vanilla js, no npm bloat or bundler needed

const GH_USER = 'programmingwithprince';
const CACHE_KEY = 'gh_telemetry_cache';

// simple helper for logging into the on-screen terminal box
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

// live utc clock in the header
function tickClock() {
  const clockEl = document.getElementById('system-time');
  if (!clockEl) return;
  
  const now = new Date();
  const timeParts = now.toUTCString().split(' ');
  const utcFormatted = timeParts[4] || '00:00:00';
  clockEl.textContent = `UTC: ${utcFormatted}`;
}

// update DOM elements with user profile stats
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
  if (data.bio && data.bio.trim() !== '') {
    const bioEl = document.getElementById('gh-bio');
    if (bioEl) bioEl.textContent = data.bio;
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

// fetch both profile & repos under 1 unified session cache
async function loadGitHubTelemetry() {
  // 1. Check if we already cached the data during this browser session
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { user, repos } = JSON.parse(cached);
      applyUserStats(user);
      window.myRepos = repos;
      appendSysLog('CACHE', `Telemetry restored from session storage (@${user.login || GH_USER})`);
      return;
    } catch (e) {
      sessionStorage.removeItem(CACHE_KEY);
    }
  }

  // 2. Fetch fresh data if not cached
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GH_USER}`),
      fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=10`)
    ]);

    if (userRes.status === 403 || reposRes.status === 403) {
      console.warn("GitHub API rate-limited (403). Preserving fallback state.");
      appendSysLog('API', 'Rate limit encountered. Fallback mode engaged.');
      window.myRepos = [
        { name: "tools.31415929.xyz", description: "Autonomous developer toolkit & utilities", html_url: "https://tools.31415929.xyz" },
        { name: "31415929.xyz", description: "Central systems & research terminal node", html_url: "https://31415929.xyz" }
      ];
      return;
    }

    if (!userRes.ok) throw new Error(`User API error: ${userRes.status}`);

    const userData = await userRes.json();
    const reposData = reposRes.ok ? await reposRes.json() : [];

    // Save to DOM & window memory
    applyUserStats(userData);
    window.myRepos = reposData;

    // Persist to session cache so refreshes don't hit GitHub again
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user: userData, repos: reposData }));
    appendSysLog('AUTH', `Telemetry synchronized for @${userData.login}`);

  } catch (err) {
    console.error("Telemetry sync failed:", err);
    appendSysLog('WARN', 'GitHub node unreachable. Offline mode active.');
    window.myRepos = [
      { name: "tools.31415929.xyz", description: "Autonomous developer toolkit & utilities", html_url: "https://tools.31415929.xyz" }
    ];
  }
}

// initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  tickClock();
  setInterval(tickClock, 1000);
  loadGitHubTelemetry();
});
