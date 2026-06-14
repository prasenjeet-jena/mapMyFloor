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
  "pixelsPerMeter": number (estimate from scale bar or dimension labels; if none, estimate from typical room sizes),
  "floorWidthMeters": number,
  "floorHeightMeters": number,
  "rooms": [
    {
      "name": string (room label as shown, e.g. 'Conference Room 5A'),
      "type": one of [meeting_room, conference_room, desk_area, reception, cafeteria, restroom, elevator, staircase, corridor, medical, prayer, recreation, admin, hr, it_server, boardroom, other],
      "bbox": { "x": number, "y": number, "width": number, "height": number } (as PERCENTAGE 0-100 of image dimensions),
      "isWalkable": boolean (true for corridors, lobbies, open areas; false for closed rooms)
    }
  ]
}
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
