// =========================================================
// CONFIGURATIE
// =========================================================

let concerts = [];
let countdownTimer = null;

const appState = {
  search: "",
  filter: "all",
  sort: "smart",
  archiveExpanded: false,
  statsExpanded: false
};

const HOME_LOCATION = {
  lat: 52.5168,
  lon: 6.0830
};

const CITY_COORDS = {
  "Amsterdam": { lat: 52.3676, lon: 4.9041 },
  "Arnhem": { lat: 51.9851, lon: 5.8987 },
  "Eindhoven": { lat: 51.4416, lon: 5.4697 },
  "Emmen": { lat: 52.7858, lon: 6.8976 },
  "Frankfurt": { lat: 50.1109, lon: 8.6821 },
  "Groningen": { lat: 53.2194, lon: 6.5665 },
  "Kampen": { lat: 52.5550, lon: 5.9111 },
  "Landgraaf": { lat: 50.9133, lon: 6.0208 },
  "Lochem": { lat: 52.1592, lon: 6.4111 },
  "Mönchengladbach": { lat: 51.1805, lon: 6.4428 },
  "Nijmegen": { lat: 51.8126, lon: 5.8372 },
  "Rotterdam": { lat: 51.9244, lon: 4.4777 },
  "Tilburg": { lat: 51.5555, lon: 5.0913 },
  "Utrecht": { lat: 52.0907, lon: 5.1214 },
  "Weert": { lat: 51.2518, lon: 5.7066 },
  "Zwolle": { lat: 52.5168, lon: 6.0830 }
};

// =========================================================
// DATA LADEN
// =========================================================

async function loadConcerts() {
  try {
    const response = await fetch("concerts.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`concerts.json kon niet worden geladen. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("concerts.json bevat geen geldige array.");
    }

    concerts = data.map(normalizeConcert).filter(Boolean);
    setupControls();
    renderConcerts();
  } catch (err) {
    console.error("Concertdata kon niet worden geladen:", err);
    showLoadError(err);
  }
}

function normalizeConcert(concert) {
  if (!concert || !concert.artist || !concert.location || !concert.datetime) return null;

  return {
    artist: String(concert.artist),
    location: String(concert.location),
    datetime: String(concert.datetime),
    setlistUrl: typeof concert.setlistUrl === "string" ? concert.setlistUrl : ""
  };
}

function showLoadError(err) {
  const upcomingList = document.getElementById("upcoming-list");
  const heroStats = document.getElementById("hero-stats");

  if (heroStats) {
    heroStats.innerHTML = createHeroStat("Status", "Fout", "Data niet geladen");
  }

  if (!upcomingList) return;

  upcomingList.innerHTML = `
    <div class="empty-state danger">
      <h3>Concerten konden niet worden geladen</h3>
      <p>${escapeHtml(err.message || err)}</p>
      <p>Controleer of <strong>concerts.json</strong> in de hoofdmap staat en de site via een webserver of GitHub Pages wordt geopend.</p>
    </div>
  `;
}

// =========================================================
// HULPFUNCTIES
// =========================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSafeUrl(value) {
  if (!value || typeof value !== "string") return "";

  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getConcertDate(concert) {
  return new Date(concert.datetime);
}

