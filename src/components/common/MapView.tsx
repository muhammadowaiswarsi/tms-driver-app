import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

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
  // Calculate initial region
  const getInitialRegion = () => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    if (routeCoordinates.length > 0) {
      const lats = routeCoordinates.map((coord) => coord.latitude);
      const lngs = routeCoordinates.map((coord) => coord.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.5,
        longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.5,
      };
    }

    // Default to a central location (you can change this)
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getInitialRegion()}
        showsUserLocation={!!currentLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapType="standard">
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Current Location"
            pinColor="#4285F4"
          />
        )}

        {/* Route Polyline */}
        {showRoute && routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
            lineDashPattern={[]}
          />
        )}

        {/* Custom Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title || `Marker ${index + 1}`}
            pinColor="#f44336"
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default CustomMapView;

