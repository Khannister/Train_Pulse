// 1) Start the map centered around Cape Town CBD
const capeTown = { lat: -33.9249, lng: 18.4241 };

const map = L.map("map").setView([capeTown.lat, capeTown.lng], 12);

// 2) Add a map tile layer (the actual map graphics)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// 3) Add a couple of station markers (demo data)
const stations = [
  { name: "Cape Town", lat: -33.9253, lng: 18.4246 },
  { name: "Woodstock", lat: -33.9286, lng: 18.4486 },
];

stations.forEach((s) => {
  L.marker([s.lat, s.lng]).addTo(map).bindPopup(`🚉 Station: <b>${s.name}</b>`);
});

// 4) Add a train marker (demo data)
const train = { id: "Train 01", lat: -33.9272, lng: 18.4360 };

const trainMarker = L.marker([train.lat, train.lng])
  .addTo(map)
  .bindPopup(`🚆 <b>${train.id}</b><br>Status: Demo`);

// Optional: open popup on load so you see it works
trainMarker.openPopup();

// 5) Button: recenter map
document.getElementById("btnRecenter").addEventListener("click", () => {
  map.setView([capeTown.lat, capeTown.lng], 12);
});

// --- Smooth train movement demo: interpolate between two points ---

const start = { lat: -33.9253, lng: 18.4246 }; // Cape Town Station
const end   = { lat: -33.9286, lng: 18.4486 }; // Woodstock Station

let t = 0;                 // 0 -> 1
const step = 0.01;         // speed (smaller = slower)

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function animateTrain() {
  t += step;
  if (t > 1) t = 0; // loop

  const lat = lerp(start.lat, end.lat, t);
  const lng = lerp(start.lng, end.lng, t);

  trainMarker.setLatLng([lat, lng]);
}

setInterval(animateTrain, 100); // every 100ms = smoother
