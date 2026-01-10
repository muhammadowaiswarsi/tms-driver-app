import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapViewProps {
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  currentLocation?: { latitude: number; longitude: number };
  markers?: Array<{ latitude: number; longitude: number; title?: string }>;
  height?: number;
  showRoute?: boolean;
}

const CustomMapView: React.FC<MapViewProps> = ({
  routeCoordinates = [],
  currentLocation,
  markers = [],
  height = 300,
  showRoute = true,
}) => {
  // Calculate center point
  const getCenter = () => {
    if (currentLocation) {
      return [currentLocation.latitude, currentLocation.longitude];
    }

    if (routeCoordinates.length > 0) {
      const lats = routeCoordinates.map((coord) => coord.latitude);
      const lngs = routeCoordinates.map((coord) => coord.longitude);
      const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const avgLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      return [avgLat, avgLng];
    }

    // Default location
    return [40.7128, -74.0060];
  };

  // Generate Map HTML using Leaflet (OpenStreetMap - free, no API key needed)
  const mapHtml = useMemo(() => {
    const center = getCenter();
    const [lat, lng] = center;
    const zoom = 13;
    
    // Build markers array
    const allMarkers: Array<{ lat: number; lng: number; title?: string }> = [];
    
    if (currentLocation) {
      allMarkers.push({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        title: 'Current Location',
      });
    }
    
    markers.forEach((marker) => {
      allMarkers.push({
        lat: marker.latitude,
        lng: marker.longitude,
        title: marker.title,
      });
    });
    
    // Build route polyline if available
    let routePolyline = '';
    if (showRoute && routeCoordinates.length >= 2) {
      const path = routeCoordinates
        .map((coord) => `[${coord.latitude}, ${coord.longitude}]`)
        .join(', ');
      routePolyline = `
        var polyline = L.polyline([${path}], {color: '#4285F4', weight: 4}).addTo(map);
        map.fitBounds(polyline.getBounds());
      `;
    }
    
    // Build markers JavaScript
    const markersJs = allMarkers
      .map((marker, index) => `
        L.marker([${marker.lat}, ${marker.lng}])
          .addTo(map)
          ${marker.title ? `.bindPopup('${marker.title}')` : ''};
      `)
      .join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            #map { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${lat}, ${lng}], ${zoom});
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            ${markersJs}
            ${routePolyline}
          </script>
        </body>
      </html>
    `;
  }, [currentLocation, markers, routeCoordinates, showRoute]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
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
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CustomMapView;
