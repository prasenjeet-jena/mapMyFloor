require('dotenv').config();
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const logger = require("firebase-functions/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Set global options for v2 functions
setGlobalOptions({ maxInstances: 10 });

/**
 * Parses an uploaded floor plan image using Gemini 1.5 Flash.
 * Returns structured data including rooms, walkable areas, and scale dimensions.
 */
exports.parseFloorPlan = onCall({
  cors: true,
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (request) => {
  logger.info("parseFloorPlan: Function invoked");

  // Verify parameters
  const { imageBase64, mimeType } = request.data || {};
  if (!imageBase64 || !mimeType) {
    logger.error("parseFloorPlan: Missing imageBase64 or mimeType in request payload");
    throw new HttpsError("invalid-argument", "The function must be called with an 'imageBase64' string and a 'mimeType'.");
  }

  // Get Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error("parseFloorPlan: GEMINI_API_KEY environment variable is not defined");
    throw new HttpsError("failed-precondition", "Gemini API key is not configured in the function environment.");
  }

  try {
    // Initialize Google Gen AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get the Gemini 1.5 Flash model and configure it for JSON output
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const systemPrompt = `You are analyzing an office floor plan image. Extract structured data. Return ONLY valid JSON with no markdown, no code fences, no prose. Format:
{
  "scale": { 
    "pixelsPerMeter": number, 
    "floorWidthMeters": number, 
    "floorHeightMeters": number 
  },
  "rooms": [
    {
      "id": string, // stable slug, e.g. "conf-5a"
      "name": string,
      "type": one of [meeting_room, conference_room, boardroom, desk_area, reception, cafeteria, restroom, elevator, staircase, corridor, lobby, medical, prayer, recreation, admin, hr, it_server, pantry, mothers_room, phone_booth, other],
      "polygon": [ {"x": number, "y": number}, ... ], // ordered vertices tracing the room's actual walls (4+ points), not just a bounding box
      "realWidthMeters": number, // read from the dimension label printed in the room if present (e.g. 8 for "8m×6m"), otherwise estimate or null
      "realHeightMeters": number, // read from the dimension label printed in the room if present (e.g. 6 for "8m×6m"), otherwise estimate or null
      "isWalkable": boolean, // true ONLY for corridor, lobby, reception, cafeteria, desk_area, recreation, elevator lobby; false for closed offices/meeting rooms
      "doors": [ {"x": number, "y": number} ] // door location(s) on the room boundary where it connects to a corridor
    }
  ],
  "corridorGraph": {
    "nodes": [ 
      { "id": string, "x": number, "y": number } // waypoints along corridor centerlines + at intersections + at each room door
    ],
    "edges": [ 
      { "from": string, "to": string } // connections forming the walkable network; corridors connect at intersections; each room's door connects to the nearest corridor node
    ]
  }
}

Instructions:
- Trace room polygons precisely to the actual drawn walls (forming closed loops of at least 4 points).
- Identify every corridor and represent the walkable circulation as a CONNECTED graph of nodes and edges.
- Place a node at every corridor intersection and at every room door location.
- Connect each room's door node into the corridor graph using edges so any room is fully reachable in the network.
- Make sure the graph is fully connected.
- Coordinates are PERCENT (0-100) of the image width and height.
Identify every distinct labeled room, desk zone, corridor, and amenity. Be thorough.`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    };

    logger.info("parseFloorPlan: Requesting Gemini content generation");
    const result = await model.generateContent([systemPrompt, imagePart]);
    const response = await result.response;
    let text = response.text().trim();

    logger.info("parseFloorPlan: Received raw response from Gemini", { textLength: text.length });

    // Fallback: Strip markdown fences if present in the response
    if (text.startsWith("```")) {
      text = text.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }

    // Parse the response as JSON to validate its structure before returning to client
    const parsedData = JSON.parse(text);
    logger.info("parseFloorPlan: Successfully parsed JSON. Returning payload.");
    return parsedData;

  } catch (error) {
    logger.error("parseFloorPlan: Error executing floor plan analysis:", error);
    throw new HttpsError("internal", error.message || "Failed to process floor plan with Gemini.");
  }
});
