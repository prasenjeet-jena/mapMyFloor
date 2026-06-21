import { WalkableGrid, GridCell, PixelPoint } from './GridBuilder';
import { Point, CorridorGraph, GraphNode } from '../../shared/types';

interface AStarNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

const getHeuristic = (c1: GridCell, c2: GridCell): number => {
  const dx = Math.abs(c1.col - c2.col);
  const dy = Math.abs(c1.row - c2.row);
  const D = 1;
  const D2 = Math.sqrt(2);
  // Octile distance for 8-directional movement grid
  return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
};

/**
 * Smooths path by removing redundant collinear waypoints
 */
export function smoothPath(path: PixelPoint[]): PixelPoint[] {
  if (path.length <= 2) return path;

  const smoothed: PixelPoint[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 === 0 || len2 === 0) continue;

    // Collinear check via dot product
    const dotProduct = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);

    // If segments are collinear (cos angle close to 1), skip curr point
    if (Math.abs(dotProduct - 1) < 0.01) {
      continue;
    }

    smoothed.push(curr);
  }

  smoothed.push(path[path.length - 1]);
  return smoothed;
}

/**
 * Calculates the shortest path between start and end using A*
 */
export function findPath(
  grid: WalkableGrid,
  start: PixelPoint,
  end: PixelPoint
): PixelPoint[] | null {
  const startCell = grid.pixelToCell(start.x, start.y);
  const endCell = grid.pixelToCell(end.x, end.y);

  const openList: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    col: startCell.col,
    row: startCell.row,
    g: 0,
    h: getHeuristic(startCell, endCell),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openList.push(startNode);

  while (openList.length > 0) {
    // Get node with lowest f cost
    openList.sort((a, b) => a.f - b.f);
    const currNode = openList.shift()!;

    const key = `${currNode.col},${currNode.row}`;
    closedSet.add(key);

    // If target reached, reconstruct the path
    if (currNode.col === endCell.col && currNode.row === endCell.row) {
      const cellPath: GridCell[] = [];
      let temp: AStarNode | null = currNode;
      while (temp !== null) {
        cellPath.push({ col: temp.col, row: temp.row });
        temp = temp.parent;
      }
      cellPath.reverse();

      const pixelPath = cellPath.map((cell) => grid.cellToPixel(cell.col, cell.row));
      
      // Keep starting and ending points exact
      pixelPath[0] = start;
      pixelPath[pixelPath.length - 1] = end;

      return smoothPath(pixelPath);
    }

    // Examine 8 neighbors
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;

        const nextCol = currNode.col + dCol;
        const nextRow = currNode.row + dRow;

        const neighborKey = `${nextCol},${nextRow}`;
        if (closedSet.has(neighborKey)) continue;

        // Start and end cells are always walkable to avoid grid boundaries blocking endpoints
        const isWalk = 
          (nextCol === startCell.col && nextRow === startCell.row) ||
          (nextCol === endCell.col && nextRow === endCell.row) ||
          grid.isWalkable(nextCol, nextRow);

        if (!isWalk) continue;

        // Diagonal travel cost is slightly penalized (1.8 instead of 1.41) to prefer straight corridor movement
        const cellCostMultiplier = grid.getCellCost(nextCol, nextRow);
        const moveCost = ((dRow !== 0 && dCol !== 0) ? 1.8 : 1) * cellCostMultiplier;
        const gScore = currNode.g + moveCost;

        const existingNode = openList.find((node) => node.col === nextCol && node.row === nextRow);

        if (existingNode) {
          if (gScore < existingNode.g) {
            existingNode.g = gScore;
            existingNode.f = gScore + existingNode.h;
            existingNode.parent = currNode;
          }
        } else {
          const neighborNode: AStarNode = {
            col: nextCol,
            row: nextRow,
            g: gScore,
            h: getHeuristic({ col: nextCol, row: nextRow }, endCell),
            f: 0,
            parent: currNode,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openList.push(neighborNode);
        }
      }
    }
  }

  return null; // Path not found
}

/**
 * Runs Dijkstra's algorithm over the corridor graph nodes and edges
 * to find the shortest path from startNodeId to endNodeId.
 * Weights are calculated as Euclidean distances in meters (via pixelsPerMeter).
 */
export function findGraphPath(
  graph: CorridorGraph,
  startNodeId: string,
  endNodeId: string,
  pixelsPerMeter: number
): GraphNode[] | null {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  if (nodes.length === 0) return null;

  const nodesMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodesMap.set(node.id, node);
  }

  // Verify start and end nodes exist
  if (!nodesMap.has(startNodeId) || !nodesMap.has(endNodeId)) {
    return null;
  }

  // Build adjacency list
  const adj = new Map<string, { to: string; weight: number }[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  const getDistance = (n1: GraphNode, n2: GraphNode) => {
    const dx = n1.x - n2.x;
    const dy = n1.y - n2.y;
    return Math.sqrt(dx * dx + dy * dy) / pixelsPerMeter;
  };

  for (const edge of edges) {
    const nFrom = nodesMap.get(edge.from);
    const nTo = nodesMap.get(edge.to);
    if (!nFrom || !nTo) continue;

    const dist = getDistance(nFrom, nTo);
    adj.get(edge.from)!.push({ to: edge.to, weight: dist });
    adj.get(edge.to)!.push({ to: edge.from, weight: dist }); // undirected graph
  }

  // Dijkstra state
  const distances = new Map<string, number>();
  const parents = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
    parents.set(node.id, null);
  }

  distances.set(startNodeId, 0);

  while (true) {
    let u: string | null = null;
    let minD = Infinity;

    for (const [nodeId, dist] of distances.entries()) {
      if (!visited.has(nodeId) && dist < minD) {
        minD = dist;
        u = nodeId;
      }
    }

    if (u === null) {
      break;
    }

    if (u === endNodeId) {
      break;
    }

    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      
      const currentDist = distances.get(u)!;
      const alt = currentDist + neighbor.weight;
      const targetDist = distances.get(neighbor.to)!;

      if (alt < targetDist) {
        distances.set(neighbor.to, alt);
        parents.set(neighbor.to, u);
      }
    }
  }

  // Check if destination was reached
  if (distances.get(endNodeId) === Infinity) {
    return null; // unreachable
  }

  // Reconstruct path from start to end
  const path: GraphNode[] = [];
  let curr: string | null = endNodeId;
  while (curr !== null) {
    const node = nodesMap.get(curr);
    if (node) {
      path.push(node);
    }
    curr = parents.get(curr) || null;
  }
  
  path.reverse();
  return path;
}
