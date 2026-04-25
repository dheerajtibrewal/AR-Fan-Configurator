import { FanFinish, FanModelMaterialConfig } from './types';

// ==========================================
// 1. MODEL SOURCE
// ==========================================
// Replace these URLs with the link to your actual fan model files.
// .glb is for the Web/Android 3D viewer.
// .usdz is required specifically for iPhone AR (Quick Look).
export const FAN_MODEL_URL = './components/fan.glb'; 
export const FAN_MODEL_IOS_URL = './components/Fan.usdz';

// ==========================================
// 2. MATERIAL MAPPING (CRITICAL)
// ==========================================
// To change the color of specific parts (like blades or body), you must list 
// the EXACT material names used in your 3D software (Blender, Maya, etc.).
// 
// TIP: Check your browser console (F12) when the app runs. 
// We are logging all found material names there for you.
export const MATERIAL_CONFIG: FanModelMaterialConfig = {
  // Example: If your GLB has materials named "Fan_Blades_Mat" and "Motor_Housing_Mat"
  targetMaterialNames: ['Material'], 
};

// ==========================================
// 3. FINISH CONFIGURATION
// ==========================================
// PBR (Physically Based Rendering) settings for different textures.
// Roughness: 0 = Mirror, 1 = Sandpaper
// Metallic: 0 = Plastic/Wood, 1 = Metal
export const FINISH_PROPERTIES: Record<FanFinish, { roughness: number; metallic: number }> = {
  [FanFinish.MATTE]: { roughness: 0.8, metallic: 0.0 },
  [FanFinish.METALLIC]: { roughness: 0.2, metallic: 1.0 },
  [FanFinish.PEARL]: { roughness: 0.35, metallic: 0.4 },
};

export const DEFAULT_CONFIG = {
  color: '#FFFFFF',
  finish: FanFinish.MATTE,
};

export const PRESET_COLORS = [
  '#FFFFFF', // White
  '#1C1917', // Stone 900 (Black/Dark Grey)
  '#78716C', // Stone 500 (Grey)
  '#B45309', // Amber 700 (Wood tone approx)
  '#D4D4D8', // Zinc 300 (Silver)
  '#713F12', // Bronze tone
];