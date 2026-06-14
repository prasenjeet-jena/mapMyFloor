import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  getDoc,
  query, 
  orderBy,
  writeBatch,
  collectionGroup,
  where
} from 'firebase/firestore';
import { Building, Floor, Room } from '../shared/types';

/**
 * Helper to ensure the local user document has the 'admin' role.
 * This permits database writes governed by Firestore security rules.
 */
export const ensureAdminUser = async (uid: string, email: string | null, displayName: string | null) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    displayName: displayName || 'Admin User',
    email: email || '',
    role: 'admin',
    buildingId: 'default'
  }, { merge: true });
};

/**
 * Saves a building configuration and floor layout document to Firestore.
 */
export const saveBuildingAndFloor = async (building: Building, floor: Floor) => {
  // Save building
  const buildingRef = doc(db, 'buildings', building.id);
  await setDoc(buildingRef, building, { merge: true });

  // Save floor
  const floorRef = doc(db, `buildings/${building.id}/floors`, floor.id);
  await setDoc(floorRef, floor, { merge: true });
};

/**
 * Saves all rooms for a specific building floor using a batch write.
 */
export const saveRooms = async (buildingId: string, floorId: string, rooms: Room[]) => {
  const batch = writeBatch(db);
  const roomsColRef = collection(db, `buildings/${buildingId}/floors/${floorId}/rooms`);

  rooms.forEach((room) => {
    // Generate document reference with an auto ID
    const roomRef = doc(roomsColRef);
    batch.set(roomRef, {
      ...room,
      id: roomRef.id,
      buildingId,
      floorId
    });
  });

  await batch.commit();
};

export interface FloorListItem {
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorNumber: number;
  label: string;
  roomCount: number;
  imageUrl: string;
  createdAt: string;
}

/**
 * Fetches all floors across all buildings from Firestore.
 */
export const getAllFloors = async (): Promise<FloorListItem[]> => {
  const floorsList: FloorListItem[] = [];
  const buildingsSnapshot = await getDocs(collection(db, 'buildings'));
  
  for (const buildingDoc of buildingsSnapshot.docs) {
    const buildingData = buildingDoc.data();
    const floorsSnapshot = await getDocs(collection(db, `buildings/${buildingDoc.id}/floors`));
    
    for (const floorDoc of floorsSnapshot.docs) {
      const floorData = floorDoc.data();
      // Get number of rooms
      const roomsSnapshot = await getDocs(collection(db, `buildings/${buildingDoc.id}/floors/${floorDoc.id}/rooms`));
      
      floorsList.push({
        buildingId: buildingDoc.id,
        buildingName: buildingData.name || 'Unknown Building',
        floorId: floorDoc.id,
        floorNumber: floorData.floorNumber,
        label: floorData.label || `Floor ${floorData.floorNumber}`,
        roomCount: roomsSnapshot.size,
        imageUrl: floorData.imageUrl || '',
        createdAt: floorData.createdAt || new Date().toISOString()
      });
    }
  }
  
  return floorsList;
};

/**
 * Searches for a floor by ID across all buildings and retrieves its rooms.
 */
export const getFloorWithRooms = async (floorId: string) => {
  // Query all floors across all buildings
  const floorsQuery = query(collectionGroup(db, 'floors'), where('id', '==', floorId));
  const querySnapshot = await getDocs(floorsQuery);
  
  if (querySnapshot.empty) return null;
  
  const floorDoc = querySnapshot.docs[0];
  const floorData = floorDoc.data() as Floor;
  const buildingId = floorData.buildingId;
  
  // Fetch rooms for this floor
  const roomsSnapshot = await getDocs(collection(db, `buildings/${buildingId}/floors/${floorId}/rooms`));
  const rooms = roomsSnapshot.docs.map(doc => doc.data()) as Room[];

  return {
    floor: floorData,
    rooms
  };
};
