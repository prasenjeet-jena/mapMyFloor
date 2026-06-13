import { useState, useEffect } from 'react';
import { Point } from '../shared/types';

export function useGPS(simulated: boolean = false) {
  const [location, setLocation] = useState<Point | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (simulated) return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      setLocation({
        x: position.coords.longitude, // representation, to be mapped in canvas coordinate conversion
        y: position.coords.latitude
      });
      setAccuracy(position.coords.accuracy);
      setError(null);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      setError(err.message);
    };

    const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [simulated]);

  return { location, setLocation, accuracy, error };
}
