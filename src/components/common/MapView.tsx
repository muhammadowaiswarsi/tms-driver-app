import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type MapMarkerType = 'pickup' | 'delivery' | 'stop' | 'driver';

export type MapMarker = {
  latitude: number;
  longitude: number;
  title?: string;
  type?: MapMarkerType;
};

interface MapViewProps {
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  currentLocation?: { latitude: number; longitude: number } | null;
  markers?: MapMarker[];
  height?: number;
  showRoute?: boolean;
}

const MARKER_META: Record<
  MapMarkerType,
  { color: string; label: string }
> = {
  pickup: { color: '#2563eb', label: 'P' },
  delivery: { color: '#dc2626', label: 'D' },
  stop: { color: '#f59e0b', label: 'S' },
  driver: { color: '#16a34a', label: '●' },
};

function escapeJs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

const CustomMapView: React.FC<MapViewProps> = ({
  routeCoordinates = [],
  currentLocation,
  markers = [],
  height = 300,
  showRoute = true,
}) => {
  const mapHtml = useMemo(() => {
    const allMarkers: Array<{
      lat: number;
      lng: number;
      title: string;
      type: MapMarkerType;
    }> = [];

    markers.forEach((marker) => {
      if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) return;
      if (marker.latitude === 0 && marker.longitude === 0) return;
      allMarkers.push({
        lat: marker.latitude,
        lng: marker.longitude,
        title: marker.title || 'Stop',
        type: marker.type || 'stop',
      });
    });

    if (
      currentLocation &&
      Number.isFinite(currentLocation.latitude) &&
      Number.isFinite(currentLocation.longitude) &&
      !(currentLocation.latitude === 0 && currentLocation.longitude === 0)
    ) {
      allMarkers.push({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        title: 'You are here',
        type: 'driver',
      });
    }

    const centerLat = allMarkers[0]?.lat ?? 40.7128;
    const centerLng = allMarkers[0]?.lng ?? -74.006;
    const zoom = allMarkers.length ? 12 : 4;

    const markersJs = allMarkers
      .map((marker) => {
        const meta = MARKER_META[marker.type] || MARKER_META.stop;
        const isDriver = marker.type === 'driver';
        return `
          (function() {
            var icon = L.divIcon({
              className: 'tms-marker',
              html: ${JSON.stringify(
                isDriver
                  ? `<div class="driver-dot" style="background:${meta.color}"><div class="driver-pulse"></div></div>`
                  : `<div class="pin" style="background:${meta.color}"><span>${meta.label}</span></div>`,
              )},
              iconSize: ${isDriver ? '[22, 22]' : '[28, 36]'},
              iconAnchor: ${isDriver ? '[11, 11]' : '[14, 34]'},
              popupAnchor: [0, ${isDriver ? -12 : -28}]
            });
            L.marker([${marker.lat}, ${marker.lng}], { icon: icon, zIndexOffset: ${isDriver ? 1000 : 0} })
              .addTo(map)
              .bindPopup('${escapeJs(marker.title)}');
          })();
        `;
      })
      .join('\n');

    let routeJs = '';
    if (showRoute && routeCoordinates.length >= 2) {
      const path = routeCoordinates
        .map((coord) => `[${coord.latitude}, ${coord.longitude}]`)
        .join(', ');
      routeJs = `
        var routeLine = L.polyline([${path}], { color: '#2563eb', weight: 4, opacity: 0.85 }).addTo(map);
      `;
    } else if (showRoute && allMarkers.length >= 2) {
      const path = allMarkers
        .filter((m) => m.type !== 'driver')
        .map((m) => `[${m.lat}, ${m.lng}]`)
        .join(', ');
      if (path) {
        routeJs = `
          var routeLine = L.polyline([${path}], { color: '#2563eb', weight: 3, opacity: 0.7, dashArray: '8, 10' }).addTo(map);
        `;
      }
    }

    const fitJs =
      allMarkers.length >= 2
        ? `
          var bounds = L.latLngBounds([${allMarkers
            .map((m) => `[${m.lat}, ${m.lng}]`)
            .join(', ')}]);
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
        `
        : allMarkers.length === 1
          ? `map.setView([${allMarkers[0].lat}, ${allMarkers[0].lng}], 13);`
          : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, #map { width: 100%; height: 100%; }
            .tms-marker { background: transparent; border: none; }
            .pin {
              width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid #fff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              display: flex; align-items: center; justify-content: center;
            }
            .pin span {
              transform: rotate(45deg);
              color: #fff; font: 700 11px/1 sans-serif;
            }
            .driver-dot {
              width: 18px; height: 18px; border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 0 0 2px rgba(22,163,74,0.35), 0 2px 6px rgba(0,0,0,0.35);
              position: relative;
            }
            .driver-pulse {
              position: absolute; inset: -8px; border-radius: 50%;
              border: 2px solid rgba(22,163,74,0.45);
              animation: pulse 1.6s ease-out infinite;
            }
            @keyframes pulse {
              0% { transform: scale(0.7); opacity: 1; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], ${zoom});
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap',
              maxZoom: 19
            }).addTo(map);
            ${markersJs}
            ${routeJs}
            ${fitJs}
          </script>
        </body>
      </html>
    `;
  }, [currentLocation, markers, routeCoordinates, showRoute]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});

export default CustomMapView;
