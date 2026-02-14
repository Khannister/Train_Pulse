// app.js — TrainPulse Demo (Cape Town) with station-to-station movement + stops

// 1) Map center (Cape Town CBD)
const capeTown = { lat: -33.9249, lng: 18.4241 };

// Create map
const map = L.map("map").setView([capeTown.lat, capeTown.lng], 12);

// Add tiles (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// 2) Demo stations (start small: 2 stations)
const stations = [
  { name: "Cape Town", lat: -33.9253, lng: 18.4246 },
  { name: "Woodstock", lat: -33.9286, lng: 18.4486 },
];

// Add station markers
stations.forEach((s) => {
  L.marker([s.lat, s.lng])
    .addTo(map)
    .bindPopup(`🚉 Station: <b>${s.name}</b>`);
});

// Draw route line between stations (looks professional)
L.polyline(
  stations.map((s) => [s.lat, s.lng]),
  { weight: 4 }
).addTo(map);

// 3) Train marker (starts at first station)
const train = { id: "Train 01", lat: stations[0].lat, lng: stations[0].lng };

const trainMarker = L.marker([train.lat, train.lng])
  .addTo(map)
  .bindPopup(`🚆 <b>${train.id}</b><br>Starting at: <b>${stations[0].name}</b>`);

trainMarker.openPopup();

// 4) Station-to-station movement with stops (bounces between 2 stations)
let currentStationIndex = 0;
let nextStationIndex = 1;

// Movement settings
const updateEveryMs = 100; // how often we update the marker
const step = 0.01; // speed: 0.01 = ~100 updates to reach next station
const stopDurationMs = 3000; // wait time at each station

let t = 0; // progress 0 -> 1 between stations
let isStopped = false;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function startStopAtStation(stationIndex) {
  isStopped = true;

  const station = stations[stationIndex];
  trainMarker.bindPopup(
    `🚆 <b>${train.id}</b><br>Status: <b>Stopped</b><br>At: <b>${station.name}</b>`
  );
  trainMarker.openPopup();

  setTimeout(() => {
    isStopped = false;

    // Swap direction (because we currently have only 2 stations)
    const temp = currentStationIndex;
    currentStationIndex = nextStationIndex;
    nextStationIndex = temp;

    t = 0; // reset trip progress
  }, stopDurationMs);
}

function moveTrain() {
  if (isStopped) return;

  const from = stations[currentStationIndex];
  const to = stations[nextStationIndex];

  t += step;

  // Arrived
  if (t >= 1) {
    trainMarker.setLatLng([to.lat, to.lng]);
    startStopAtStation(nextStationIndex);
    return;
  }

  // In transit
  const lat = lerp(from.lat, to.lat, t);
  const lng = lerp(from.lng, to.lng, t);

  trainMarker.setLatLng([lat, lng]);
}

// Start movement loop
setInterval(moveTrain, updateEveryMs);

// 5) Recenter button
const btn = document.getElementById("btnRecenter");
if (btn) {
  btn.addEventListener("click", () => {
    map.setView([capeTown.lat, capeTown.lng], 12);
  });
}
