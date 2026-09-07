(function () {
  var el = document.getElementById('zone-map');
  if (!el || typeof L === 'undefined') return;

  var base = [48.579, -1.098]; // Saint-Hilaire-du-Harcouët

  // Contour approximatif de la zone d'intervention, d'après les repères
  // fournis (villes citées le long du tracé), dans le sens horaire.
  var zone = [
    [49.20, -1.58], // Saint-Germain-sur-Ay
    [49.22, -0.35], // Blainville-sur-Orne (nord de Caen)
    [49.14, -0.35], // Ifs / sud de Caen
    [49.02, -0.47], // Thury-Harcourt-le-Hom
    [48.75, -0.57], // Flers / Athis-Val de Rouvre
    [48.60, -0.37], // La Ferté-Macé / Bagnoles-de-l'Orne
    [48.48, -0.55], // Lassay-les-Châteaux
    [48.43, -0.80], // Gorron / Ambrières-les-Vallées
    [48.35, -1.20], // vers Fougères (pointe sud)
    [48.45, -1.32], // Val-Couesnon / Maen Roch
    [48.55, -1.51], // Pontorson
    [48.64, -1.51], // Mont-Saint-Michel / Roz-sur-Couesnon
    [48.84, -1.60], // Granville
    [49.05, -1.59], // Agon-Coutainville
    [49.10, -1.56], // Gouville-sur-Mer
    [49.19, -1.57], // Pirou
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
