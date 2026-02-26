/*
  app.js — TrainPulse (Capstone Project)

  NOTE FOR EXAMINERS:
  - This project uses plain JavaScript (no React) to keep it simple and easy to run.
  - The map uses Leaflet + OpenStreetMap tiles loaded via CDN.
  - Train movement is simulated using setInterval to demonstrate real-time logic.
    (There is no public real-time Metrorail API available for this demo.)

  Main responsibilities of this file:
  1) Screen navigation: Landing -> Route selection -> Dashboard
  2) Route direction logic (Cape Town -> Retreat OR Retreat -> Cape Town)
  3) Train simulation: stop at each station, then travel to next
  4) Bottom-panel UI updates (ETA, current/next station, status)
*/

// Map default center (roughly Cape Town CBD) used for initial view.

const capeTownCenter = { lat: -33.96, lng: 18.46 };

// =====================
// Data: Southern Line stations (Cape Town -> Retreat)
// =====================
// Demo-friendly coordinates (good enough for capstone simulation visuals).
// The route can be reversed in setRoute() to support both travel directions.

const stations = [
  { name: "Cape Town", lat: -33.9222, lng: 18.4264 },
  { name: "Woodstock", lat: -33.9253, lng: 18.4461 },
  { name: "Salt River", lat: -33.9272, lng: 18.4653 },
  { name: "Observatory", lat: -33.9362, lng: 18.4695 },
  { name: "Mowbray", lat: -33.9467, lng: 18.4739 },
  { name: "Rosebank", lat: -33.9547, lng: 18.4731 },
  { name: "Rondebosch", lat: -33.9622, lng: 18.4725 },
  { name: "Newlands", lat: -33.9742, lng: 18.4675 },
  { name: "Claremont", lat: -33.9817, lng: 18.4669 },
  { name: "Harfield Rd", lat: -33.9884, lng: 18.4714 },
  { name: "Kenilworth", lat: -33.9955, lng: 18.4699 },
  { name: "Wynberg", lat: -34.0025, lng: 18.4688 },
  { name: "Wittebome", lat: -34.014, lng: 18.4708 },
  { name: "Plumstead", lat: -34.022, lng: 18.4697 },
  { name: "Steurhof", lat: -34.0291, lng: 18.4689 },
  { name: "Diep River", lat: -34.0338, lng: 18.4587 },
  { name: "Heathfield", lat: -34.0459, lng: 18.4656 },
  { name: "Retreat", lat: -34.06, lng: 18.463 },
];


// =====================
// Active route (changes when direction changes)
// =====================
let routeStations = stations;
let routeDirection = 'toRetreat'; // 'toRetreat' | 'toCapeTown'


// =====================
// Simulation settings
// =====================
const updateEveryMs = 100; // tick rate
const travelMs = 9000; // time to travel between routeStations
const stopMs = 2500; // stop at each station

// =====================
// Simulation state
// =====================
let currentIndex = 0;
let nextIndex = 1;
let phase = "STOPPED"; // "STOPPED" | "MOVING" | "DONE"

let travelStartAt = 0; // timestamp when movement started
let stopEndsAt = 0; // timestamp when stop ends

// =====================
// “Uber feel” tracking state
// =====================
let selectedStationIndex = 0; // “Your station”
let isTracking = false;

// =====================
// Map objects (created on start)
// =====================
let map;
let stationMarkers = [];
let trainMarker;
let intervalId;


