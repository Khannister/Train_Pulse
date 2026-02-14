// app.js — Southern Line (Cape Town -> Retreat) demo + Uber-style bottom panel
// Plain HTML + Leaflet CDN version (NOT React)

const capeTownCenter = { lat: -33.96, lng: 18.46 };

// 1) Create map
const map = L.map("map").setView([capeTownCenter.lat, capeTownCenter.lng], 12);

// 2) Add tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// 3) Southern Line stations (Cape Town -> Retreat)
// Demo-friendly coordinates (good enough for capstone simulation visuals)
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
  { name: "Wittebome", lat: -34.0140, lng: 18.4708 },
  { name: "Plumstead", lat: -34.0220, lng: 18.4697 },
  { name: "Steurhof", lat: -34.0291, lng: 18.4689 },
  { name: "Diep River", lat: -34.0338, lng: 18.4587 },
  { name: "Heathfield", lat: -34.0459, lng: 18.4656 },
  { name: "Retreat", lat: -34.0600, lng: 18.4630 },
];

// 4) Add station markers
stations.forEach((s) => {
  L.circleMarker([s.lat, s.lng], { radius: 6 })
    .addTo(map)
    .bindPopup(`🚉 <b>${s.name}</b>`);
});

// 5) Draw route line
const routeLatLngs = stations.map((s) => [s.lat, s.lng]);
L.polyline(routeLatLngs, { weight: 4 }).addTo(map);

// 6) Train marker starts at first station
const train = { id: "Train 01" };
const trainMarker = L.marker([stations[0].lat, stations[0].lng]).addTo(map);

// --- Bottom panel elements ---
const uiStatus = document.getElementById("uiStatus");
const uiCountdown = document.getElementById("uiCountdown");
const uiCurrent = document.getElementById("uiCurrent");
const uiNext = document.getElementById("uiNext");
const btnTrack = document.getElementById("btnTrack");

// --- Simulation settings ---
const updateEveryMs = 100; // tick rate
const travelMs = 9000; // time to travel between stations
const stopMs = 2500; // stop at each station

// --- Simulation state ---
let currentIndex = 0;
let nextIndex = 1;
let phase = "STOPPED"; // "STOPPED" | "MOVING" | "DONE"

let travelStartAt = 0; // timestamp when movement started
let stopEndsAt = 0; // timestamp when stop ends

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

function updateBottomPanel(now) {
  const currentName = stations[currentIndex]?.name ?? "—";
  const nextName = phase === "DONE" ? "—" : stations[nextIndex]?.name ?? "—";

  uiCurrent.textContent = currentName;
  uiNext.textContent = nextName;

  if (phase === "DONE") {
    uiStatus.textContent = "Status: Arrived";
    uiCountdown.textContent = "—";
    return;
  }

  if (phase === "STOPPED") {
    uiStatus.textContent = "Status: Stopped";
    uiCountdown.textContent = `Departing in ${formatCountdown(stopEndsAt - now)}`;
    return;
  }

  // MOVING
  uiStatus.textContent = "Status: Moving";
  uiCountdown.textContent = `Arriving in ${formatCountdown(travelMs - (now - travelStartAt))}`;
}

function setTrainPopup() {
  const currentName = stations[currentIndex]?.name ?? "—";
  const nextName = phase === "DONE" ? "—" : stations[nextIndex]?.name ?? "—";
  const statusText =
    phase === "DONE" ? "Arrived" : phase === "STOPPED" ? "Stopped" : "Moving";

  trainMarker.bindPopup(
    `🚆 <b>${train.id}</b><br>Status: <b>${statusText}</b><br>` +
      `Current: <b>${currentName}</b><br>` +
      `Next: <b>${nextName}</b>`
  );
}

function arriveAtStation(index) {
  currentIndex = index;

  // Snap exactly to the station coordinate
  const s = stations[currentIndex];
  trainMarker.setLatLng([s.lat, s.lng]);

  // If final station, finish
  if (currentIndex >= stations.length - 1) {
    phase = "DONE";
    setTrainPopup();
    trainMarker.openPopup();
    return;
  }

  // Otherwise stop here briefly, then depart
  phase = "STOPPED";
  stopEndsAt = Date.now() + stopMs;

  // Update next index
  nextIndex = Math.min(currentIndex + 1, stations.length - 1);

  setTrainPopup();
  trainMarker.openPopup();
}

function departIfReady(now) {
  if (phase !== "STOPPED") return;
  if (now < stopEndsAt) return;

  // Start moving
  phase = "MOVING";
  travelStartAt = now;
  setTrainPopup();
}

function moveIfMoving(now) {
  if (phase !== "MOVING") return;

  const from = stations[currentIndex];
  const to = stations[nextIndex];

  const elapsed = now - travelStartAt;
  const t = elapsed / travelMs;

  if (t >= 1) {
    // Arrive at next station
    arriveAtStation(nextIndex);
    return;
  }

  // In transit (interpolate position)
  const lat = lerp(from.lat, to.lat, t);
  const lng = lerp(from.lng, to.lng, t);
  trainMarker.setLatLng([lat, lng]);
}

// Start simulation: arrive at Cape Town (stop), then move onward
arriveAtStation(0);

// Main loop
setInterval(() => {
  const now = Date.now();

  departIfReady(now);
  moveIfMoving(now);
  updateBottomPanel(now);
}, updateEveryMs);

// Track button (demo action)
if (btnTrack) {
  btnTrack.addEventListener("click", () => {
    trainMarker.openPopup();
    map.panTo(trainMarker.getLatLng());
  });
}
