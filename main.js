// dev note: keeping this pure vanilla js, no npm bloat or bundler needed

const GH_USER = 'programmingwithprince';

// simple helper for logging into the on-screen terminal box
function appendSysLog(tag, message) {
  const feed = document.getElementById('log-feed');
  if (!feed) {
    // console.warn("couldnt find #log-feed element");
    return;
  }
  
  const entry = document.createElement('div');
  entry.className = 'log-line';
  
  // format time like HH:MM:SS
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
  // split gives us the time part from utc string
  const timeParts = now.toUTCString().split(' ');
  const utcFormatted = timeParts[4] || '00:00:00';
  clockEl.textContent = `UTC: ${utcFormatted}`;
}

// fetch live profile stats from gh public endpoint
async function loadGitHubTelemetry() {
  // console.log("fetching user data for:", GH_USER);
  
  try {
    const res = await fetch(`https://api.github.com/users/${GH_USER}`);
    
    // handle rate limits (github allows 60 req/hr unauthenticated)
    if (res.status === 403) {
      console.warn("gh api 403: probably rate limited, falling back to defaults");
      appendSysLog('API', 'Rate limit encountered. Fallback state preserved.');
      return;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP error code ${res.status}`);
    }

    const data = await res.json();
    
    // quick dom update
    if (data.avatar_url) {
      const avatarEl = document.getElementById('gh-avatar');
      if (avatarEl) avatarEl.src = data.avatar_url;
    }
    
    if (data.name) {
      const nameEl = document.getElementById('gh-name');
      if (nameEl) nameEl.textContent = data.name;
    }
    
    // only overwrite bio if user actually set one
    if (data.bio && data.bio.trim() !== "") {
      const bioEl = document.getElementById('gh-bio');
      if (bioEl) bioEl.textContent = data.bio;
    }
    
    // numbers update
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

    // announce success to log console
    appendSysLog('AUTH', `Telemetry synchronized for @${data.login}`);
    
  } catch (err) {
    // silently fail so UI doesnt break if offline
    console.error("fetch failed:", err);
    appendSysLog('WARN', 'GitHub node unreachable. Offline mode active.');
  }
}

// init when dom is ready
document.addEventListener('DOMContentLoaded', () => {
  // start clock timer
  tickClock();
  setInterval(tickClock, 1000);
  
  // load github details
  loadGitHubTelemetry();
});

