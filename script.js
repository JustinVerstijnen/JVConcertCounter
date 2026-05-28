// =========================================================
// INSTELLINGEN
// =========================================================

let concerts = [];
let countdownTimer = null;

// Afstanden worden intern berekend vanaf een algemene referentieplaats.
const HOME_LOCATION = {
  lat: 52.5168,
  lon: 6.0830
};

// Vaste plaatscoördinaten zodat concerts.json niet aangepast hoeft te worden.
// De plaats wordt uit "Locatie - Plaats" gehaald.
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
// LOAD JSON
// =========================================================

async function loadConcerts() {
  try {
    concerts = await getConcertsData();

    if (!Array.isArray(concerts)) {
      throw new Error("concertdata bevat geen geldige array.");
    }

    renderConcerts();
  } catch (err) {
    console.error("Cannot load concerts data:", err);
    showLoadError(err);
  }
}

async function getConcertsData() {
  try {
    const response = await fetch("concerts.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("concerts.json kon niet worden geladen. Status: " + response.status);
    }

    return await response.json();
  } catch (fetchError) {
    // Als je index.html lokaal opent via file:// blokkeert de browser vaak fetch().
    // Dan gebruiken we de fallback uit concerts-data.js.
    if (Array.isArray(window.CONCERTS_DATA)) {
      console.warn("Fetch van concerts.json is mislukt. Fallback uit concerts-data.js wordt gebruikt.", fetchError);
      return window.CONCERTS_DATA;
    }

    throw fetchError;
  }
}

