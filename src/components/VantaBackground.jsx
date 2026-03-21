import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function VantaBackground({ children, fullWidth = false }) {
  const vantaRef = useRef(null);

  useEffect(() => {
    let effect = null;
    let mounted = true;

    const initVanta = async () => {
      if (!mounted || !vantaRef.current || typeof window === "undefined") {
        return;
      }

      try {
        const module = await import("vanta/dist/vanta.waves.min");
        const WAVES = module.default || module;
        effect = WAVES({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          waveHeight: 25,
          waveSpeed: 1.2,
          shininess: 40,
          zoom: 1,
          color: 0xffb6c1,           // light pink waves
          color2: 0x1e3a8a,          // dark blue highlight
          backgroundColor: false, // transparent background
          spacing: 20,
          amplitude: 40,
          scale: 1.05,
        });
      } catch (error) {
        console.error("Vanta background init failed", error);
      }
    };

    initVanta();

    return () => {
      mounted = false;
      if (effect && typeof effect.destroy === "function") {
        effect.destroy();
      }
    };
  }, []);

  return (
    <div ref={vantaRef} className="w-full min-h-screen h-screen relative overflow-hidden bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* 3D Wave Layers */}
      <div className="vanta-background-waves">
        <div className="wave-3d-layer wave-3d-1"></div>
        <div className="wave-3d-layer wave-3d-2"></div>
        <div className="wave-3d-layer wave-3d-3"></div>
        <div className="wave-3d-layer wave-3d-4"></div>
      </div>
      
      {/* Content: centered hero (default) or full-width dashboard */}
      <div
        className={
          fullWidth
            ? "absolute inset-0 z-10 flex min-h-0 w-full flex-col overflow-hidden p-0 sm:p-3"
            : "absolute inset-0 z-10 flex flex-col items-center justify-center p-6"
        }
      >
        {children}
      </div>
    </div>
  );
}