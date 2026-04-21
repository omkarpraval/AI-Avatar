// src/components/Avatar3.jsx
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function Avatar3(props) {
  const { nodes, materials, animations, scene } = useGLTF("/models/model (1).glb");
  const group = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(animations, group);

  const [animationName] = useState("Standard_Smoking"); // the only animation you have

  /* ------------------- Play the animation ------------------- */
  useEffect(() => {
    const action = actions[animationName];
    if (!action) {
      console.warn(`Animation "${animationName}" not found!`);
      return;
    }
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => action.stop();
  }, [actions, animationName]);

  /* ------------------- No extra frame logic needed ------------------- */
  // (you can add blinking / facial expressions later if you want)

  return (
    <group {...props} ref={group} dispose={null} position={[0, -0.5, 0]}>
      {/* ROOT BONE */}
      <primitive object={nodes.Hips} />

      {/* ALL meshes (skinned or static) */}
      {Object.entries(nodes)
        .filter(([, node]) => node.isMesh || node.isSkinnedMesh)
        .map(([key, node]: [string, any]) => {
          if (!node.geometry) return null;
          if (node.isSkinnedMesh) {
            return (
              <skinnedMesh
                key={key}
                geometry={node.geometry}
                material={node.material}
                skeleton={node.skeleton}
                morphTargetDictionary={node.morphTargetDictionary}
                morphTargetInfluences={node.morphTargetInfluences}
              />
            );
          }
          return (
            <mesh key={key} geometry={node.geometry} material={node.material} />
          );
        })}
    </group>
  );
}

useGLTF.preload("/models/model (1).glb");