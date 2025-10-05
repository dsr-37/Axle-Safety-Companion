import * as Location from 'expo-location';
import { Alert } from 'react-native';

export class LocationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access for emergency features and hazard reporting.'
        );
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Wrap getCurrentPositionAsync to enforce timeout manually
  static async getCurrentLocation(timeoutMs = 10000): Promise<Location.LocationObject> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) throw new Error('Location permission denied');

    const getPosition = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Location request timed out')), timeoutMs)
    );

    return Promise.race([getPosition, timeout]);
  }

  static async watchPosition(
    callback: (location: Location.LocationObject) => void,
    errorCallback?: (error: string) => void
  ): Promise<Location.LocationSubscription | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        callback
      );
      return sub;
    } catch (e) {
      if (errorCallback) errorCallback('Failed to watch position');
      return null;
    }
  }

  static formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = Array.isArray(results) && results.length > 0 ? results[0] : undefined;

      if (!addr) return null;

      const parts = [
        addr.street || '',
        addr.city || addr.subregion || '',
        addr.region || '',
        addr.postalCode || '',
      ]
        .map(s => (s || '').trim())
        .filter(Boolean);

      return parts.join(', ') || null;
    } catch {
      return null;
    }
  }
}
