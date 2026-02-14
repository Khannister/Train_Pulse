// app.js — Southern Line (Cape Town -> Retreat) demo
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
// Note: coordinates are demo-friendly approximations to make the concept work visually.
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
let trainLatLng = [stations[0].lat, stations[0].lng];

const trainMarker = L.marker(trainLatLng)
  .addTo(map)
  .bindPopup(`🚆 <b>${train.id}</b><br>Starting at <b>${stations[0].name}</b>`);
trainMarker.openPopup();

// --- Station-to-station simulation with stops ---
let currentIndex = 0;       // train is at stations[currentIndex]
let nextIndex = 1;          // train moves toward stations[nextIndex]
let phase = "STOPPED";      // "STOPPED" | "MOVING" | "DONE"
let t = 0;                  // progress 0..1 while moving

const updateEveryMs = 100;   // movement update tick
const travelMs = 9000;       // time to travel between stations (9s)
const stopMs = 2500;         // stop at each station (2.5s)

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function setTrainPopup(statusText) {
  const currentName = stations[currentIndex]?.name ?? "—";
  const nextName = stations[nextIndex]?.name ?? "—";
  trainMarker.bindPopup(
    `🚆 <b>${train.id}</b><br>Status: <b>${statusText}</b><br>` +
      `Current: <b>${currentName}</b><br>` +
      `Next: <b>${phase === "DONE" ? "—" : nextName}</b>`
  );
}

function stopAtStation() {
  phase = "STOPPED";
  t = 0;

  // Snap exactly to station
  const s = stations[currentIndex];
  trainMarker.setLatLng([s.lat, s.lng]);
  setTrainPopup("Stopped");
  trainMarker.openPopup();

  // If we reached Retreat, finish
  if (currentIndex >= stations.length - 1) {
    phase = "DONE";
    setTrainPopup("Arrived (Retreat)");
    return;
  }

  // After stop, start moving
  setTimeout(() => {
    if (phase === "DONE") return;
    phase = "MOVING";
    setTrainPopup("Moving");
  }, stopMs);
}

function tickMove() {
  if (phase !== "MOVING") return;

  const from = stations[currentIndex];
  const to = stations[nextIndex];

  // increase progress based on time
  t += updateEveryMs / travelMs;

  if (t >= 1) {
    // Arrive at next station
    currentIndex = nextIndex;
    nextIndex = Math.min(currentIndex + 1, stations.length - 1);
    stopAtStation();
    return;
  }

  const lat = lerp(from.lat, to.lat, t);
  const lng = lerp(from.lng, to.lng, t);
  trainMarker.setLatLng([lat, lng]);
}

// Start simulation: stop at Cape Town, then go
stopAtStation();
setInterval(tickMove, updateEveryMs);
