// angular.module is a global place for creating, registering and retrieving Angular modules
// 'app' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('app', ['ionic'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller("AppCtrl", function($scope) {
  // Members
  var attackDistance = 40; // in meter
  var showPlayerAttackRadius = false;
  var players = [];

  var currentLatLng;
  var geoJsonLayer;
  var geoJsonAttackDistanceLayer;
  var currentPositionMarker;
  var attackRunning = false;

  // Methods
  function generateRandomGeoJsonPlayers(latLngBounds, n) {
    var i;
    return {
      type: "FeatureCollection",
      features: (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 1; 1 <= n ? _i <= n : _i >= n; i = 1 <= n ? ++_i : --_i) {
          _results.push((function() {}, {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [latLngBounds.getSouthWest().lng + (latLngBounds.getNorthEast().lng - latLngBounds.getSouthWest().lng) * Math.random(), latLngBounds.getSouthWest().lat + (latLngBounds.getNorthEast().lat - latLngBounds.getSouthWest().lat) * Math.random()]
            },
            properties: {
              name: "player" + i,
              color: "blue",
              radius: 15,
              isAttacked: false
            }
          }));
        }
        return _results;
      })()
    };
  }

  function updatePositionMarker(latlng) {
    if (currentPositionMarker) {
      map.removeLayer(currentPositionMarker);
    }
    currentPositionMarker = createPositionMarker(latlng);
    map.addLayer(currentPositionMarker, true);
  }

  function createPositionMarker(latlng) {
    var c, pm, positionMarker;

    positionMarker = new L.LayerGroup;
    
    c = L.circle(latlng, attackDistance, {
      stroke: false,
      fillColor: "lime"
    });
    positionMarker.addLayer(c);

    pm = L.circleMarker(latlng, {
      radius: 15,
      stroke: false,
      opacity: 0.9
    });
    positionMarker.addLayer(pm);

    return positionMarker;
  }

  // Map events
  function onLocationFound(e) {
    currentLatLng = e.latlng;
    updatePositionMarker(e.latlng);
    $scope.removePlayers();
    if (showPlayerAttackRadius) {
      geoJsonAttackDistanceLayer = createGeoJsonAttackDistanceLayer(players);
      map.addLayer(geoJsonAttackDistanceLayer, true);
    }
    geoJsonLayer = createGeoJsonLayer(players).addTo(map);
  }

  function playerMarkerClicked(e) {
    // console.log(e);
    var canAttack = e.latlng.distanceTo(currentLatLng) < attackDistance;
    // alert(e.target.feature.properties.name + (canAttack ? " is in range" : " is out of range"));
    if (canAttack) {
      plantBomb(e.latlng, e.target.feature.properties.name);
    } else {
      alert(e.target.feature.properties.name + " is out of range");
    }
  }

  function getPlayer(player) {
    for (var i = 0; i < players.features.length; i++) {
      if (players.features[i].properties.name == player) {
        return players.features[i];
      }
    }
    return null;
  }

  function plantBomb(attackerLatLng, player) {
    // console.log(geoJsonLayer);
    var victim = getPlayer(player);

    if (victim.properties.color == "red") {
      return;
    }

    var victimLatLng = L.latLng(victim.geometry.coordinates[1], victim.geometry.coordinates[0]);

    victim.properties.color = "red";
    $scope.removePlayers();
    if (showPlayerAttackRadius) {
      geoJsonAttackDistanceLayer = createGeoJsonAttackDistanceLayer(players);
      map.addLayer(geoJsonAttackDistanceLayer, true);
    }
    geoJsonLayer = createGeoJsonLayer(players).addTo(map);

    for (var i = 0; i < players.features.length; i++) {
      playerLatLng = L.latLng(players.features[i].geometry.coordinates[1], players.features[i].geometry.coordinates[0]);
      if (victimLatLng.distanceTo(playerLatLng) < attackDistance) {
        // console.log(victimLatLng);
        // console.log(players.features[i]);
        // setTimeout(function() {
        //console.log(victim.properties.name + " attacks " + players.features[i].properties.name);
        plantBomb(victimLatLng, players.features[i].properties.name);
        // }, 500);
      }
    }
  }

  function createGeoJsonLayer(players) {
    return L.geoJson(players, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          clickable: true,
          radius: feature.properties.radius,
          fillColor: feature.properties.color,
          stroke: false,
          fillOpacity: 1
        });;
      },
      onEachFeature: function (feature, layer) {
        return layer.on("click", playerMarkerClicked);
      }
    });
  }

  function createGeoJsonAttackDistanceLayer(players) {
    return L.geoJson(players, {
      pointToLayer: function(feature, latlng) {
        return L.circle(latlng, attackDistance, {
          stroke: false,
          fillColor: "blue"
        });
      }
    });
  }

  // UI callbacks
  $scope.placePlayers = function() {
    if (geoJsonLayer) {
      $scope.removePlayers();
    }
    players = generateRandomGeoJsonPlayers(map.getBounds(), 10);
    if (showPlayerAttackRadius) {
      geoJsonAttackDistanceLayer = createGeoJsonAttackDistanceLayer(players);
      map.addLayer(geoJsonAttackDistanceLayer, true);
    }
    geoJsonLayer = createGeoJsonLayer(players).addTo(map);
  };

  $scope.removePlayers = function() {
    if (showPlayerAttackRadius) {
      map.removeLayer(geoJsonAttackDistanceLayer);
    }
    map.removeLayer(geoJsonLayer);
  };

  // Init map
  var map = L.map('map');
  L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
    detectRetina: true,
    maxZoom: 20
  }).addTo(map);

  map.locate({
    setView: true,
    maxZoom: 18,
    watch: true
  });

  // Assign map events
  map.on('locationfound', onLocationFound);
})