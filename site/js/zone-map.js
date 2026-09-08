(function () {
  var el = document.getElementById('zone-map');
  if (!el || typeof L === 'undefined') return;

  var base = [48.579, -1.098]; // Saint-Hilaire-du-Harcouët

  // Contour de la zone de chalandise, extrait de la carte fournie (tracé
  // vert) : Cotentin sud, Saint-Lô, Caen au nord-est, Vire Normandie et
  // Sourdeval au centre, Fougères au sud, Granville à l'ouest.
  var zone = [
    [48.2999, -0.7891], [48.3338, -0.9572], [48.3107, -1.039], [48.3535, -1.1804],
    [48.3441, -1.2425], [48.3993, -1.336], [48.4442, -1.4996], [48.5167, -1.5574],
    [48.5652, -1.5605], [48.5881, -1.5852], [48.6761, -1.5259], [48.8478, -1.6502],
    [48.9437, -1.6138], [49.0114, -1.6611], [49.1319, -1.6041], [49.2503, -1.4222],
    [49.1985, -1.3216], [49.1806, -1.1906], [49.2325, -1.0909], [49.2474, -0.9968],
    [49.1458, -0.8789], [49.0941, -0.7694], [49.1234, -0.6202], [49.2164, -0.4598],
    [49.2261, -0.38], [49.2125, -0.342], [49.1609, -0.3318], [49.1656, -0.2972],
    [49.1152, -0.2648], [49.0094, -0.2924], [48.9259, -0.2878], [48.8569, -0.3204],
    [48.8087, -0.3013], [48.7282, -0.3162], [48.5957, -0.2448], [48.504, -0.2314],
    [48.39, -0.4035], [48.353, -0.5156], [48.3509, -0.6361], [48.3111, -0.7163],
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
