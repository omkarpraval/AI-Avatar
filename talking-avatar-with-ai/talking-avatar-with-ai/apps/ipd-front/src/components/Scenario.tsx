// src/components/Scenario.tsx
import { CameraControls, Environment, Sky } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { Avatar2 } from "./Avatar2";
import { Avatar3 } from "./Avatar3";

// CALL softShadows() ONCE at module level (outside component)
if (typeof window !== "undefined") {
  // @ts-ignore — softShadows is a global side-effect function
  import("@react-three/drei").then((drei) => {
    // @ts-ignore
    drei.softShadows?.({
      frustum: 3.75,
      size: 0.005,
      near: 9.5,
      samples: 17,
      rings: 11,
    });
  });
}

export const Scenario = ({ avatarType }: { avatarType: string }) => {
  const controlsRef = useRef<any>(null);

  // LOCK CAMERA – NO ZOOM, NO PAN, NO ROTATE
  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;
      controls.setLookAt(0, 1.6, 3.5, 0, 1.0, 0, false);
    }
  }, [avatarType]);

  const avatars: Record<string, any> = {
    maitri: Avatar,
    harsh: Avatar2,
    omkar: Avatar3,
  };
  const Selected = avatars[avatarType] || Avatar;

  return (
    <>
      <CameraControls ref={controlsRef} />

      {/* VISIBLE GRADIENT BACKGROUND */}
      {/* <mesh position={[0, 0, -10]} scale={[50, 30, 1]}>
        <planeGeometry />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.4}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh> */}

      {/* GLOW SPHERE */}
      <mesh position={[0, 0, -8]} scale={12}>
        <sphereGeometry />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={0.7}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* LIGHTS */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[5, 10, 7]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* <Sky sunPosition={[100, 20, 100]} /> */}

      <Selected />
    </>
  );
};