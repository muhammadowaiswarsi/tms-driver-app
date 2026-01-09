import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import LeafletView from 'react-native-leaflet-view';

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

  // Convert markers to Leaflet format
  const leafletMarkers = useMemo(() => {
    const markerList: any[] = [];

    // Add current location marker
    if (currentLocation) {
      markerList.push({
        id: 'current-location',
        position: [currentLocation.latitude, currentLocation.longitude],
        icon: '📍',
        size: [32, 32],
      });
    }

    // Add custom markers
    markers.forEach((marker, index) => {
      markerList.push({
        id: `marker-${index}`,
        position: [marker.latitude, marker.longitude],
        icon: '📍',
        size: [32, 32],
        title: marker.title || `Marker ${index + 1}`,
      });
    });

    return markerList;
  }, [currentLocation, markers]);

  // Convert route coordinates to polyline
  const polylines = useMemo(() => {
    if (!showRoute || routeCoordinates.length < 2) {
      return [];
    }

    return [
      {
        positions: routeCoordinates.map((coord) => [coord.latitude, coord.longitude]),
        color: '#4285F4',
        weight: 4,
      },
    ];
  }, [routeCoordinates, showRoute]);

  return (
    <View style={[styles.container, { height }]}>
      <LeafletView
        mapCenterPosition={getCenter()}
        mapMarkers={leafletMarkers}
        mapLines={polylines}
        zoom={13}
        mapLayers={[
          {
            baseLayer: true,
            baseLayerName: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
          },
        ]}
        onMessage={(message) => {
          // Handle map events if needed
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default CustomMapView;