function isPastConcert(concert, now = new Date()) {
  return getConcertDate(concert) < now;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function daysBetweenCalendarDates(fromDate, toDate) {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((to - from) / 86400000);
}

function diffYMDDays(target, now) {
  let years = now.getFullYear() - target.getFullYear();
  let months = now.getMonth() - target.getMonth();
  let days = now.getDate() - target.getDate();

  if (days < 0) {
    months--;
    const previousMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += previousMonthDays;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

function formatDate(datetime) {
  const date = new Date(datetime);
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(" om", " –");
}

function formatShortDate(datetime) {
  return new Date(datetime).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatMonthYear(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric"
  });
}

function formatConcertShort(concert) {
  if (!concert) return "n.v.t.";
  return `${escapeHtml(concert.artist)} · ${formatShortDate(concert.datetime)}`;
}

function getCityFromLocation(location) {
  const parts = String(location).split(" - ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : String(location).trim();
}

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function getTopEntries(object, max = 10) {
  return Object.entries(object)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max);
}

function getFilteredConcerts(sourceConcerts, type) {
  const now = new Date();
  const query = appState.search.trim().toLowerCase();

  return sourceConcerts.filter(concert => {
    const isPast = isPastConcert(concert, now);
    const hasSetlist = Boolean(getSafeUrl(concert.setlistUrl));
    const haystack = `${concert.artist} ${concert.location}`.toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (type === "upcoming" && isPast) return false;
    if (type === "past" && !isPast) return false;
    if (type === "setlists" && (!isPast || !hasSetlist)) return false;

    return true;
  });
}

function sortConcerts(sourceConcerts, type) {
  const sorted = [...sourceConcerts];

  if (appState.sort === "artist") {
    return sorted.sort((a, b) => a.artist.localeCompare(b.artist) || getConcertDate(a) - getConcertDate(b));
  }

  if (appState.sort === "oldest") {
    return sorted.sort((a, b) => getConcertDate(a) - getConcertDate(b));
  }

  if (appState.sort === "newest") {
    return sorted.sort((a, b) => getConcertDate(b) - getConcertDate(a));
  }

  if (type === "upcoming") {
    return sorted.sort((a, b) => getConcertDate(a) - getConcertDate(b));
  }

  return sorted.sort((a, b) => getConcertDate(b) - getConcertDate(a));
}

function getCounts() {
  const now = new Date();
  const upcoming = concerts.filter(concert => !isPastConcert(concert, now));
  const past = concerts.filter(concert => isPastConcert(concert, now));
  const setlists = past.filter(concert => Boolean(getSafeUrl(concert.setlistUrl)));
  const artists = new Set(concerts.map(concert => concert.artist));

  return {
    total: concerts.length,
    upcoming: upcoming.length,
    past: past.length,
    setlists: setlists.length,
    artists: artists.size
  };
}

function getNextConcert() {
  const now = new Date();
  return concerts
    .filter(concert => !isPastConcert(concert, now))
    .sort((a, b) => getConcertDate(a) - getConcertDate(b))[0] || null;
}

// =========================================================
// INTERACTIE
// =========================================================

function setupControls() {
  const searchInput = document.getElementById("concert-search");
  const filterSelect = document.getElementById("concert-filter");
  const sortSelect = document.getElementById("concert-sort");
  const archiveToggle = document.querySelector(".archive-toggle");
  const statsToggle = document.querySelector(".stats-toggle");

  if (searchInput && searchInput.dataset.ready !== "true") {
    searchInput.dataset.ready = "true";
    searchInput.addEventListener("input", event => {
      appState.search = event.target.value;
      renderConcerts();
    });
  }

  if (filterSelect && filterSelect.dataset.ready !== "true") {
    filterSelect.dataset.ready = "true";
    filterSelect.addEventListener("change", event => {
      appState.filter = event.target.value;
      renderConcerts();
    });
  }

  if (sortSelect && sortSelect.dataset.ready !== "true") {
    sortSelect.dataset.ready = "true";
    sortSelect.addEventListener("change", event => {
      appState.sort = event.target.value;
      renderConcerts();
    });
  }

  if (archiveToggle && archiveToggle.dataset.ready !== "true") {
    archiveToggle.dataset.ready = "true";
    archiveToggle.addEventListener("click", () => {
      appState.archiveExpanded = !appState.archiveExpanded;
      renderConcerts();
    });
  }

  if (statsToggle && statsToggle.dataset.ready !== "true") {
    statsToggle.dataset.ready = "true";
    statsToggle.addEventListener("click", () => {
      appState.statsExpanded = !appState.statsExpanded;
      renderConcerts();
    });
  }
}

// =========================================================
// HERO EN SECTIES
// =========================================================

function createHeroStat(label, value, sub) {
  return `
    <article class="hero-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(sub)}</small>
    </article>
  `;
}

function renderHero() {
  const heroStats = document.getElementById("hero-stats");
  const nextHighlight = document.getElementById("next-highlight");
  const counts = getCounts();
  const nextConcert = getNextConcert();

  if (heroStats) {
    heroStats.innerHTML = `
      ${createHeroStat("Totaal", String(counts.total), "concerten")}
      ${createHeroStat("Gepland", String(counts.upcoming), "komende shows")}
      ${createHeroStat("Setlists", String(counts.setlists), "gevonden links")}
      ${createHeroStat("Artiesten", String(counts.artists), "uniek")}
    `;
  }

  if (!nextHighlight) return;

  if (!nextConcert) {
    nextHighlight.innerHTML = `
      <div class="next-card empty-next-card">
        <div>
          <p class="section-kicker">Volgende show</p>
          <h2>Geen komende concerten</h2>
          <p>Er staan op dit moment geen toekomstige concerten in concerts.json.</p>
        </div>
      </div>
    `;
    return;
  }

  nextHighlight.innerHTML = `
    <div class="next-card concert-card" data-datetime="${escapeHtml(nextConcert.datetime)}">
      <div class="next-copy">
        <p class="section-kicker">Volgende show</p>
        <h2>${escapeHtml(nextConcert.artist)}</h2>
        <p>${escapeHtml(nextConcert.location)}</p>
        <time datetime="${escapeHtml(nextConcert.datetime)}">${formatDate(nextConcert.datetime)}</time>
      </div>
      <div class="next-countdown">
        <span>Countdown</span>
        ${createUpcomingCountdownMarkup("featured")}
      </div>
    </div>
  `;
}

function updateToggleState() {
  const archiveList = document.getElementById("archive-list");
  const statsList = document.getElementById("stats-list");
  const archiveToggle = document.querySelector(".archive-toggle");
  const statsToggle = document.querySelector(".stats-toggle");
  const archiveArrow = document.querySelector(".archive-arrow");
  const statsArrow = document.querySelector(".stats-arrow");
  const counts = getCounts();

  if (archiveList) archiveList.classList.toggle("expanded", appState.archiveExpanded);
  if (statsList) statsList.classList.toggle("expanded", appState.statsExpanded);

  if (archiveToggle) {
    archiveToggle.setAttribute("aria-expanded", String(appState.archiveExpanded));
    archiveToggle.querySelector("span:last-child").textContent = `Archief (${counts.past})`;
  }

  if (statsToggle) {
    statsToggle.setAttribute("aria-expanded", String(appState.statsExpanded));
    statsToggle.querySelector("span:last-child").textContent = "Statistieken";
  }

  if (archiveArrow) archiveArrow.style.transform = appState.archiveExpanded ? "rotate(180deg)" : "rotate(0deg)";
  if (statsArrow) statsArrow.style.transform = appState.statsExpanded ? "rotate(180deg)" : "rotate(0deg)";
}

// =========================================================
// CONCERTKAARTEN
// =========================================================

function createSetlistButton(concert, isPast) {
  const setlistUrl = isPast ? getSafeUrl(concert.setlistUrl) : "";

  if (!setlistUrl) {
    return isPast ? '<span class="setlist-placeholder" aria-hidden="true"></span>' : "";
  }

  return `
    <a class="setlist-button" href="${escapeHtml(setlistUrl)}" target="_blank" rel="noopener noreferrer" title="Bekijk setlist op Setlist.fm" aria-label="Bekijk setlist van ${escapeHtml(concert.artist)} op Setlist.fm">
      <img class="setlist-logo" src="assets/setlistfm-logo.png" alt="Setlist.fm" loading="lazy">
    </a>
  `;
}

function createUpcomingCountdownMarkup(variant = "compact") {
  return `
    <div class="retro-countdown retro-countdown-${escapeHtml(variant)}" aria-live="polite">
      ${createRetroSegmentMarkup("days", "Dagen")}
      ${createRetroSegmentMarkup("hours", "Uren")}
      ${createRetroSegmentMarkup("minutes", "Minuten")}
      ${createRetroSegmentMarkup("seconds", "Seconden")}
    </div>
  `;
}

function createRetroSegmentMarkup(unit, label) {
  return `
    <div class="retro-segment" data-unit="${escapeHtml(unit)}">
      <div class="retro-digit-shell">
        <div class="retro-digit-card">
          <span class="retro-value">00</span>
        </div>
      </div>
      <small>${escapeHtml(label)}</small>
    </div>
  `;
}

function createConcertCard(concert, isPast) {
  const card = document.createElement("article");
  const date = getConcertDate(concert);
  const setlistButton = createSetlistButton(concert, isPast);
  const sideMarkup = isPast
    ? `${setlistButton}<div class="countdown archive-countdown"></div>`
    : createUpcomingCountdownMarkup("compact");

  card.className = `concert-card ${isPast ? "past" : "upcoming"}`;
  card.dataset.datetime = concert.datetime;

  card.innerHTML = `
    <div class="date-badge" aria-hidden="true">
      <span>${date.toLocaleDateString("nl-NL", { month: "short" })}</span>
      <strong>${date.toLocaleDateString("nl-NL", { day: "2-digit" })}</strong>
    </div>

    <div class="concert-main">
      <div class="details">
        <h3>${escapeHtml(concert.artist)}</h3>
        <p>${escapeHtml(concert.location)}</p>
      </div>
      <time class="date" datetime="${escapeHtml(concert.datetime)}">${formatDate(concert.datetime)}</time>
    </div>

    <div class="concert-side ${isPast ? "past-side" : "upcoming-side"}">
      ${sideMarkup}
    </div>
  `;

  return card;
}

function createEmptyState(title, text) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function renderConcertList(container, list, isPast) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = createEmptyState(
      "Geen concerten gevonden",
      "Pas de zoekopdracht, filter of sortering aan om opnieuw te zoeken."
    );
    return;
  }

  list.forEach(concert => container.appendChild(createConcertCard(concert, isPast)));
}

