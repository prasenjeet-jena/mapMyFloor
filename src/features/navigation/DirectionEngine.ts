import { PixelPoint } from './GridBuilder';

export interface NavStep {
  instruction: string;
  distance: number; // in meters
}

export interface NavDirections {
  steps: NavStep[];
  totalDistance: number; // in meters
  walkTimeSeconds: number;
}

const getCompassDirectionName = (dx: number, dy: number): string => {
  const angle = Math.atan2(dy, dx); // dy goes down in canvas coordinates
  const degrees = (angle * 180) / Math.PI;

  // Canvas degrees: North is negative y (-90), East is positive x (0), South is positive y (90), West is negative x (180/-180)
  if (degrees >= -135 && degrees < -45) return 'North';
  if (degrees >= -45 && degrees < 45) return 'East';
  if (degrees >= 45 && degrees < 135) return 'South';
  return 'West';
};

const getTurnInstruction = (diff: number): string => {
  const deg = (diff * 180) / Math.PI;
  if (deg >= 20 && deg < 60) return 'Turn slightly right';
  if (deg >= 60 && deg < 120) return 'Turn right';
  if (deg >= 120) return 'Make a sharp right turn';
  if (deg <= -20 && deg > -60) return 'Turn slightly left';
  if (deg <= -60 && deg > -120) return 'Turn left';
  return 'Make a sharp left turn';
};

/**
 * Translates waypoint segments into compass directions and turn instructions
 */
export function generateDirections(
  path: PixelPoint[],
  pixelsPerMeter: number,
  destinationName: string
): NavDirections {
  if (path.length < 2) {
    return {
      steps: [{ instruction: 'You are at your destination.', distance: 0 }],
      totalDistance: 0,
      walkTimeSeconds: 0,
    };
  }

  // Step 1: Simplify path by removing waypoints that are less than 1 meter apart
  const simplifiedPath: PixelPoint[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const prev = simplifiedPath[simplifiedPath.length - 1];
    const curr = path[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy) / pixelsPerMeter;

    if (dist < 1 && i < path.length - 1) {
      continue;
    }
    simplifiedPath.push(curr);
  }

  const steps: NavStep[] = [];
  let totalDistance = 0;

  // Calculate segment angles and distances
  interface Segment {
    dx: number;
    dy: number;
    angle: number;
    distanceM: number;
  }

  const segments: Segment[] = [];
  for (let i = 0; i < simplifiedPath.length - 1; i++) {
    const p1 = simplifiedPath[i];
    const p2 = simplifiedPath[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const distanceM = pixelDist / pixelsPerMeter;
    totalDistance += distanceM;

    segments.push({
      dx,
      dy,
      angle: Math.atan2(dy, dx),
      distanceM,
    });
  }

  if (segments.length === 0) {
    return {
      steps: [
        { instruction: `Arrive at ${destinationName}`, distance: 0 }
      ],
      totalDistance: 0,
      walkTimeSeconds: 0,
    };
  }

  // Step 2: Generate turn-by-turn text instructions
  let currentSegment = segments[0];
  let accumulatedDistance = currentSegment.distanceM;
  let currentHeading = getCompassDirectionName(currentSegment.dx, currentSegment.dy);
  
  let lastInstruction = `Head ${currentHeading.toLowerCase()}`;
  const rawSteps: NavStep[] = [];

  for (let i = 1; i < segments.length; i++) {
    const nextSeg = segments[i];
    
    // Normalize angle difference to [-Math.PI, Math.PI]
    let diff = nextSeg.angle - currentSegment.angle;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;

    // Check if the direction difference is a turn (>= 20 degrees)
    if (Math.abs(diff) >= (20 * Math.PI) / 180) {
      rawSteps.push({
        instruction: `${lastInstruction} for ~${Math.round(accumulatedDistance)} m`,
        distance: accumulatedDistance,
      });

      const turnType = getTurnInstruction(diff);
      lastInstruction = turnType;
      accumulatedDistance = nextSeg.distanceM;
    } else {
      accumulatedDistance += nextSeg.distanceM;
    }

    currentSegment = nextSeg;
  }

  // Add the last segment
  rawSteps.push({
    instruction: `${lastInstruction} for ~${Math.round(accumulatedDistance)} m`,
    distance: accumulatedDistance,
  });

  // Step 3: Merge steps with segment distance under 1 meter
  const mergedSteps: NavStep[] = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const step = rawSteps[i];
    
    if (step.distance > 0 && step.distance < 1) {
      if (mergedSteps.length > 0) {
        // Merge into previous step
        const prevStep = mergedSteps[mergedSteps.length - 1];
        prevStep.distance += step.distance;
        
        if (step.instruction.startsWith('Turn') || step.instruction.startsWith('Make') || step.instruction.startsWith('Slight')) {
          const action = step.instruction.split(' for ')[0];
          prevStep.instruction = `${prevStep.instruction.split(' for ')[0]}, then ${action.toLowerCase()} to arrive`;
        } else {
          const baseInstruction = prevStep.instruction.split(' for ')[0];
          prevStep.instruction = `${baseInstruction} for ~${Math.round(prevStep.distance)} m`;
        }
      } else if (i < rawSteps.length - 1) {
        // Merge forward into next step
        const nextStep = rawSteps[i + 1];
        nextStep.distance += step.distance;
        if (step.instruction.startsWith('Turn') || step.instruction.startsWith('Make') || step.instruction.startsWith('Slight')) {
          const action = step.instruction.split(' for ')[0];
          nextStep.instruction = `${action}, then ${nextStep.instruction.charAt(0).toLowerCase() + nextStep.instruction.slice(1)}`;
        }
      } else {
        mergedSteps.push(step);
      }
    } else {
      mergedSteps.push(step);
    }
  }

  // Final destination step
  mergedSteps.push({
    instruction: `Arrive at ${destinationName}`,
    distance: 0,
  });

  const walkingSpeed = 1.4; // 1.4 m/s typical walking speed
  const walkTimeSeconds = totalDistance / walkingSpeed;

  return {
    steps: mergedSteps,
    totalDistance,
    walkTimeSeconds,
  };
}
