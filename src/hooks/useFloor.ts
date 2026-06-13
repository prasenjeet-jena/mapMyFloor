import { createContext, useContext } from 'react';
import { Floor } from '../shared/types';

export interface FloorContextType {
  currentFloor: Floor | null;
  setCurrentFloor: (floor: Floor | null) => void;
  floors: Floor[];
  setFloors: (floors: Floor[]) => void;
  loadingFloors: boolean;
}

export const FloorContext = createContext<FloorContextType>({
  currentFloor: null,
  setCurrentFloor: () => {},
  floors: [],
  setFloors: () => {},
  loadingFloors: false
});

export const useFloor = () => useContext(FloorContext);
