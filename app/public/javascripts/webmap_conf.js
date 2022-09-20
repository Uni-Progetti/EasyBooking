
// Import the leaflet package
var L = require('leaflet');

// Creates a leaflet map binded to an html <div> with id "map"
// setView will set the initial map view to the location at coordinates
// 13 represents the initial zoom level with higher values being more zoomed in
var map = L.map('map').setView([41.8933203,12.4829321], 10);

// Adds the basemap tiles to your web map
// Additional providers are available at: https://leaflet-extras.github.io/leaflet-providers/preview/
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Create base layers group object
var baseLayers = {
	"OpenStreetMap": osm,
};

var blueIcon = L.icon({
    iconUrl: '../images/pin.png',
    iconSize: [39, 39],
    iconAnchor: [18, 39],
    popupAnchor: [10, -35]
});

var donia = L.marker([41.7980456,12.6067009]).bindPopup('<b>Dipartimento di Donia</b><br>Via mura dei francesi, 10, 00043, Ciampino, RM</br>');
var francesco = L.marker([41.9012777,12.5145879]).bindPopup('<b>Dipartimento di Francesco</b><br>Piazzale Aldo Moro, 5, 00185, Roma, RM</br>');
var matteo = L.marker([41.896866,12.5214067]).bindPopup('<b>Dipartimento di Matteo</b><br>Viale dello Scalo S. Lorenzo, 82, 00159, Roma, RM</br>');
var michela = L.marker([41.748959,12.648700]).bindPopup('<b>Dipartimento di Michela</b><br>Borgo Garibaldi, 12, 00041, Albano Laziale, RM</br>');

var dip = L.layerGroup([donia, francesco, matteo, michela]).addTo(map);

var overlays = {
	'Departments': dip
};

L.control.layers(baseLayers, overlays).addTo(map);