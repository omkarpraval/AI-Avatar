// src/lib/preload.ts
import { useGLTF } from "@react-three/drei";

// Preload ALL models and animations ONCE at startup
useGLTF.preload("/models/model.glb");
useGLTF.preload("/models/avatar.glb");
useGLTF.preload("/models/model (1).glb");
useGLTF.preload("/models/animations.glb");