// =========================================================
// COUNTDOWNS
// =========================================================

function updateRetroCountdown(countdownEl, target, now) {
  const diffMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const values = { days, hours, minutes, seconds };

  countdownEl.classList.toggle("today", isSameDay(target, now));
  countdownEl.classList.toggle("is-live", diffMs === 0 && isSameDay(target, now));

  countdownEl.querySelectorAll(".retro-segment").forEach(segment => {
    const unit = segment.dataset.unit;
    const valueEl = segment.querySelector(".retro-value");
    if (!valueEl || !(unit in values)) return;

    const rawValue = values[unit];
    const formattedValue = unit === "days" ? String(rawValue) : String(rawValue).padStart(2, "0");
    valueEl.textContent = formattedValue;
  });
}

function updateTextCountdown(countdownEl, target, now) {
  if (isSameDay(target, now)) {
    countdownEl.innerHTML = `<strong>Vandaag</strong><small>⚡ live</small>`;
    countdownEl.classList.remove("finished");
    countdownEl.classList.add("today");
    return;
  }

  const diffMs = target - now;

  if (diffMs > 0) {
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs / 3600000) % 24);
    const minutes = Math.floor((diffMs / 60000) % 60);

    countdownEl.innerHTML = `<strong>${days}d ${hours}u ${minutes}m</strong><small>te gaan</small>`;
    countdownEl.classList.remove("finished", "today");
    return;
  }

  const daysAgo = daysBetweenCalendarDates(target, now);
  const diff = diffYMDDays(target, now);
  const ymd = `${diff.years} jaar, ${diff.months} maanden en ${diff.days} dagen`;

  countdownEl.innerHTML = `<strong>${daysAgo} dagen geleden</strong><small>${ymd}</small>`;
  countdownEl.classList.add("finished");
  countdownEl.classList.remove("today");
}