function setRoute(direction) {
  routeDirection = direction;
  routeStations = direction === "toCapeTown" ? [...stations].reverse() : stations;

  // Reset simulation state for the new route.
  // This ensures the train always starts at the first station of the chosen direction.
  currentIndex = 0;
  nextIndex = 1;
  phase = "STOPPED";
  travelStartAt = 0;
  stopEndsAt = 0;

  selectedStationIndex = 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function highlightSelectedStation() {
  // Visual emphasis for the commuter's selected station.
  // This makes it easier to see “your station” on the map.
  stationMarkers.forEach((m, idx) => {
    if (idx === selectedStationIndex) {
      m.setStyle({ radius: 8, weight: 3 });
    } else {
      m.setStyle({ radius: 6, weight: 2 });
    }
  });
}

// Estimate ETA from “now” to the selected station using the same travel/stop timing as the simulation.
// This keeps the UI consistent with what the user sees on the map.
function etaToStationMs(now, targetIndex) {
  if (phase === "DONE") return null;

  // If target already passed
  if (targetIndex < currentIndex) return "PASSED";

  // If train currently at the target station
  if (targetIndex === currentIndex) {
    if (phase === "STOPPED") return 0;
    return "PASSED";
  }

  let eta = 0;

  if (phase === "STOPPED") {
    eta += Math.max(0, stopEndsAt - now); // remaining stop
  } else if (phase === "MOVING") {
    eta += Math.max(0, travelMs - (now - travelStartAt)); // remaining travel to next
  }

  let simStation = phase === "MOVING" ? nextIndex : currentIndex;

  while (simStation < targetIndex) {
    eta += travelMs; // travel to next station
    simStation += 1;

    if (simStation < targetIndex) {
      eta += stopMs; // stop at intermediate routeStations
    }
  }

  return eta;
}

function setTrainPopup(trainId) {
  // Leaflet popup content shown when tracking the train marker.
  const currentName = routeStations[currentIndex]?.name ?? "—";
  const nextName = phase === "DONE" ? "—" : routeStations[nextIndex]?.name ?? "—";
  const statusText =
    phase === "DONE" ? "Arrived" : phase === "STOPPED" ? "Stopped" : "Moving";

  trainMarker.bindPopup(
    `🚆 <b>${trainId}</b><br>Status: <b>${statusText}</b><br>` +
      `Current: <b>${currentName}</b><br>` +
      `Next: <b>${nextName}</b>`
  );
}

function arriveAtStation(trainId, index) {
  currentIndex = index;

  // Snap exactly to the station coordinate
  const s = routeStations[currentIndex];
  trainMarker.setLatLng([s.lat, s.lng]);

  // Edge case: If final station, end the simulation.
  // This prevents array overflow and ensures the UI doesn't crash.
  if (currentIndex >= routeStations.length - 1) {
    phase = "DONE";
    setTrainPopup(trainId);
    trainMarker.openPopup();
    return;
  }

  // Otherwise stop here briefly, then depart
  phase = "STOPPED";
  stopEndsAt = Date.now() + stopMs;

  // Update next index
  nextIndex = Math.min(currentIndex + 1, routeStations.length - 1);

  setTrainPopup(trainId);

  // If tracking, keep camera on train
  if (isTracking) map.panTo(trainMarker.getLatLng());
}

function departIfReady(trainId, now) {
  // During STOPPED phase, wait until the stop timer finishes.
  if (phase !== "STOPPED") return;
  if (now < stopEndsAt) return;

  phase = "MOVING";
  travelStartAt = now;
  setTrainPopup(trainId);
}

function moveIfMoving(trainId, now) {
  // During MOVING phase, interpolate between current station and next station.
  if (phase !== "MOVING") return;

  const from = routeStations[currentIndex];
  const to = routeStations[nextIndex];

  const elapsed = now - travelStartAt;
  const t = elapsed / travelMs;

  if (t >= 1) {
    arriveAtStation(trainId, nextIndex);
    return;
  }

  const lat = lerp(from.lat, to.lat, t);
  const lng = lerp(from.lng, to.lng, t);
  trainMarker.setLatLng([lat, lng]);

  if (isTracking) map.panTo(trainMarker.getLatLng());
}

function updateBottomPanel(now, ui, trainId) {
  // Updates all text values in the fixed bottom panel.
  // This is the main “commuter information” view (current/next/ETA/status).
  const currentName = routeStations[currentIndex]?.name ?? "—";
  const nextName = phase === "DONE" ? "—" : routeStations[nextIndex]?.name ?? "—";

  ui.uiCurrent.textContent = currentName;
  ui.uiNext.textContent = nextName;

  // Status + countdown
  if (phase === "DONE") {
    ui.uiStatus.textContent = "Status: Arrived";
    ui.uiCountdown.textContent = "—";
  } else if (phase === "STOPPED") {
    ui.uiStatus.textContent = isTracking
      ? "Status: Approaching your station"
      : "Status: Stopped";
    ui.uiCountdown.textContent = `Departing in ${formatCountdown(stopEndsAt - now)}`;
  } else {
    const remaining = travelMs - (now - travelStartAt);
    ui.uiStatus.textContent = isTracking
      ? "Status: Approaching your station"
      : "Status: Moving";
    ui.uiCountdown.textContent = `Arriving next in ${formatCountdown(remaining)}`;
  }

  // ETA to “your station”
  const eta = etaToStationMs(now, selectedStationIndex);
  if (eta === null) {
    ui.uiEtaToYou.textContent = "—";
  } else if (eta === "PASSED") {
    ui.uiEtaToYou.textContent = "Train already passed";
  } else if (eta === 0) {
    ui.uiEtaToYou.textContent = "At your station";
  } else {
    ui.uiEtaToYou.textContent = formatCountdown(eta);
  }

  // Button label
  ui.btnTrack.textContent = isTracking ? "Stop tracking" : `Track ${trainId}`;
}

function buildUiAndHandlers(trainId) {
  // Collect DOM references once and attach event listeners.
  // Keeping these in one place makes the code easier to review.
  // --- Bottom panel elements ---
  const ui = {
    uiStatus: document.getElementById("uiStatus"),
    uiCountdown: document.getElementById("uiCountdown"),
    uiCurrent: document.getElementById("uiCurrent"),
    uiNext: document.getElementById("uiNext"),
    uiEtaToYou: document.getElementById("uiEtaToYou"),
    stationSelect: document.getElementById("stationSelect"),
    btnTrack: document.getElementById("btnTrack"),
  };

  // Build station dropdown
  ui.stationSelect.innerHTML = "";
  routeStations.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = s.name;
    ui.stationSelect.appendChild(opt);
  });

  ui.stationSelect.value = String(selectedStationIndex);
  highlightSelectedStation();

  ui.stationSelect.addEventListener("change", () => {
    // When the commuter selects a station, we highlight it and pan the map.
    selectedStationIndex = parseInt(ui.stationSelect.value, 10);
    highlightSelectedStation();

    // Pan to selected station (pickup vibe)
    const s = routeStations[selectedStationIndex];
    map.panTo([s.lat, s.lng]);
    stationMarkers[selectedStationIndex].openPopup();
  });

  // Track button toggles map-follow
  ui.btnTrack.addEventListener("click", () => {
    // Toggle “follow train” behavior (similar to ride-sharing tracking).
    isTracking = !isTracking;
    if (isTracking) {
      trainMarker.openPopup();
      map.panTo(trainMarker.getLatLng());
    }
  });

  return ui;
}

