import { Room, Corridor } from '../../shared/types';

export interface GridCell {
  col: number;
  row: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

const isPointInsideRoom = (x: number, y: number, room: Room, imgW: number, imgH: number): boolean => {
  if (!room.bbox) return false;
  const rx = (room.bbox.x / 100) * imgW;
  const ry = (room.bbox.y / 100) * imgH;
  const rw = (room.bbox.width / 100) * imgW;
  const rh = (room.bbox.height / 100) * imgH;
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
};

const getDistanceToSegment = (C: PixelPoint, A: PixelPoint, B: PixelPoint): number => {
  const abX = B.x - A.x;
  const abY = B.y - A.y;
  const acX = C.x - A.x;
  const acY = C.y - A.y;
  
  const abLen2 = abX * abX + abY * abY;
  if (abLen2 === 0) {
    return Math.sqrt(acX * acX + acY * acY);
  }
  
  let t = (acX * abX + acY * abY) / abLen2;
  t = Math.max(0, Math.min(1, t));
  
  const projX = A.x + t * abX;
  const projY = A.y + t * abY;
  
  const dx = C.x - projX;
  const dy = C.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getDistanceToCorridor = (C: PixelPoint, corridorPoints: PixelPoint[]): number => {
  if (corridorPoints.length === 0) return Infinity;
  if (corridorPoints.length === 1) {
    const dx = C.x - corridorPoints[0].x;
    const dy = C.y - corridorPoints[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  let minDistance = Infinity;
  for (let i = 0; i < corridorPoints.length - 1; i++) {
    const dist = getDistanceToSegment(C, corridorPoints[i], corridorPoints[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
};

export class WalkableGrid {
  cols: number;
  rows: number;
  gridCellSize: number;
  grid: boolean[][];
  costs: number[][];

  constructor(
    rooms: Room[],
    imgW: number,
    imgH: number,
    gridCellSize: number = 10,
    destinationRoomName?: string,
    startPt?: PixelPoint,
    corridors: Corridor[] = [],
    pixelsPerMeter: number = 15
  ) {
    this.gridCellSize = gridCellSize;
    this.cols = Math.ceil(imgW / gridCellSize);
    this.rows = Math.ceil(imgH / gridCellSize);
    this.grid = [];
    this.costs = [];

    // Find if start point is inside any room
    let startRoomName = "";
    if (startPt) {
      for (const room of rooms) {
        if (isPointInsideRoom(startPt.x, startPt.y, room, imgW, imgH)) {
          startRoomName = room.name;
          break;
        }
      }
    }

    // Step 1: Initialize grid based on room coordinates and walkability
    for (let r = 0; r < this.rows; r++) {
      const rowData: boolean[] = [];
      const costData: number[] = [];
      for (let c = 0; c < this.cols; c++) {
        const x = c * gridCellSize + gridCellSize / 2;
        const y = r * gridCellSize + gridCellSize / 2;

        let insideBlockedRoom = false;
        let insideDestRoom = false;
        let insideStartRoom = false;

        for (const room of rooms) {
          if (isPointInsideRoom(x, y, room, imgW, imgH)) {
            if (destinationRoomName && room.name === destinationRoomName) {
              insideDestRoom = true;
            } else if (startRoomName && room.name === startRoomName) {
              insideStartRoom = true;
            } else if (!room.isWalkable) {
              insideBlockedRoom = true;
            }
          }
        }

        const walkable = insideDestRoom || insideStartRoom || !insideBlockedRoom;
        rowData.push(walkable);

        // Compute cost based on corridor distance if walkable
        if (walkable) {
          let minDistanceToCorridor = Infinity;
          for (const corr of corridors) {
            const dist = getDistanceToCorridor({ x, y }, corr.centerline);
            if (dist < minDistanceToCorridor) {
              minDistanceToCorridor = dist;
            }
          }
          
          // 2 meter buffer
          if (minDistanceToCorridor <= 2.0 * pixelsPerMeter) {
            costData.push(1); // preferred low cost
          } else {
            costData.push(5); // open floor cost
          }
        } else {
          costData.push(5); // default fallback
        }
      }
      this.grid.push(rowData);
      this.costs.push(costData);
    }

    // Step 2: Dilation / buffer logic: block a 1-cell radius around any blocked cell, except inside destination and start rooms
    const finalGrid: boolean[][] = [];
    for (let r = 0; r < this.rows; r++) {
      finalGrid.push([...this.grid[r]]);
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          // Current cell c, r is blocked. Block all its 8 neighbors in finalGrid
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                // Ensure we do not block any cell belonging to the destination or start room
                const nx = nc * gridCellSize + gridCellSize / 2;
                const ny = nr * gridCellSize + gridCellSize / 2;
                let insideKeep = false;
                for (const room of rooms) {
                  const isDest = destinationRoomName && room.name === destinationRoomName;
                  const isStart = startRoomName && room.name === startRoomName;
                  if ((isDest || isStart) && isPointInsideRoom(nx, ny, room, imgW, imgH)) {
                    insideKeep = true;
                    break;
                  }
                }
                if (!insideKeep) {
                  finalGrid[nr][nc] = false;
                }
              }
            }
          }
        }
      }
    }
    this.grid = finalGrid;
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return false;
    }
    return this.grid[row][col];
  }

  getCellCost(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return 5;
    }
    return this.costs[row][col];
  }

  pixelToCell(x: number, y: number): GridCell {
    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.gridCellSize)));
    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.gridCellSize)));
    return { col, row };
  }

  cellToPixel(col: number, row: number): PixelPoint {
    return {
      x: col * this.gridCellSize + this.gridCellSize / 2,
      y: row * this.gridCellSize + this.gridCellSize / 2,
    };
  }
}