function updateCountdowns() {
  const now = new Date();

  document.querySelectorAll(".concert-card").forEach(card => {
    const target = new Date(card.dataset.datetime);

    if (Number.isNaN(target.getTime())) return;

    const retroCountdown = card.querySelector(".retro-countdown");
    if (retroCountdown) {
      updateRetroCountdown(retroCountdown, target, now);
      return;
    }

    const countdownEl = card.querySelector(".countdown");
    if (!countdownEl) return;

    updateTextCountdown(countdownEl, target, now);
  });
}

// =========================================================
// STATISTIEKEN
// =========================================================

function generateStats(past) {
  const artistStats = {};
  const locationStats = {};
  const weekdayStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };

  past.forEach(concert => {
    const date = getConcertDate(concert);
    const weekday = date.getDay();

    artistStats[concert.artist] = (artistStats[concert.artist] || 0) + 1;
    locationStats[concert.location] = (locationStats[concert.location] || 0) + 1;
    weekdayStats[weekday]++;
  });

  return {
    sortedArtists: getTopEntries(artistStats, 999),
    sortedLocations: getTopEntries(locationStats, 999),
    weekdayStats,
    weekdayNames: ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"],
    weekdayOrder: [1, 2, 3, 4, 5, 6, 0]
  };
}