function startTrainPulse() {
  // Creates the map and starts the simulation loop.
  // IMPORTANT: This is only called after the dashboard is visible.
  // Leaflet needs a visible container to calculate correct sizes.

  // If restarting, clean up previous run (prevents duplicate intervals/maps).
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
  stationMarkers = [];
  trainMarker = null;


  // Reset state for a clean start.
  // This makes the simulation deterministic for marking/demo purposes.
  currentIndex = 0;
  nextIndex = 1;
  phase = "STOPPED";
  travelStartAt = 0;
  stopEndsAt = 0;
  selectedStationIndex = 0;
  isTracking = false;

  const train = { id: "Train 01" };

  // 1) Create map (now that it's visible)
  map = L.map("map").setView([capeTownCenter.lat, capeTownCenter.lng], 12);

  // 2) Add base map tiles (OpenStreetMap)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // 3) Add station markers + keep references for highlighting
  stationMarkers = [];
  routeStations.forEach((s) => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 6,
      weight: 2,
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindPopup(`🚉 <b>${s.name}</b>`);
    stationMarkers.push(marker);
  });

  // 4) Draw route polyline
  const routeLatLngs = routeStations.map((s) => [s.lat, s.lng]);
  L.polyline(routeLatLngs, { weight: 4 }).addTo(map);

  // 5) Train marker starts at the first station of the selected direction
  trainMarker = L.marker([routeStations[0].lat, routeStations[0].lng]).addTo(map);

  const ui = buildUiAndHandlers(train.id);

  // Start simulation at first station
  arriveAtStation(train.id, 0);

  // Main simulation loop
  intervalId = window.setInterval(() => {
    const now = Date.now();
    departIfReady(train.id, now);
    moveIfMoving(train.id, now);
    updateBottomPanel(now, ui, train.id);
  }, updateEveryMs);

  // Make sure map tiles render correctly after showing (common Leaflet gotcha).
  setTimeout(() => map.invalidateSize(), 50);
}