function showLoadError(err) {
  const upcomingList = document.getElementById("upcoming-list");
  if (!upcomingList) return;

  upcomingList.innerHTML = `
    <div class="concert-card">
      <div class="details">
        <h3>Concerten konden niet worden geladen</h3>
        <p>${escapeHtml(err.message || err)}</p>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", loadConcerts);

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

function diffYMDDays(target, now) {
  let years = now.getFullYear() - target.getFullYear();
  let months = now.getMonth() - target.getMonth();
  let days = now.getDate() - target.getDate();

  if (days < 0) {
    months--;
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}


function daysBetweenCalendarDates(fromDate, toDate) {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.floor((to - from) / 86400000);
}

function formatDate(datetime) {
  const date = new Date(datetime);
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  };
  return date.toLocaleDateString("nl-NL", options).replace(" om", " –");
}

function formatShortDate(datetime) {
  return new Date(datetime).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
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

function formatMonthYear(key) {
  const parts = key.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function getTopEntries(object, max) {
  return Object.entries(object)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max || 10);
}

function formatConcertShort(concert) {
  if (!concert) return "n.v.t.";
  return `${escapeHtml(concert.artist)}: ${formatShortDate(concert.datetime)}`;
}

// =========================================================
// LAYOUT AANMAKEN / CONTROLEREN
// =========================================================

function ensureLayout() {
  const main = document.querySelector("main");
  if (!main) return;

  let upcomingList = document.getElementById("upcoming-list");
  if (!upcomingList) {
    const upcoming = document.getElementById("upcoming") || document.createElement("section");
    upcoming.id = "upcoming";
    upcomingList = document.createElement("div");
    upcomingList.id = "upcoming-list";
    upcoming.appendChild(upcomingList);
    if (!upcoming.parentElement) main.appendChild(upcoming);
  }

  let actions = document.getElementById("overview-actions");
  if (!actions) {
    actions = document.createElement("section");
    actions.id = "overview-actions";
    actions.className = "overview-actions";
    main.appendChild(actions);
  }

  let archiveToggle = document.querySelector(".archive-toggle");
  if (!archiveToggle) {
    archiveToggle = document.createElement("h2");
    archiveToggle.className = "archive-toggle toggle-button";
    actions.appendChild(archiveToggle);
  }

  let statsToggle = document.querySelector(".stats-toggle");
  if (!statsToggle) {
    statsToggle = document.createElement("h2");
    statsToggle.className = "stats-toggle toggle-button stats-button";
    actions.appendChild(statsToggle);
  }

  if (!actions.contains(archiveToggle)) actions.appendChild(archiveToggle);
  if (!actions.contains(statsToggle)) actions.appendChild(statsToggle);

  let archiveSection = document.getElementById("archive");
  if (!archiveSection) {
    archiveSection = document.createElement("section");
    archiveSection.id = "archive";
    main.appendChild(archiveSection);
  }

  let archiveList = document.getElementById("archive-list");
  if (!archiveList) {
    archiveList = document.createElement("div");
    archiveList.id = "archive-list";
    archiveSection.appendChild(archiveList);
  }
  archiveList.classList.add("collapsible-panel");

  let statisticsSection = document.getElementById("statistics");
  if (!statisticsSection) {
    statisticsSection = document.createElement("section");
    statisticsSection.id = "statistics";
    main.appendChild(statisticsSection);
  }

  let statsList = document.getElementById("stats-list");
  if (!statsList) {
    statsList = document.createElement("div");
    statsList.id = "stats-list";
    statisticsSection.appendChild(statsList);
  }
  statsList.classList.add("collapsible-panel");
}

// =========================================================
// STATISTIEKEN BEREKENEN
// =========================================================

function generateStats(past) {
  const artistStats = {};
  const locationStats = {};
  const weekdayStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };

  past.forEach(c => {
    const d = new Date(c.datetime);
    const wd = d.getDay();

    artistStats[c.artist] = (artistStats[c.artist] || 0) + 1;
    locationStats[c.location] = (locationStats[c.location] || 0) + 1;
    weekdayStats[wd]++;
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
  const years = past.map(c => new Date(c.datetime).getFullYear());
  const firstYear = years.length ? Math.min(...years) : new Date().getFullYear();
  const currentYear = new Date().getFullYear();
  const stats = {};

  for (let y = firstYear; y <= currentYear; y++) stats[y] = 0;

  past.forEach(c => {
    const year = new Date(c.datetime).getFullYear();
    stats[year] = (stats[year] || 0) + 1;
  });

  return stats;
}

function generateMonthHeatmap(past) {
  const monthNames = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const monthStats = monthNames.map((name, index) => ({ name, count: 0, heat: 0, monthIndex: index }));

  past.forEach(c => {
    const month = new Date(c.datetime).getMonth();
    monthStats[month].count++;
  });

  const max = Math.max(...monthStats.map(m => m.count), 1);

  return monthStats.map(m => ({
    ...m,
    heat: m.count === 0 ? 0 : Math.max(1, Math.ceil((m.count / max) * 5))
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
      lastConcert: null
    };
  }

  const monthCounts = {};
  const yearCounts = {};
  const artists = new Set();
  const locations = new Set();
  const dates = past.map(c => new Date(c.datetime)).sort((a, b) => a - b);
  const chronological = [...past].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  past.forEach(c => {
    const d = new Date(c.datetime);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    yearCounts[d.getFullYear()] = (yearCounts[d.getFullYear()] || 0) + 1;
    artists.add(c.artist);
    locations.add(c.location);
  });

  const busiestMonthRaw = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];

  let totalDiff = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDiff += (dates[i] - dates[i - 1]) / 86400000;
  }

  return {
    busiestMonth: [formatMonthYear(busiestMonthRaw[0]), busiestMonthRaw[1]],
    busiestYear,
    totalConcerts: past.length,
    uniqueArtists: artists.size,
    uniqueLocations: locations.size,
    avgDaysBetween: dates.length > 1 ? Math.round(totalDiff / (dates.length - 1)) : 0,
    firstConcert: chronological[0],
    lastConcert: chronological[chronological.length - 1]
  };
}

function generateStreakStats(past) {
  const sorted = [...past].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

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
      while (new Date(sorted[right].datetime) - new Date(sorted[left].datetime) > daysWindow * 86400000) {
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
    const previous = new Date(sorted[i - 1].datetime);
    const current = new Date(sorted[i].datetime);
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

  const totalDistance = concertsWithDistance.reduce((sum, c) => sum + c.distance, 0);
  const farthest = [...concertsWithDistance].sort((a, b) => b.distance - a.distance)[0];

  return {
    knownCount: concertsWithDistance.length,
    unknownCount: past.length - concertsWithDistance.length,
    averageDistance: Math.round(totalDistance / concertsWithDistance.length),
    farthest,
    totalDistance: Math.round(totalDistance * 2)
  };
}

// =========================================================
// HTML HELPERS VOOR STATISTIEKEN
// =========================================================

function createStatCard(label, value, sub) {
  return `
    <div class="stat-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${value}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ""}
    </div>
  `;
}

function createBarChart(entries) {
  const max = Math.max(...entries.map(item => item.value), 1);

  return entries.map(item => {
    const percentage = item.value === 0 ? 0 : Math.max(3, Math.round((item.value / max) * 100));
    return `
      <div class="bar-row">
        <span>${escapeHtml(item.label)}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${percentage}%"></div>
        </div>
        <strong>${item.value}</strong>
      </div>
    `;
  }).join("");
}

function createTopList(entries, limit) {
  return `
    <ol class="stats-list">
      ${entries.slice(0, limit || 8).map(([name, count]) => `<li>${escapeHtml(name)}: <strong>${count}×</strong></li>`).join("")}
    </ol>
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
        const percentage = count === 0 ? 0 : Math.max(3, Math.round((count / max) * 100));
        const share = total > 0 ? Math.round((count / total) * 100) : 0;
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        return `
          <div class="ranking-bar-row top-${index + 1}">
            <span class="ranking-position">${medal}</span>
            <span class="ranking-name">${escapeHtml(name)}</span>
            <div class="bar-track ranking-wide-track">
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

function createMonthHeatmap(monthStats) {
  return `
    <div class="month-heatmap">
      ${monthStats.map(month => `
        <div class="month-cell heat-${month.heat}">
          ${month.name}
          <strong>${month.count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

// =========================================================
// RENDER STATISTIEKEN
// =========================================================

function renderStatsBlock(past) {
  const { sortedArtists, sortedLocations, weekdayStats, weekdayNames, weekdayOrder } = generateStats(past);
  const yearStats = generateYearStats(past);
  const extra = generateExtraStats(past);
  const monthHeatmap = generateMonthHeatmap(past);
  const streakStats = generateStreakStats(past);
  const distanceStats = generateDistanceStats(past);

  const container = document.createElement("div");
  container.className = "stats-panel";

  const yearChartEntries = Object.entries(yearStats).map(([year, value]) => ({ label: year, value }));
  const weekdayChartEntries = weekdayOrder.map(dayNumber => ({
    label: weekdayNames[dayNumber],
    value: weekdayStats[dayNumber]
  }));

  const farthestText = distanceStats.farthest
    ? `${escapeHtml(distanceStats.farthest.city)} (${distanceStats.farthest.distance} km)`
    : "n.v.t.";

  const farthestSub = distanceStats.farthest
    ? `${escapeHtml(distanceStats.farthest.artist)}: ${escapeHtml(distanceStats.farthest.location)}`
    : "";

  const shortestGapText = streakStats.shortestGap ? `${streakStats.shortestGap.days} dagen` : "n.v.t.";
  const shortestGapSub = streakStats.shortestGap
    ? `${escapeHtml(streakStats.shortestGap.first.artist)} → ${escapeHtml(streakStats.shortestGap.second.artist)}`
    : "";

  container.innerHTML = `
    <h2>📊 Statistieken</h2>

    <div class="stats-grid">
      ${createStatCard("Totaal bezocht", `${extra.totalConcerts}`, "concerten")}
      ${createStatCard("Unieke artiesten", `${extra.uniqueArtists}`, "verschillende artiesten")}
      ${createStatCard("Unieke locaties", `${extra.uniqueLocations}`, "verschillende locaties")}
      ${createStatCard("Gem. tijd ertussen", `${extra.avgDaysBetween}`, "dagen tussen concerten")}
      ${createStatCard("Drukste maand", `${extra.busiestMonth[0]}`, `${extra.busiestMonth[1]} concerten`)}
      ${createStatCard("Drukste jaar", `${extra.busiestYear[0]}`, `${extra.busiestYear[1]} concerten`)}
      ${createStatCard("Verste locatie", farthestText, farthestSub)}
      ${createStatCard("Gem. afstand", `${distanceStats.averageDistance} km`, "hemelsbreed berekend")}
    </div>

    <div class="stats-box heatmap-wide-box">
      <h3>🔥 Concert heatmap per maand</h3>
      ${createMonthHeatmap(monthHeatmap)}
      <div class="chart-note">Donkerder betekent meer concerten in die maand.</div>
    </div>

    <div class="stats-sections main-stats-sections">
      <div class="stats-box">
        <h3>📈 Timeline per jaar</h3>
        ${createBarChart(yearChartEntries)}
      </div>

      <div class="stats-box">
        <h3>📅 Concerten per weekdag</h3>
        ${createBarChart(weekdayChartEntries)}
      </div>
    </div>

    <div class="stats-sections extra-stats-sections">
      <div class="stats-box">
        <h3>⚡ Concert streaks</h3>
        <ul class="stats-list">
          <li>Meeste in 14 dagen: <strong>${streakStats.maxIn14Days.count}×</strong><br><small>${formatConcertShort(streakStats.maxIn14Days.start)} t/m ${formatConcertShort(streakStats.maxIn14Days.end)}</small></li>
          <li>Meeste in 30 dagen: <strong>${streakStats.maxIn30Days.count}×</strong><br><small>${formatConcertShort(streakStats.maxIn30Days.start)} t/m ${formatConcertShort(streakStats.maxIn30Days.end)}</small></li>
          <li>Kortste pauze tussen 2 concerten: <strong>${shortestGapText}</strong><br><small>${shortestGapSub}</small></li>
        </ul>
      </div>

      <div class="stats-box">
        <h3>🚗 Afstanden</h3>
        <ul class="stats-list">
          <li>Verste locatie: <strong>${farthestText}</strong></li>
          <li>Gemiddelde enkele reis: <strong>${distanceStats.averageDistance} km</strong></li>
          <li>Geschatte totaalafstand retour: <strong>${distanceStats.totalDistance.toLocaleString("nl-NL")} km</strong></li>
          <li>Concerten met bekende plaats: <strong>${distanceStats.knownCount}/${past.length}</strong></li>
        </ul>
        <div class="chart-note">Afstanden zijn hemelsbreed en berekend op basis van de plaatsnaam achter het streepje in de locatie.</div>
      </div>

      <div class="stats-box">
        <h3>🏁 Eerste & laatste bezochte concert</h3>
        <div class="first-last-block">
          <div class="first-last-group">
            <div class="first-last-label">Eerste:</div>
            <ul class="stats-list nested-stats-list">
              <li><strong>${formatConcertShort(extra.firstConcert)}</strong></li>
            </ul>
          </div>

          <div class="first-last-group">
            <div class="first-last-label">Laatste:</div>
            <ul class="stats-list nested-stats-list">
              <li><strong>${formatConcertShort(extra.lastConcert)}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="stats-sections rankings-stats-sections">
      <div class="stats-box full-ranking-box">
        <div class="stats-box-header">
          <div>
            <h3>🎤 Alle artiesten</h3>
            <p>Gesorteerd op aantal bezochte concerten.</p>
          </div>
          <span class="pill">${sortedArtists.length} artiesten</span>
        </div>
        ${createFullRankingList(sortedArtists, "artist")}
      </div>

      <div class="stats-box full-ranking-box">
        <div class="stats-box-header">
          <div>
            <h3>📍 Alle locaties</h3>
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
// CONCERTKAARTEN
// =========================================================

function createConcertCard(concert, isPast) {
  const card = document.createElement("div");
  card.classList.add("concert-card");
  card.dataset.datetime = concert.datetime;

  card.innerHTML = `
    <div class="info">
      <div>
        <div class="details">
          <h3>${escapeHtml(concert.artist)}</h3>
          <p>${escapeHtml(concert.location)}</p>
        </div>
        <div class="date">${formatDate(concert.datetime)}</div>
      </div>
      <div class="countdown"></div>
    </div>
  `;

  if (isPast) card.classList.add("past");
  return card;
}

// =========================================================
// COUNTDOWNS
// =========================================================

function updateCountdowns() {
  const now = new Date();

  document.querySelectorAll(".concert-card").forEach(card => {
    const target = new Date(card.dataset.datetime);
    const countdownEl = card.querySelector(".countdown");
    if (!countdownEl || Number.isNaN(target.getTime())) return;

    if (isSameDay(target, now)) {
      countdownEl.textContent = "Vandaag ⚡🎸";
      countdownEl.style.color = "#16a34a";
      countdownEl.classList.remove("finished");
      return;
    }

    const diffMs = target - now;

    if (diffMs > 0) {
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs / 3600000) % 24);
      const minutes = Math.floor((diffMs / 60000) % 60);

      countdownEl.textContent = `${days}d ${hours}u ${minutes}m`;
      countdownEl.style.color = "";
      countdownEl.classList.remove("finished");
      return;
    }

    const daysAgo = daysBetweenCalendarDates(target, now);
    const diff = diffYMDDays(target, now);
    const ymd = `${diff.years} jaar, ${diff.months} maanden en ${diff.days} dagen geleden`;

    countdownEl.innerHTML = `
      ${daysAgo} dagen geleden 🎶
      <br>
      <small style="font-size:11px; opacity:0.7;">${ymd}</small>
    `;

    countdownEl.classList.add("finished");
  });
}

// =========================================================
// TOGGLES
// =========================================================

function setupToggle(toggleSelector, panelSelector, arrowSelector) {
  const toggle = document.querySelector(toggleSelector);
  const panel = document.querySelector(panelSelector);
  const arrow = document.querySelector(arrowSelector);

  if (!toggle || !panel || !arrow) return;
  if (toggle.dataset.toggleReady === "true") return;

  toggle.dataset.toggleReady = "true";

  toggle.addEventListener("click", () => {
    panel.classList.toggle("expanded");
    arrow.style.transform = panel.classList.contains("expanded") ? "rotate(180deg)" : "rotate(0deg)";
  });
}

// =========================================================
// RENDER ALLES
// =========================================================

function renderConcerts() {
  ensureLayout();

  const now = new Date();
  const upcomingList = document.getElementById("upcoming-list");
  const archiveList = document.getElementById("archive-list");
  const statsList = document.getElementById("stats-list");
  const archiveToggle = document.querySelector(".archive-toggle");
  const statsToggle = document.querySelector(".stats-toggle");

  if (!upcomingList || !archiveList || !statsList || !archiveToggle || !statsToggle) {
    console.error("Niet alle benodigde HTML-elementen zijn gevonden.");
    return;
  }

  upcomingList.innerHTML = "";
  archiveList.innerHTML = "";
  statsList.innerHTML = "";

  const upcoming = concerts
    .filter(c => new Date(c.datetime) >= now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const past = concerts
    .filter(c => new Date(c.datetime) < now)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  archiveToggle.innerHTML = `<span class="archive-arrow arrow">▼</span> Archief (${past.length})`;
  statsToggle.innerHTML = `<span class="stats-arrow arrow">▼</span> Statistieken`;

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `<p class="empty-message">Er staan momenteel geen komende concerten in de planning.</p>`;
  } else {
    upcoming.forEach(c => upcomingList.appendChild(createConcertCard(c, false)));
  }

  past.forEach(c => archiveList.appendChild(createConcertCard(c, true)));
  statsList.appendChild(renderStatsBlock(past));

  updateCountdowns();

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdowns, 1000);

  setupToggle(".archive-toggle", "#archive-list", ".archive-arrow");
  setupToggle(".stats-toggle", "#stats-list", ".stats-arrow");
}