function generateYearStats(past) {
  const years = past.map(concert => getConcertDate(concert).getFullYear());
  const firstYear = years.length ? Math.min(...years) : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const stats = {};

  for (let year = firstYear; year <= currentYear; year++) stats[year] = 0;

  past.forEach(concert => {
    const year = getConcertDate(concert).getFullYear();
    stats[year] = (stats[year] || 0) + 1;
  });

  return stats;
}

function generateMonthHeatmap(past) {
  const monthNames = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const monthStats = monthNames.map((name, index) => ({ name, count: 0, heat: 0, monthIndex: index }));

  past.forEach(concert => {
    const month = getConcertDate(concert).getMonth();
    monthStats[month].count++;
  });

  const max = Math.max(...monthStats.map(month => month.count), 1);

  return monthStats.map(month => ({
    ...month,
    heat: month.count === 0 ? 0 : Math.max(1, Math.ceil((month.count / max) * 5))
  }));
}

function generateExtraStats(past) {
  if (past.length === 0) {
    return {
      busiestMonth: ["n.v.t.", 0],
      busiestYear: ["n.v.t.", 0],
      totalConcerts: 0,
      uniqueArtists: 0,
      uniqueLocations: 0,
      avgDaysBetween: 0,
      firstConcert: null,
      lastConcert: null,
      setlists: 0
    };
  }

  const monthCounts = {};
  const yearCounts = {};
  const artists = new Set();
  const locations = new Set();
  const dates = past.map(concert => getConcertDate(concert)).sort((a, b) => a - b);
  const chronological = [...past].sort((a, b) => getConcertDate(a) - getConcertDate(b));

  past.forEach(concert => {
    const date = getConcertDate(concert);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    yearCounts[date.getFullYear()] = (yearCounts[date.getFullYear()] || 0) + 1;
    artists.add(concert.artist);
    locations.add(concert.location);
  });

  let totalDiff = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDiff += (dates[i] - dates[i - 1]) / 86400000;
  }

  const busiestMonthRaw = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    busiestMonth: [formatMonthYear(busiestMonthRaw[0]), busiestMonthRaw[1]],
    busiestYear,
    totalConcerts: past.length,
    uniqueArtists: artists.size,
    uniqueLocations: locations.size,
    avgDaysBetween: dates.length > 1 ? Math.round(totalDiff / (dates.length - 1)) : 0,
    firstConcert: chronological[0],
    lastConcert: chronological[chronological.length - 1],
    setlists: past.filter(concert => Boolean(getSafeUrl(concert.setlistUrl))).length
  };
}

