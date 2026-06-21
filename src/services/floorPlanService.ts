import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Room, CorridorGraph } from '../shared/types';
import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker using CDN to avoid bundling complications
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';

export interface ParseFloorPlanResponse {
  scale: {
    pixelsPerMeter: number;
    floorWidthMeters: number;
    floorHeightMeters: number;
  };
  rooms: Room[];
  pngBlob: Blob;
  imageWidth: number;
  imageHeight: number;
  corridorGraph?: CorridorGraph;
}

/**
 * Reads a standard image file (PNG/JPG) as a base64 string without data prefix
 */
const readImageAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Parses SVG text to find dimensions from width/height or viewBox
 */
const parseSvgDimensions = (svgText: string): { width: number; height: number } => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    if (!svgElement) return { width: 1200, height: 900 };

    // 1. Try explicit width/height attributes
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');
    let width = widthAttr ? parseFloat(widthAttr) : 0;
    let height = heightAttr ? parseFloat(heightAttr) : 0;

    // 2. Try viewBox attribute if width/height are not set or 0
    if ((!width || !height) && svgElement.hasAttribute('viewBox')) {
      const viewBox = svgElement.getAttribute('viewBox') || '';
      const parts = viewBox.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const vbWidth = parseFloat(parts[2]);
        const vbHeight = parseFloat(parts[3]);
        if (vbWidth > 0 && vbHeight > 0) {
          width = vbWidth;
          height = vbHeight;
        }
      }
    }

    return {
      width: width || 1200,
      height: height || 900
    };
  } catch (err) {
    console.error('Error parsing SVG dimensions:', err);
    return { width: 1200, height: 900 };
  }
};

/**
 * Renders an SVG file to a canvas element at 2x scale
 */
const renderSvgToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  let svgText = await file.text();
  const dims = parseSvgDimensions(svgText);

  // Inject width and height attributes into the SVG tag if they are missing or invalid
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    if (svgElement) {
      svgElement.setAttribute('width', dims.width.toString());
      svgElement.setAttribute('height', dims.height.toString());
      const serializer = new XMLSerializer();
      svgText = serializer.serializeToString(doc);
    }
  } catch (e) {
    console.error('Failed to inject width/height to SVG:', e);
  }
  
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = 2; // Render at 2x scale for high resolution
        canvas.width = dims.width * scale;
        canvas.height = dims.height * scale;
        
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not create 2D canvas context'));
          return;
        }
        
        // Fill canvas with white background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the SVG image onto the canvas
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG source image: ' + String(err)));
    };
    
    img.src = url;
  });
};

/**
 * Renders the first page of a PDF file to a canvas at 2x scale
 */
const renderPdfToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 2.0 }); // 2x scale
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to initialize 2D canvas context for PDF rendering');
  }
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  return canvas;
};

/**
 * Helper to convert any input format (PDF, SVG, PNG, JPG) to PNG Blob, base64 and dimensions
 */
const convertToPngAndGetDimensions = async (
  file: File
): Promise<{ blob: Blob; base64: string; width: number; height: number }> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (['png', 'jpg', 'jpeg'].includes(extension || '')) {
    const base64 = await readImageAsBase64(file);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = (err) => reject(err);
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
    return { blob: file, base64, width: dimensions.width, height: dimensions.height };
  }

  let canvas: HTMLCanvasElement;
  if (extension === 'svg') {
    canvas = await renderSvgToCanvas(file);
  } else if (extension === 'pdf') {
    canvas = await renderPdfToCanvas(file);
  } else {
    throw new Error('Unsupported file extension. Please upload PNG, JPG, SVG, or PDF.');
  }

  // Convert canvas to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas conversion to PNG Blob failed'));
    }, 'image/png');
  });

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  
  return {
    blob,
    base64,
    width: canvas.width,
    height: canvas.height
  };
};

/**
 * Entrypoint to upload and parse a floor plan file via the Firebase callable function
 */
export async function parseFloorPlan(file: File): Promise<ParseFloorPlanResponse> {
  const { blob, base64, width, height } = await convertToPngAndGetDimensions(file);

  // Create client reference to Callable Cloud Function
  const parseFunction = httpsCallable<{ imageBase64: string; mimeType: string }, any>(
    functions, 
    'parseFloorPlan',
    { timeout: 120000 }
  );

  const response = await parseFunction({ imageBase64: base64, mimeType: 'image/png' });
  
  return {
    ...response.data,
    pngBlob: blob,
    imageWidth: width,
    imageHeight: height
  };
}
