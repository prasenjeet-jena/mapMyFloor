import { useState, useEffect, useCallback } from 'react';
import { useDevMode } from '../features/devmode/DevModeToggle';
import { Room } from '../shared/types';

export interface UserPosition {
  x: number;
  y: number;
}

export function useUserPosition(rooms: Room[], imgW: number, imgH: number) {
  const { isDevMode, simulatedLocation, setSimulatedLocation } = useDevMode();
  const [realPosition, setRealPosition] = useState<UserPosition | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Find default position: reception centroid -> entrance/lobby centroid -> first walkable room -> first room -> center
  const getFallbackPosition = useCallback((): UserPosition => {
    if (!rooms || rooms.length === 0) {
      return { x: imgW / 2, y: imgH / 2 };
    }

    // 1. Try reception
    const reception = rooms.find(
      (r) => r.type === 'reception' || r.name.toLowerCase().includes('reception')
    );
    if (reception?.centroid) {
      return { x: reception.centroid.x, y: reception.centroid.y };
    }

    // 2. Try entrance or lobby
    const entrance = rooms.find(
      (r) => r.name.toLowerCase().includes('entrance') || r.name.toLowerCase().includes('lobby')
    );
    if (entrance?.centroid) {
      return { x: entrance.centroid.x, y: entrance.centroid.y };
    }

    // 3. Try any walkable room
    const walkable = rooms.find((r) => r.isWalkable);
    if (walkable?.centroid) {
      return { x: walkable.centroid.x, y: walkable.centroid.y };
    }

    // 4. Try the first room with a centroid
    const anyRoomWithCentroid = rooms.find((r) => r.centroid);
    if (anyRoomWithCentroid?.centroid) {
      return { x: anyRoomWithCentroid.centroid.x, y: anyRoomWithCentroid.centroid.y };
    }

    // 5. Default to absolute center of the image area
    return { x: imgW / 2, y: imgH / 2 };
  }, [rooms, imgW, imgH]);

  // Track real position using browser geolocation API in Real Mode
  useEffect(() => {
    if (isDevMode) {
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      const fallback = getFallbackPosition();
      setRealPosition(fallback);
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setAccuracy(pos.coords.accuracy);
      // Default to floor's main entrance/reception centroid since GPS-to-pixel matrix is not yet wired
      const fallback = getFallbackPosition();
      setRealPosition(fallback);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation tracking failed, falling back to default floor entrance:', error.message);
      const fallback = getFallbackPosition();
      setRealPosition(fallback);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isDevMode, getFallbackPosition]);

  // Manual positioning logic in Dev Mode
  const setManualPosition = useCallback((x: number, y: number) => {
    if (isDevMode) {
      setSimulatedLocation({ x, y });
    }
  }, [isDevMode, setSimulatedLocation]);

  const fallback = getFallbackPosition();
  const position = isDevMode
    ? (simulatedLocation || fallback)
    : (realPosition || fallback);

  return {
    position,
    setManualPosition,
    accuracy,
    isDevMode
  };
}