function generateStreakStats(past) {
  const sorted = [...past].sort((a, b) => getConcertDate(a) - getConcertDate(b));

  if (sorted.length === 0) {
    return {
      maxIn14Days: { count: 0, start: null, end: null },
      maxIn30Days: { count: 0, start: null, end: null },
      shortestGap: null
    };
  }

  function maxConcertsWithin(daysWindow) {
    let best = { count: 1, start: sorted[0], end: sorted[0] };
    let left = 0;

    for (let right = 0; right < sorted.length; right++) {
      while (getConcertDate(sorted[right]) - getConcertDate(sorted[left]) > daysWindow * 86400000) {
        left++;
      }

      const count = right - left + 1;
      if (count > best.count) {
        best = { count, start: sorted[left], end: sorted[right] };
      }
    }

    return best;
  }

  let shortestGap = null;
  for (let i = 1; i < sorted.length; i++) {
    const previous = getConcertDate(sorted[i - 1]);
    const current = getConcertDate(sorted[i]);
    const days = Math.round((current - previous) / 86400000);

    if (!shortestGap || days < shortestGap.days) {
      shortestGap = { days, first: sorted[i - 1], second: sorted[i] };
    }
  }

  return {
    maxIn14Days: maxConcertsWithin(14),
    maxIn30Days: maxConcertsWithin(30),
    shortestGap
  };
}

function generateDistanceStats(past) {
  const concertsWithDistance = past
    .map(concert => {
      const city = getCityFromLocation(concert.location);
      const coords = CITY_COORDS[city];
      if (!coords) return null;
      return { ...concert, city, distance: haversineKm(HOME_LOCATION, coords) };
    })
    .filter(Boolean);

  if (concertsWithDistance.length === 0) {
    return {
      knownCount: 0,
      unknownCount: past.length,
      averageDistance: 0,
      farthest: null,
      totalDistance: 0
    };
  }

  const totalDistance = concertsWithDistance.reduce((sum, concert) => sum + concert.distance, 0);
  const farthest = [...concertsWithDistance].sort((a, b) => b.distance - a.distance)[0];

  return {
    knownCount: concertsWithDistance.length,
    unknownCount: past.length - concertsWithDistance.length,
    averageDistance: Math.round(totalDistance / concertsWithDistance.length),
    farthest,
    totalDistance: Math.round(totalDistance * 2)
  };
}

function createStatCard(label, value, sub) {
  return `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      ${sub ? `<small>${sub}</small>` : ""}
    </article>
  `;
}

function createBarChart(entries) {
  const max = Math.max(...entries.map(item => item.value), 1);

  return entries.map(item => {
    const percentage = item.value === 0 ? 0 : Math.max(3, Math.round((item.value / max) * 100));
    return `
      <div class="bar-row">
        <span>${escapeHtml(item.label)}</span>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width:${percentage}%"></div>
        </div>
        <strong>${item.value}</strong>
      </div>
    `;
  }).join("");
}

