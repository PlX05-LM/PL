(function () {
  var el = document.getElementById('zone-map');
  if (!el || typeof L === 'undefined') return;

  var base = [48.579, -1.098]; // Saint-Hilaire-du-Harcouët

  // Contour de la zone d'intervention : un rectangle aux coins arrondis
  // calé sur les repères du tracé fourni (Caen au nord-est, la forêt des
  // Andaines/Bagnoles-de-l'Orne à l'est, Fougères au sud, Granville et la
  // côte à l'ouest, jusqu'au sud du Cotentin au nord), dans le sens horaire.
  var zone = [
    [49.19, -1.62], [49.1486, -1.6117], [49.11, -1.5874], [49.0769, -1.5488],
    [49.0514, -1.4984], [49.0355, -1.4398], [49.03, -1.3769], [49.03, -0.5631],
    [49.0355, -0.5002], [49.0514, -0.4416], [49.0769, -0.3912], [49.11, -0.3526],
    [49.1486, -0.3283], [49.19, -0.32], [48.51, -0.32], [48.5514, -0.3283],
    [48.59, -0.3526], [48.6231, -0.3912], [48.6486, -0.4416], [48.6645, -0.5002],
    [48.67, -0.5631], [48.67, -1.3769], [48.6645, -1.4398], [48.6486, -1.4984],
    [48.6231, -1.5488], [48.59, -1.5874], [48.5514, -1.6117], [48.51, -1.62],
  ];

  var map = L.map(el, { scrollWheelZoom: false });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  L.polygon(zone, {
    color: '#c9ae7b',
    weight: 2,
    dashArray: '6 5',
    fillColor: '#c9ae7b',
    fillOpacity: 0.12,
  }).addTo(map);

  L.marker(base, {
    icon: L.divIcon({
      className: 'zone-pin',
      html: '<span style="--pin:#c9ae7b"></span>',
      iconSize: [20, 20],
    }),
  })
    .addTo(map)
    .bindTooltip('Saint-Hilaire-du-Harcouët — basé ici', {
      permanent: true,
      direction: 'right',
      offset: [12, 0],
      className: 'zone-tooltip zone-tooltip-base',
    });

  map.fitBounds(L.latLngBounds(zone), { padding: [24, 24] });
})();
