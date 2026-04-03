import React, { useEffect, useRef, useState } from 'react';
import { FanConfig, FanFinish } from '../types';
import { FINISH_PROPERTIES, MATERIAL_CONFIG, FAN_MODEL_URL, FAN_MODEL_IOS_URL } from '../constants';

interface ModelViewerProps {
  config: FanConfig;
  className?: string;
  style?: React.CSSProperties;
  arActive?: boolean; // If true, try to launch AR
}

// Bypass TypeScript check for custom element by casting the tag name
const ModelViewerElement = 'model-viewer' as any;

const ModelViewer: React.FC<ModelViewerProps> = ({ 
  config, 
  className, 
  style,
  arActive,
}) => {
  const modelRef = useRef<HTMLElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Robust Hex to RGB conversion helper
  // FIX: Handles #FFF (shorthand), whitespace, and ensures 3D model doesn't break
  const hexToRgb = (hex: string): [number, number, number] => {
    // 1. Remove hash and whitespace
    let h = hex.replace(/^#/, '').trim();

    // 2. Handle shorthand (e.g. "FFF" -> "FFFFFF")
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }

    // 3. Validate length (must be 6 chars now)
    if (h.length !== 6) {
      console.warn(`[ModelViewer] Invalid hex code provided: "${hex}". Defaulting to white.`);
      return [1, 1, 1]; 
    }

    // 4. Parse
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;

    // 5. Check for NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      console.warn(`[ModelViewer] Failed to parse hex values: "${hex}". Defaulting to white.`);
      return [1, 1, 1];
    }

    return [r, g, b];
  };

  // Effect: Handle Material Updates when Config changes
  useEffect(() => {
    const updateMaterials = () => {
      const modelViewer = modelRef.current as any;
      if (!modelViewer || !modelViewer.model) return;

      const finishProps = FINISH_PROPERTIES[config.finish];
      const colorRgb = hexToRgb(config.color);

      // Iterate through materials defined in constants
      MATERIAL_CONFIG.targetMaterialNames.forEach((targetName) => {
        const material = modelViewer.model.materials.find((m: any) => m.name === targetName);
        
        if (material) {
          // Update PBR properties
          material.pbrMetallicRoughness.setBaseColorFactor([...colorRgb, 1.0]); // RGB + Alpha
          material.pbrMetallicRoughness.setRoughnessFactor(finishProps.roughness);
          material.pbrMetallicRoughness.setMetallicFactor(finishProps.metallic);
        }
      });
    };

    if (modelLoaded) {
      updateMaterials();
    }
  }, [config, modelLoaded]);

  // Effect: Listen for load event
  useEffect(() => {
    const currentRef = modelRef.current as any;
    const handleLoad = () => {
      setModelLoaded(true);
    };

    if (currentRef) {
      currentRef.addEventListener('load', handleLoad);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('load', handleLoad);
      }
    };
  }, []);

  // Effect: Trigger AR
  useEffect(() => {
    if (arActive && modelRef.current) {
      (modelRef.current as any).activateAR();
    }
  }, [arActive]);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
       {/* 
         NOTE: 
         - `src` points to the GLB file.
         - `ios-src` points to USDZ for iOS Quick Look.
         - `ar-modes="webxr scene-viewer quick-look"` ensures best compatibility.
       */}
      <ModelViewerElement
        ref={modelRef}
        src={FAN_MODEL_URL}
        ios-src={FAN_MODEL_IOS_URL}
        alt="A premium ceiling fan"
        camera-controls={true}
        ar={arActive} // Only enable AR button/functionality if requested
        ar-modes="webxr scene-viewer quick-look"
        shadow-intensity="1"
        exposure="0.8"
        interaction-prompt="auto"
        style={{ width: '100%', height: '100%' }}
      >
        {!modelLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-10">
            <span className="text-stone-400 text-sm animate-pulse">Loading 3D Experience...</span>
          </div>
        )}
      </ModelViewerElement>
    </div>
  );
};

export default ModelViewer;