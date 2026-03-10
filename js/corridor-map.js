/**
 * A4 Corridor Interactive Map Component — Three-Tier System
 * ==========================================================
 * REGIONAL: Wroclaw-Brzeg corridor — major investments, A4 motorway
 * LOCAL:    Olawa area — nearby factories, infrastructure, plot polygons
 * PLOT:     Zoomed to individual plot polygon(s)
 *
 * Dependencies (load via CDN BEFORE this script):
 *   - Leaflet CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
 *   - Leaflet JS:  https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
 *
 * Usage:
 *   A4Map.regional('container-id');
 *   A4Map.local('container-id');
 *   A4Map.plot('container-id', ['133', '135/1']);
 */

var A4Map = (function () {
  'use strict';

  // =========================================================================
  //  EPSG:2180 -> WGS84 Transverse Mercator Inverse Projection
  // =========================================================================

  var TM = {
    a: 6378137.0, f: 1 / 298.257222101,
    lon0: 19 * Math.PI / 180, k0: 0.9993, x0: 500000, y0: -5300000
  };
  TM.b   = TM.a * (1 - TM.f);
  TM.e2  = 2 * TM.f - TM.f * TM.f;
  TM.e   = Math.sqrt(TM.e2);
  TM.ep2 = TM.e2 / (1 - TM.e2);

  function meridianArc(phi) {
    var n = (TM.a - TM.b) / (TM.a + TM.b);
    var n2 = n*n, n3 = n2*n, n4 = n3*n;
    return TM.a / (1+n) * (
      (1 + n2/4 + n4/64) * phi
      - 1.5*(n - n3/8) * Math.sin(2*phi)
      + 15/16*(n2 - n4/4) * Math.sin(4*phi)
      - 35/48*n3 * Math.sin(6*phi)
      + 315/512*n4 * Math.sin(8*phi)
    );
  }

  function footpointLatitude(M) {
    var phi = M / (TM.a * (1 - TM.e2/4 - 3*TM.e2*TM.e2/64 - 5*TM.e2*TM.e2*TM.e2/256));
    for (var i = 0; i < 10; i++) {
      var s2 = Math.sin(phi) * Math.sin(phi);
      var delta = (M - meridianArc(phi)) / (TM.a * (1 - TM.e2*s2) / Math.pow(1 - TM.e2*s2, 1.5));
      phi += delta;
      if (Math.abs(delta) < 1e-12) break;
    }
    return phi;
  }

  function toWGS84(easting, northing) {
    var x = easting - TM.x0, y = northing - TM.y0;
    var M = y / TM.k0;
    var phi1 = footpointLatitude(M);
    var sP = Math.sin(phi1), cP = Math.cos(phi1), tP = Math.tan(phi1), s2 = sP*sP;
    var N1 = TM.a / Math.sqrt(1 - TM.e2*s2);
    var R1 = TM.a * (1 - TM.e2) / Math.pow(1 - TM.e2*s2, 1.5);
    var D = x / (N1 * TM.k0);
    var T1 = tP*tP, C1 = TM.ep2*cP*cP, D2 = D*D, D4 = D2*D2, D6 = D4*D2;
    var lat = phi1 - (N1*tP/R1) * (D2/2 - (5+3*T1+10*C1-4*C1*C1-9*TM.ep2)*D4/24 + (61+90*T1+298*C1+45*T1*T1-252*TM.ep2-3*C1*C1)*D6/720);
    var lon = TM.lon0 + (1/cP) * (D - (1+2*T1+C1)*D2*D/6 + (5-2*C1+28*T1-3*C1*C1+8*TM.ep2+24*T1*T1)*D4*D/120);
    return [lat * 180 / Math.PI, lon * 180 / Math.PI];
  }


  // =========================================================================
  //  Plot Data (EPSG:2180 from ULDK API)
  // =========================================================================

  var PLOTS = {
    '133': {
      label: 'Plot 133', area: '18,369 m\u00B2',
      zoning: 'P/UO.4 \u2014 Production / Services',
      price: '\u20AC113/m\u00B2 \u2014 \u20AC2,076,000', forSale: true,
      coords2180: [[382951.72,341800.40],[382931.92,341827.09],[382924.59,341838.11],[382650.15,341507.59],[382675.70,341474.56]]
    },
    '135/1': {
      label: 'Plot 135/1', area: '9,015 m\u00B2',
      zoning: 'P/UO.4 + U1 \u2014 Production + Commercial',
      price: '\u20AC113/m\u00B2 \u2014 \u20AC1,018,000', forSale: true,
      coords2180: [[382963.58,341784.32],[382951.72,341800.40],[382675.70,341474.56],[382689.82,341455.97]]
    },
    '143': {
      label: 'Plot 143', area: '9,322 m\u00B2',
      zoning: 'P/UO.4 \u2014 Production / Services',
      price: '\u20AC127/m\u00B2 \u2014 \u20AC1,184,000', forSale: true,
      coords2180: [[382072.05,341685.95],[382097.67,341670.29],[382344.38,341877.37],[382322.24,341896.60]]
    },
    '159': {
      label: 'Plot 159', area: '4,143 m\u00B2',
      zoning: 'P/UO.4 \u2014 Production / Services',
      price: '\u20AC94/m\u00B2 \u2014 \u20AC389,000', forSale: true,
      coords2180: [[382213.82,341213.48],[382202.68,341242.34],[382201.27,341263.08],[382149.96,341262.09],[382153.55,341241.85],[382154.91,341228.67],[382143.15,341199.83],[382185.67,341177.35]]
    }
  };


  // =========================================================================
  //  REGIONAL Landmarks — Wroclaw-Brzeg corridor investments
  // =========================================================================

  var REGIONAL = [
    // === AUTOMOTIVE & E-MOBILITY ===
    { name: 'Toyota Motor Manufacturing', detail: '7B PLN \u2014 Hybrid engines, 3,000 jobs, Jelcz-Laskowice', latlng: [51.0364, 17.2972], cat: 'factory', investment: '7,000M PLN' },
    { name: 'LG Energy Solution', detail: 'Europe\'s largest EV battery plant, 10,000+ jobs', latlng: [51.0208, 16.8863], cat: 'factory', investment: '5,000M+ PLN' },
    { name: 'POSCO E-Mobility', detail: '183M PLN \u2014 EV motor cores, Brzeg', latlng: [50.8612, 17.4367], cat: 'factory', investment: '183M PLN' },
    { name: 'Mitsui High-Tec', detail: '160M PLN \u2014 EV motor cores, Skarbimierz', latlng: [50.8388, 17.4102], cat: 'factory', investment: '160M PLN' },
    { name: 'Adient Poland', detail: 'Truck seating for MAN, Skarbimierz', latlng: [50.8353, 17.4242], cat: 'factory' },
    { name: 'Faurecia/Forvia', detail: '23M USD \u2014 Polyurethane foam, Jelcz-Laskowice', latlng: [51.0375, 17.3016], cat: 'factory', investment: '23M USD' },
    { name: 'Simoldes Plasticos', detail: '600+ employees \u2014 Automotive plastics, 20 years in corridor', latlng: [51.0345, 17.3032], cat: 'factory' },
    // === US MANUFACTURING ===
    { name: '3M Poland (SuperHub)', detail: '146M USD \u2014 Largest 3M EMEA center, 4,000+ jobs', latlng: [51.1252, 17.1159], cat: 'factory', investment: '146M USD' },
    { name: 'Align Technology', detail: '80,000 m\u00B2 \u2014 First EMEA facility, 2,500+ jobs', latlng: [51.1502, 17.1299], cat: 'factory' },
    { name: 'Cargill', detail: '38M EUR \u2014 Soluble fiber production, Bielany', latlng: [51.0450, 16.9511], cat: 'factory', investment: '38M EUR' },
    // === DEFENSE ===
    { name: 'Jelcz Military Factory (NEW)', detail: '756M PLN \u2014 Defense vehicles, PGZ expansion', latlng: [51.0385, 17.3068], cat: 'defense', investment: '756M PLN' },
    // === WHITE GOODS & CONSUMER ===
    { name: 'Electrolux Factory', detail: '50M+ PLN \u2014 2M washing machines/year, 1,250 jobs', latlng: [50.9304, 17.3152], cat: 'factory', investment: '50M+ PLN' },
    { name: 'BSH Bosch/Siemens (NEW)', detail: '\u20AC144M \u2014 Refrigerators & ovens, Wroc\u0142aw', latlng: [51.1467, 17.0313], cat: 'factory', investment: '\u20AC144M' },
    { name: 'Ebersp\u00E4cher', detail: '40M+ PLN \u2014 EV heaters & climate, Godzikowice', latlng: [50.8984, 17.3330], cat: 'factory', investment: '40M PLN' },
    { name: 'DS Smith', detail: '25M+ EUR \u2014 Corrugated packaging, 1,300 employees, O\u0142awa', latlng: [50.9375, 17.3154], cat: 'factory', investment: '25M+ EUR' },
    { name: 'Mondelez (Cadbury/Milka)', detail: '74M PLN \u2014 Confectionery, 600+ jobs, Skarbimierz', latlng: [50.8392, 17.4122], cat: 'factory', investment: '74M PLN' },
    { name: 'Donaldson Polska', detail: '45M PLN \u2014 Air filters, 200 jobs, Skarbimierz', latlng: [50.8387, 17.4046], cat: 'factory', investment: '45M PLN' },
    { name: 'DeLaval', detail: '3 factories \u2014 Danish dairy equipment, Wroc\u0142aw', latlng: [51.1117, 17.0002], cat: 'factory' },
    { name: 'Citronex/PPO Siechnice', detail: '50M PLN \u2014 Greenhouse complex, horticulture', latlng: [51.0246, 17.1520], cat: 'factory', investment: '50M PLN' },
    { name: 'Kalizea', detail: '260,000 ton capacity \u2014 Corn semolina, Siechnice', latlng: [51.0422, 17.1572], cat: 'factory' },
    // === LOGISTICS ===
    { name: 'SHEIN Distribution Hub', detail: '1B+ PLN \u2014 391,000 m\u00B2, 5,000 jobs', latlng: [50.9830, 16.9670], cat: 'logistics', investment: '1,000M+ PLN' },
    { name: 'Amazon WRO1 & WRO2', detail: 'Fulfillment centers, Bielany Wroc\u0142awskie', latlng: [51.0434, 16.9400], cat: 'logistics' },
    { name: 'Panattoni South Hub', detail: '500M+ PLN \u2014 250,000 m\u00B2 warehouse', latlng: [50.9830, 16.9670], cat: 'logistics', investment: '500M+ PLN' },
    { name: 'GLP Wroc\u0142aw V', detail: '250M PLN \u2014 238,100 m\u00B2, BREEAM Outstanding', latlng: [50.9830, 16.9670], cat: 'logistics', investment: '250M PLN' },
    { name: 'Prologis Park Wroc\u0142aw', detail: 'Multi-building logistics park, Bielany', latlng: [51.0442, 16.9590], cat: 'logistics' },
    { name: 'P3 Wroc\u0142aw II', detail: '200,000 m\u00B2 logistics park', latlng: [51.0110, 16.8720], cat: 'logistics' },
    // === INFRASTRUCTURE ===
    { name: 'Trasa Mostowa (Bridge Route)', detail: '261M PLN \u2014 New Odra crossing + 4.3 km bypass', latlng: [50.9600, 17.2700], cat: 'infra', investment: '261M PLN' },
    { name: 'Tauron R-186 (+30 MW)', detail: '31M PLN \u2014 Grid capacity expansion', latlng: [50.9313, 17.2903], cat: 'infra', investment: '31M PLN' },
    { name: 'DK94 O\u0142awa Bypass', detail: '11 km bypass \u2014 env. decision Q3 2026', latlng: [50.945, 17.265], cat: 'infra' },
    { name: 'A4 Motorway Rerouting', detail: 'Variant 2.1 approved Nov 2025 \u2014 capacity expansion', latlng: [50.970, 17.250], cat: 'infra' },
    { name: 'Polder Lipki-O\u0142awa', detail: '232M EUR \u2014 Flood protection modernization, EU funded', latlng: [50.945, 17.240], cat: 'infra', investment: '232M EUR' },
    // === CITIES ===
    { name: 'Wroc\u0142aw', detail: '1.1M metro \u2014 Regional economic capital', latlng: [51.1079, 17.0385], cat: 'city' },
    { name: 'O\u0142awa', detail: 'Local industrial hub \u2014 3\u20135 km from plots', latlng: [50.9459, 17.2930], cat: 'city' },
    { name: 'Brzeg', detail: 'E-mobility cluster \u2014 POSCO, 30 km', latlng: [50.8611, 17.4690], cat: 'city' },
    // === SEZ ZONES ===
    { name: 'Stanowice SEZ', detail: 'WSSE subzone \u2014 93% full, 25 ha remaining', latlng: [50.9740, 17.2500], cat: 'sez', investment: 'Saturating' },
    { name: 'Godzikowice SEZ', detail: 'WSSE O\u0142awa II \u2014 39 ha remaining', latlng: [50.8984, 17.3330], cat: 'sez' },
    { name: 'Skarbimierz SEZ', detail: 'WSSE \u2014 Mitsui, Mondelez, Donaldson, Adient', latlng: [50.8388, 17.4102], cat: 'sez' }
  ];


  // =========================================================================
  //  LOCAL Landmarks — Olawa area (3-15 km from plots)
  // =========================================================================

  var LOCAL = [
    { name: 'Electrolux Factory', detail: '1,250 jobs \u2014 2M washing machines/year', latlng: [50.9304, 17.3152], cat: 'factory' },
    { name: 'Jelcz Military Factory', detail: '756M PLN expansion \u2014 defense vehicles', latlng: [51.0385, 17.3068], cat: 'defense' },
    { name: 'Ebersp\u00E4cher', detail: 'EV heaters & AC systems \u2014 500 jobs', latlng: [50.8984, 17.3330], cat: 'factory' },
    { name: 'Essity (Tork)', detail: 'Swedish hygiene products, ul. 3 Maja 30A', latlng: [50.9372, 17.3083], cat: 'factory' },
    { name: 'Mobile Climate Control', detail: 'Swedish HVAC for vehicles, ul. Szwedzka 1', latlng: [50.9311, 17.3181], cat: 'factory' },
    { name: 'DS Smith', detail: 'Corrugated packaging \u2014 1,300 employees, ul. Dzier\u017Conia 57', latlng: [50.9375, 17.3154], cat: 'factory' },
    { name: 'Autoliv', detail: 'Airbag textile components, ul. Polna 49', latlng: [50.9214, 17.3068], cat: 'factory' },
    { name: 'Toyota (12 km)', detail: '7B PLN \u2014 hybrid engines, 3,000 jobs', latlng: [51.0364, 17.2972], cat: 'factory' },
    { name: 'Stanowice SEZ', detail: '93% full \u2014 overflow imminent', latlng: [50.9740, 17.2500], cat: 'sez' },
    { name: 'Trasa Mostowa', detail: '261M PLN \u2014 new Odra bridge + 4.3 km bypass', latlng: [50.9600, 17.2700], cat: 'infra' },
    { name: 'Tauron R-186 (+30 MW)', detail: 'Grid capacity expansion', latlng: [50.9313, 17.2903], cat: 'infra' },
    { name: 'O\u0142awa Zachodnia Station', detail: '50+ trains/day \u2014 15 min to Wroc\u0142aw', latlng: [50.9450, 17.2687], cat: 'infra' },
    { name: 'A4 W\u0119ze\u0142 Brzezimierz', detail: 'A4 motorway interchange \u2014 nearest access', latlng: [50.8779, 17.2038], cat: 'infra' },
    { name: 'DK94 Rebuild', detail: 'Full reconstruction \u2014 11.5t/axle standard', latlng: [50.9620, 17.2580], cat: 'infra' }
  ];


  // =========================================================================
  //  A4 Motorway Route — Wroclaw to Brzeg segment
  // =========================================================================

  var A4_ROUTE = [
    [51.060, 16.880],  // Wroclaw west
    [51.030, 16.950],  // Bielany Wroclawskie area
    [50.990, 17.040],  // South of Wroclaw
    [50.950, 17.120],  // Heading SE
    [50.910, 17.180],  // Approaching Brzezimierz
    [50.880, 17.200],  // Wezel Brzezimierz (confirmed SPO 50.876, 17.199)
    [50.840, 17.280],  // Between Brzezimierz and Brzeg
    [50.800, 17.360],  // Przylesie area (confirmed SPO 50.784, 17.352)
    [50.780, 17.440]   // Near Brzeg
  ];


  // =========================================================================
  //  Styling
  // =========================================================================

  var STYLE = {
    forSale:    { color: '#00d4ff', weight: 3, fillColor: '#00d4ff', fillOpacity: 0.30, dashArray: null },
    notForSale: { color: '#8a8a8a', weight: 3, fillColor: '#8a8a8a', fillOpacity: 0.25, dashArray: '6 4' },
    highlight:  { color: '#00d4ff', weight: 4, fillColor: '#00d4ff', fillOpacity: 0.40, dashArray: null },
    a4road:     { color: '#c9a84c', weight: 6, opacity: 0.9, dashArray: null, smoothFactor: 1 },
    accessRoad: { color: '#cc3333', weight: 3, opacity: 0.85, dashArray: null, smoothFactor: 1 },
    plotLabel:  { color: '#00d4ff', weight: 2, fillColor: '#00d4ff', fillOpacity: 0.25 }
  };

  var MARKER_STYLES = {
    factory:  { radius: 10, color: '#2d5a3d', fillColor: '#3d7a52', fillOpacity: 0.85, weight: 2 },
    defense:  { radius: 11, color: '#5a2d2d', fillColor: '#8a4444', fillOpacity: 0.85, weight: 2 },
    logistics:{ radius: 9,  color: '#2d3d5a', fillColor: '#4466aa', fillOpacity: 0.85, weight: 2 },
    infra:    { radius: 8,  color: '#5a4a2d', fillColor: '#b8a472', fillOpacity: 0.85, weight: 2 },
    city:     { radius: 7,  color: '#555555', fillColor: '#888888', fillOpacity: 0.70, weight: 2 },
    sez:      { radius: 9,  color: '#4a2d5a', fillColor: '#7744aa', fillOpacity: 0.80, weight: 2 }
  };

  var TILES = {
    street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', label: 'Street' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri, Maxar', label: 'Satellite' }
  };


  // =========================================================================
  //  Helpers
  // =========================================================================

  function convertRing(c) { return c.map(function(p) { var w = toWGS84(p[0], p[1]); return [w[0], w[1]]; }); }

  function centroid(ll) {
    var la = 0, lo = 0;
    for (var i = 0; i < ll.length; i++) { la += ll[i][0]; lo += ll[i][1]; }
    return [la / ll.length, lo / ll.length];
  }

  function plotPopup(plot) {
    var badge = plot.forSale
      ? '<span style="color:#b8a472;font-weight:700;">FOR SALE</span>'
      : '<span style="color:#8a8a8a;font-weight:700;">LEASED</span>';
    return '<div style="font-family:Inter,sans-serif;min-width:180px;line-height:1.5;">' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:6px;border-bottom:1px solid rgba(184,164,114,0.3);padding-bottom:4px;">' + plot.label + ' ' + badge + '</div>' +
      '<div style="font-size:12px;color:#555;"><strong>Area:</strong> ' + plot.area + '<br><strong>Zoning:</strong> ' + plot.zoning + '<br><strong>Price:</strong> ' + plot.price + '</div></div>';
  }

  function landmarkPopup(lm) {
    var inv = lm.investment ? '<br><strong>Investment:</strong> ' + lm.investment : '';
    return '<div style="font-family:Inter,sans-serif;min-width:200px;line-height:1.6;">' +
      '<div style="font-size:15px;font-weight:700;margin-bottom:6px;color:#2d5a3d;">' + lm.name + '</div>' +
      '<div style="font-size:13px;color:#555;">' + lm.detail + inv + '</div></div>';
  }

  function injectCSS() {
    if (document.getElementById('a4-map-styles')) return;
    var css = document.createElement('style');
    css.id = 'a4-map-styles';
    css.textContent =
      '.a4-plot-label{background:rgba(0,20,30,0.80)!important;border:1px solid rgba(0,212,255,0.6)!important;color:#00d4ff!important;font-family:Inter,sans-serif!important;font-size:11px!important;font-weight:600!important;padding:2px 6px!important;border-radius:3px!important;box-shadow:0 1px 4px rgba(0,0,0,0.3)!important;white-space:nowrap!important;}' +
      '.a4-plot-label::before{display:none!important;}' +
      '.a4-landmark-tooltip{background:rgba(20,45,30,0.92)!important;border:1px solid rgba(60,120,80,0.6)!important;color:#7ec894!important;font-family:Inter,sans-serif!important;font-size:14px!important;font-weight:600!important;padding:6px 12px!important;border-radius:4px!important;box-shadow:0 2px 6px rgba(0,0,0,0.4)!important;white-space:nowrap!important;}' +
      '.a4-landmark-tooltip::before{border-top-color:rgba(20,45,30,0.92)!important;}' +
      '.a4-regional-tooltip{background:rgba(26,35,50,0.92)!important;border:1px solid rgba(184,164,114,0.4)!important;color:#e8e0c8!important;font-family:Inter,sans-serif!important;font-size:13px!important;font-weight:600!important;padding:5px 10px!important;border-radius:4px!important;box-shadow:0 2px 6px rgba(0,0,0,0.4)!important;white-space:nowrap!important;}' +
      '.a4-regional-tooltip::before{border-top-color:rgba(26,35,50,0.92)!important;}' +
      '.a4-plots-badge{background:rgba(0,180,220,0.9)!important;border:2px solid #00d4ff!important;color:#001420!important;font-family:Inter,sans-serif!important;font-size:12px!important;font-weight:700!important;padding:4px 10px!important;border-radius:4px!important;box-shadow:0 2px 8px rgba(0,0,0,0.4)!important;white-space:nowrap!important;}' +
      '.a4-plots-badge::before{display:none!important;}' +
      '.leaflet-control-layers{background:rgba(26,35,50,0.9)!important;border:1px solid rgba(184,164,114,0.3)!important;color:#e8e0c8!important;border-radius:4px!important;}' +
      '.leaflet-control-layers label{color:#e8e0c8!important;}';
    document.head.appendChild(css);
  }


  // =========================================================================
  //  Core map builder
  // =========================================================================

  function createMap(containerId, opts) {
    var map = L.map(containerId, {
      center: opts.center || [50.95, 17.30],
      zoom: opts.zoom || 13,
      scrollWheelZoom: true,
      zoomControl: true
    });

    var street = L.tileLayer(TILES.street.url, { attribution: TILES.street.attribution, maxZoom: 19 });
    var sat = L.tileLayer(TILES.satellite.url, { attribution: TILES.satellite.attribution, maxZoom: 18 });
    street.addTo(map);

    var baseMaps = {};
    baseMaps[TILES.street.label] = street;
    baseMaps[TILES.satellite.label] = sat;
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    injectCSS();
    return map;
  }


  // =========================================================================
  //  Draw plots on map
  // =========================================================================

  function drawPlots(map, highlightIds, showLabels) {
    var plotLayers = {};
    var allLatLngs = [];

    Object.keys(PLOTS).forEach(function (id) {
      var plot = PLOTS[id];
      var ring = convertRing(plot.coords2180);
      allLatLngs = allLatLngs.concat(ring);

      var isHL = highlightIds && highlightIds.indexOf(id) !== -1;
      var style = isHL ? STYLE.highlight : (plot.forSale ? STYLE.forSale : STYLE.notForSale);

      var polygon = L.polygon(ring, style).addTo(map);
      polygon.bindPopup(plotPopup(plot));
      polygon.on('mouseover', function () { this.setStyle({ fillOpacity: style.fillOpacity + 0.15, weight: style.weight + 1 }); });
      polygon.on('mouseout',  function () { this.setStyle({ fillOpacity: style.fillOpacity, weight: style.weight }); });

      if (showLabels !== false) {
        L.tooltip({ permanent: true, direction: 'center', className: 'a4-plot-label', opacity: 0.9 })
          .setContent(id).setLatLng(centroid(ring)).addTo(map);
      }

      plotLayers[id] = polygon;
    });

    return { plotLayers: plotLayers, allLatLngs: allLatLngs };
  }


  // =========================================================================
  //  Draw landmarks on map
  // =========================================================================

  function drawLandmarks(map, landmarks, tooltipClass) {
    var layers = [];
    landmarks.forEach(function (lm) {
      var ms = MARKER_STYLES[lm.cat] || MARKER_STYLES.factory;
      var marker = L.circleMarker(lm.latlng, ms).addTo(map);
      marker.bindPopup(landmarkPopup(lm));
      marker.bindTooltip(lm.name, {
        permanent: false, direction: 'top', offset: [0, -12],
        opacity: 0.95, className: tooltipClass || 'a4-landmark-tooltip'
      });
      layers.push(marker);
    });
    return layers;
  }


  // =========================================================================
  //  REGIONAL MAP — Wroclaw-Brzeg corridor overview
  // =========================================================================

  function regional(containerId) {
    var map = createMap(containerId, { center: [50.99, 17.16], zoom: 10 });

    // A4 motorway polyline
    L.polyline(A4_ROUTE, STYLE.a4road).addTo(map)
      .bindTooltip('A4 Motorway', { permanent: true, direction: 'top', className: 'a4-regional-tooltip', offset: [0, -6] });

    // === Trunk: DW396 roundabout -> north through Brzezimierz -> Olawa -> split point ===
    // Starts at DW396 roundabout (A4 interchange), goes directly north — no southern segment
    var trunk = [
      [50.8654, 17.1922],  // DW396 roundabout at A4 interchange (origin)
      [50.8681, 17.1941],  // DW396 heading N from roundabout
      [50.8734, 17.1954],  // Entering Brzezimierz village
      [50.8826, 17.1979],  // Past Brzezimierz
      [50.8910, 17.2006],  // Open road N
      [50.8967, 17.2059],  // Curving NE
      [50.9046, 17.2173],  // Pelczyce
      [50.9084, 17.2199],  // Past Pelczyce
      [50.9116, 17.2236],  // Between villages
      [50.9199, 17.2341],  // Gaj Olawski
      [50.9253, 17.2395],  // Past Gaj Olawski
      [50.9271, 17.2513],  // Heading NE
      [50.9316, 17.2569],  // Approaching Olawa
      [50.9376, 17.2695],  // Entering Olawa
      [50.9417, 17.2788],  // Olawa (DW396)
      [50.9441, 17.2916],  // Olawa center
      [50.9398, 17.3006],  // ul. 3 Maja heading S
      [50.9365, 17.3028],  // 3 Maja continues
      [50.9339, 17.3049],  // Turn
      [50.9323, 17.3086],  // Turning E
      [50.9315, 17.3139]   // Split: 3 Maja / Zielna / Ofiar Katynia junction
    ];
    L.polyline(trunk, STYLE.accessRoad).addTo(map)
      .bindTooltip('DW396 \u2192 O\u0142awa \u2192 ul. 3 Maja', { permanent: false, className: 'a4-regional-tooltip' });

    // === Route A: ul. Zielna + ul. Jana Dzier\u017Conia -> Plots (from split point N) ===
    var routeA = [
      [50.9315, 17.3139],  // Split point (junction)
      [50.9325, 17.3154],  // ul. Zielna heading N
      [50.9348, 17.3177],  // Zielna / Dzier\u017Conia junction
      [50.9345, 17.3185],  // ul. Jana Dzier\u017Conia heading SE
      [50.9334, 17.3211],  // Dzier\u017Conia continues
      [50.9331, 17.3219],  // End of Dzier\u017Conia
      [50.9290, 17.3270]   // A4Corridor Plots
    ];
    L.polyline(routeA, STYLE.accessRoad).addTo(map)
      .bindTooltip('Route A: Zielna \u2192 Dzier\u017Conia \u2192 Plots', { permanent: false, className: 'a4-regional-tooltip' });

    // === Route B: Ofiar Katynia -> past Electrolux -> Plots (from split point SE) ===
    var routeB = [
      [50.9315, 17.3139],  // Split point (junction)
      [50.9304, 17.3152],  // ul. Ofiar Katynia, past Electrolux
      [50.9286, 17.3179],  // Ofiar Katynia continues SE
      [50.9273, 17.3189],  // End of Ofiar Katynia
      [50.9275, 17.3315],  // Track before Psarski Potok
      [50.9285, 17.3323],  // Track NE
      [50.9290, 17.3270]   // A4Corridor Plots
    ];
    L.polyline(routeB, STYLE.accessRoad).addTo(map)
      .bindTooltip('Route B: Ofiar Katynia \u2192 Electrolux \u2192 Plots', { permanent: false, className: 'a4-regional-tooltip' });

    // Plot location marker (gold badge)
    var plotCenter = [50.929, 17.327];
    L.circleMarker(plotCenter, { radius: 14, color: '#00a8cc', fillColor: '#00d4ff', fillOpacity: 0.9, weight: 3 }).addTo(map);
    L.tooltip({ permanent: true, direction: 'right', className: 'a4-plots-badge', offset: [16, 0] })
      .setContent('A4CORRIDOR PLOTS').setLatLng(plotCenter).addTo(map);

    // Regional landmarks
    drawLandmarks(map, REGIONAL, 'a4-regional-tooltip');

    return { map: map };
  }


  // =========================================================================
  //  LOCAL MAP — Olawa area with nearby investments + plot polygons
  // =========================================================================

  function local(containerId) {
    var map = createMap(containerId, { center: [50.945, 17.300], zoom: 13 });

    // Draw for-sale plot polygons with labels
    drawPlots(map, ['133', '135/1', '143', '159'], true);

    // Local landmarks
    drawLandmarks(map, LOCAL, 'a4-landmark-tooltip');

    return { map: map };
  }


  // =========================================================================
  //  PLOT MAP — Zoomed to specific plot polygon(s)
  // =========================================================================

  function plot(containerId, plotIds) {
    plotIds = plotIds || ['133', '135/1', '143', '159'];
    var map = createMap(containerId, { center: [50.95, 17.30], zoom: 16 });

    // Draw all plots but highlight only the specified ones
    var pd = drawPlots(map, plotIds, true);

    // Fit bounds to highlighted plots only
    var focusLatLngs = [];
    plotIds.forEach(function (id) {
      if (PLOTS[id]) {
        focusLatLngs = focusLatLngs.concat(convertRing(PLOTS[id].coords2180));
      }
    });

    if (focusLatLngs.length > 0) {
      map.fitBounds(L.latLngBounds(focusLatLngs), { padding: [80, 80], maxZoom: 17 });
    }

    return {
      map: map,
      plotLayers: pd.plotLayers,
      focusPlot: function (plotId) {
        var layer = pd.plotLayers[plotId];
        if (layer) { map.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 17 }); layer.openPopup(); }
      }
    };
  }


  // =========================================================================
  //  Legacy init (backwards compat)
  // =========================================================================

  function init(containerId, opts) {
    opts = opts || {};
    if (opts.showCompanies === false && opts.highlightPlots) {
      return plot(containerId, opts.highlightPlots);
    }
    return local(containerId);
  }


  // =========================================================================
  //  Public API
  // =========================================================================

  return {
    regional: regional,
    local:    local,
    plot:     plot,
    init:     init,
    toWGS84:  toWGS84,
    PLOTS:    PLOTS
  };

})();