function showRouteSelection() {
  // Navigation: Landing -> Route selection
  const landing = document.getElementById("landing");
  const routeSelect = document.getElementById("routeSelect");
  const appShell = document.getElementById("appShell");

  landing.classList.add("is-hidden");
  routeSelect.classList.add("is-visible");
  routeSelect.setAttribute("aria-hidden", "false");

  // Make sure dashboard is hidden until tracking starts
  appShell.classList.remove("is-visible");
  appShell.setAttribute("aria-hidden", "true");
}

function showLanding() {
  // Navigation: Route selection -> Landing
  const landing = document.getElementById("landing");
  const routeSelect = document.getElementById("routeSelect");
  const appShell = document.getElementById("appShell");

  routeSelect.classList.remove("is-visible");
  routeSelect.setAttribute("aria-hidden", "true");

  appShell.classList.remove("is-visible");
  appShell.setAttribute("aria-hidden", "true");

  landing.classList.remove("is-hidden");
}

function showDashboardAndStartSelectedRoute() {
  // Navigation: Route selection -> Dashboard
  // Starts the simulation after the dashboard is visible.
  const landing = document.getElementById("landing");
  const routeSelect = document.getElementById("routeSelect");
  const appShell = document.getElementById("appShell");

  landing.classList.add("is-hidden");
  routeSelect.classList.remove("is-visible");
  routeSelect.setAttribute("aria-hidden", "true");

  appShell.classList.add("is-visible");
  appShell.setAttribute("aria-hidden", "false");

  // Update the subtitle based on direction
  const subtitle = document.getElementById("uiLineSubtitle");
  if (subtitle) {
    subtitle.textContent =
      routeDirection === "toCapeTown"
        ? "Southern Line (Retreat → Cape Town)"
        : "Southern Line (Cape Town → Retreat)";
  }

  startTrainPulse();
}

function setupRouteSelectionUi() {
  // Route selection UI:
  // - Clicking a direction toggles the selected button style.
  // - We also reverse station order to simulate opposite direction travel.
  const dirToCapeTown = document.getElementById("dirToCapeTown");
  const dirToRetreat = document.getElementById("dirToRetreat");
  const hint = document.getElementById("routeHint");

  function applyDirection(direction) {
    setRoute(direction);

    // Toggle UI (active state + hint text)
    if (direction === "toCapeTown") {
      dirToCapeTown.classList.add("active");
      dirToCapeTown.setAttribute("aria-checked", "true");
      dirToCapeTown.innerHTML = "<span>To Cape Town</span><span class=\"check\" aria-hidden=\"true\">✓</span>";

      dirToRetreat.classList.remove("active");
      dirToRetreat.setAttribute("aria-checked", "false");
      dirToRetreat.innerHTML = "<span>To Retreat</span>";
      hint.textContent =
        "You’ll see real-time updates for trains on the Southern Line traveling to Cape Town";
    } else {
      dirToRetreat.classList.add("active");
      dirToRetreat.setAttribute("aria-checked", "true");
      dirToRetreat.innerHTML = "<span>To Retreat</span><span class=\"check\" aria-hidden=\"true\">✓</span>";

      dirToCapeTown.classList.remove("active");
      dirToCapeTown.setAttribute("aria-checked", "false");
      dirToCapeTown.innerHTML = "<span>To Cape Town</span>";
      hint.textContent =
        "You’ll see real-time updates for trains on the Southern Line traveling to Retreat";
    }
  }

  // default
  applyDirection("toRetreat");

  dirToCapeTown.addEventListener("click", () => applyDirection("toCapeTown"));
  dirToRetreat.addEventListener("click", () => applyDirection("toRetreat"));
}

document.addEventListener("DOMContentLoaded", () => {
  // Entry point: wire up button clicks once the DOM is ready.
  const btnStart = document.getElementById("btnStart");
  const backBtn = document.getElementById("routeBackBtn");
  const startTrackingBtn = document.getElementById("startTrackingBtn");

  btnStart.addEventListener("click", showRouteSelection);
  backBtn.addEventListener("click", showLanding);
  startTrackingBtn.addEventListener("click", showDashboardAndStartSelectedRoute);

  setupRouteSelectionUi();
});
