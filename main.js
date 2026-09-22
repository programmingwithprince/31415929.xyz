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
