import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a floor plan file to Firebase Storage.
 * Stores file at floorplans/{buildingId}/{floorId}.{ext} and returns the download URL.
 */
export const uploadFloorPlanImage = async (
  buildingId: string,
  floorId: string,
  blob: Blob
): Promise<string> => {
  const storageRef = ref(storage, `floorplans/${buildingId}/${floorId}.png`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};