function createMonthHeatmap(monthStats) {
  return `
    <div class="month-heatmap">
      ${monthStats.map(month => `
        <div class="month-cell heat-${month.heat}">
          <span>${month.name}</span>
          <strong>${month.count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function createFullRankingList(entries, type) {
  if (!entries.length) {
    return `<p class="empty-message">Nog geen gegevens beschikbaar.</p>`;
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return `
    <div class="ranking-bar-list ${type === "location" ? "location-ranking" : "artist-ranking"}">
      ${entries.map(([name, count], index) => {
        const percentage = count === 0 ? 0 : Math.max(4, Math.round((count / max) * 100));
        const share = total > 0 ? Math.round((count / total) * 100) : 0;
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        return `
          <div class="ranking-bar-row top-${index + 1}">
            <span class="ranking-position">${medal}</span>
            <span class="ranking-name">${escapeHtml(name)}</span>
            <div class="bar-track ranking-wide-track" aria-hidden="true">
              <div class="bar-fill ranking-wide-fill" style="width:${percentage}%"></div>
            </div>
            <strong class="ranking-count">${count}×</strong>
            <span class="ranking-share">${share}%</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStatsBlock(past) {
  const { sortedArtists, sortedLocations, weekdayStats, weekdayNames, weekdayOrder } = generateStats(past);
  const yearStats = generateYearStats(past);
  const extra = generateExtraStats(past);
  const monthHeatmap = generateMonthHeatmap(past);
  const streakStats = generateStreakStats(past);
  const distanceStats = generateDistanceStats(past);
  const yearChartEntries = Object.entries(yearStats).map(([year, value]) => ({ label: year, value }));
  const weekdayChartEntries = weekdayOrder.map(dayNumber => ({ label: weekdayNames[dayNumber], value: weekdayStats[dayNumber] }));

  const farthestText = distanceStats.farthest
    ? `${escapeHtml(distanceStats.farthest.city)} (${distanceStats.farthest.distance} km)`
    : "n.v.t.";

  const farthestSub = distanceStats.farthest
    ? `${escapeHtml(distanceStats.farthest.artist)} · ${escapeHtml(distanceStats.farthest.location)}`
    : "";

  const shortestGapText = streakStats.shortestGap ? `${streakStats.shortestGap.days} dagen` : "n.v.t.";
  const shortestGapSub = streakStats.shortestGap
    ? `${escapeHtml(streakStats.shortestGap.first.artist)} → ${escapeHtml(streakStats.shortestGap.second.artist)}`
    : "";

  const container = document.createElement("div");
  container.className = "stats-panel";

  container.innerHTML = `
    <div class="stats-title-row">
      <div>
        <p class="section-kicker">Inzicht</p>
        <h2>Statistieken</h2>
      </div>
      <span class="pill">${extra.totalConcerts} bezocht</span>
    </div>

    <div class="stats-grid">
      ${createStatCard("Totaal bezocht", `${extra.totalConcerts}`, "concerten")}
      ${createStatCard("Setlists gevonden", `${extra.setlists}`, "links in archief")}
      ${createStatCard("Unieke artiesten", `${extra.uniqueArtists}`, "verschillende artiesten")}
      ${createStatCard("Unieke locaties", `${extra.uniqueLocations}`, "verschillende locaties")}
      ${createStatCard("Gem. tijd ertussen", `${extra.avgDaysBetween}`, "dagen")}
      ${createStatCard("Drukste maand", `${escapeHtml(extra.busiestMonth[0])}`, `${extra.busiestMonth[1]} concerten`)}
      ${createStatCard("Drukste jaar", `${escapeHtml(extra.busiestYear[0])}`, `${extra.busiestYear[1]} concerten`)}
      ${createStatCard("Verste locatie", farthestText, farthestSub)}
    </div>

    <div class="stats-box heatmap-wide-box">
      <div class="stats-box-header">
        <div>
          <h3>Concert heatmap per maand</h3>
          <p>Donkerder betekent meer concerten in die maand.</p>
        </div>
      </div>
      ${createMonthHeatmap(monthHeatmap)}
    </div>

    <div class="stats-sections main-stats-sections">
      <div class="stats-box">
        <h3>Timeline per jaar</h3>
        ${createBarChart(yearChartEntries)}
      </div>

      <div class="stats-box">
        <h3>Concerten per weekdag</h3>
        ${createBarChart(weekdayChartEntries)}
      </div>
    </div>

    <div class="stats-sections extra-stats-sections">
      <div class="stats-box">
        <h3>Concert streaks</h3>
        <ul class="stats-list">
          <li>Meeste in 14 dagen: <strong>${streakStats.maxIn14Days.count}×</strong><br><small>${formatConcertShort(streakStats.maxIn14Days.start)} t/m ${formatConcertShort(streakStats.maxIn14Days.end)}</small></li>
          <li>Meeste in 30 dagen: <strong>${streakStats.maxIn30Days.count}×</strong><br><small>${formatConcertShort(streakStats.maxIn30Days.start)} t/m ${formatConcertShort(streakStats.maxIn30Days.end)}</small></li>
          <li>Kortste pauze: <strong>${shortestGapText}</strong><br><small>${shortestGapSub}</small></li>
        </ul>
      </div>

      <div class="stats-box">
        <h3>Afstanden</h3>
        <ul class="stats-list">
          <li>Verste locatie: <strong>${farthestText}</strong></li>
          <li>Gemiddelde enkele reis: <strong>${distanceStats.averageDistance} km</strong></li>
          <li>Geschatte totaalafstand retour: <strong>${distanceStats.totalDistance.toLocaleString("nl-NL")} km</strong></li>
          <li>Bekende plaats: <strong>${distanceStats.knownCount}/${past.length}</strong></li>
        </ul>
        <p class="chart-note">Afstanden zijn hemelsbreed en berekend op basis van de plaatsnaam achter het streepje in de locatie.</p>
      </div>

      <div class="stats-box">
        <h3>Eerste & laatste</h3>
        <div class="first-last-block">
          <div>
            <div class="first-last-label">Eerste bezochte concert</div>
            <p>${formatConcertShort(extra.firstConcert)}</p>
          </div>
          <div>
            <div class="first-last-label">Laatste bezochte concert</div>
            <p>${formatConcertShort(extra.lastConcert)}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="stats-sections rankings-stats-sections">
      <div class="stats-box full-ranking-box">
        <div class="stats-box-header">
          <div>
            <h3>Alle artiesten</h3>
            <p>Gesorteerd op aantal bezochte concerten.</p>
          </div>
          <span class="pill">${sortedArtists.length} artiesten</span>
        </div>
        ${createFullRankingList(sortedArtists, "artist")}
      </div>

      <div class="stats-box full-ranking-box">
        <div class="stats-box-header">
          <div>
            <h3>Alle locaties</h3>
            <p>Gesorteerd op aantal bezoeken per locatie.</p>
          </div>
          <span class="pill">${sortedLocations.length} locaties</span>
        </div>
        ${createFullRankingList(sortedLocations, "location")}
      </div>
    </div>
  `;

  return container;
}

// =========================================================
// RENDER ALLES
// =========================================================

function renderConcerts() {
  const upcomingList = document.getElementById("upcoming-list");
  const archiveList = document.getElementById("archive-list");
  const statsList = document.getElementById("stats-list");
  const archiveSection = document.getElementById("archive");
  const upcomingSection = document.getElementById("upcoming");
  const statisticsSection = document.getElementById("statistics");

  if (!upcomingList || !archiveList || !statsList) return;

  const visibleUpcoming = sortConcerts(getFilteredConcerts(concerts, "upcoming"), "upcoming");
  const visibleArchive = sortConcerts(getFilteredConcerts(concerts, appState.filter === "setlists" ? "setlists" : "past"), "past");
  const shouldShowUpcoming = ["all", "upcoming"].includes(appState.filter);
  const shouldShowArchive = ["all", "past", "setlists"].includes(appState.filter);

  renderHero();

  if (upcomingSection) upcomingSection.hidden = !shouldShowUpcoming;
  if (archiveSection) archiveSection.hidden = !shouldShowArchive;
  if (statisticsSection) statisticsSection.hidden = false;

  if (shouldShowUpcoming) {
    renderConcertList(upcomingList, visibleUpcoming, false);
  }

  if (shouldShowArchive) {
    renderConcertList(archiveList, visibleArchive, true);
  }

  const pastForStats = concerts
    .filter(concert => isPastConcert(concert))
    .sort((a, b) => getConcertDate(b) - getConcertDate(a));

  statsList.innerHTML = "";
  statsList.appendChild(renderStatsBlock(pastForStats));

  updateToggleState();
  updateCountdowns();

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdowns, 1000);
}

// =========================================================
// START
// =========================================================

document.addEventListener("DOMContentLoaded", loadConcerts);
