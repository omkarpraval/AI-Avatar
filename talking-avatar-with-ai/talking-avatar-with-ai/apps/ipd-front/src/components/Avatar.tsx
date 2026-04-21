// src/components/Avatar.tsx
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSpeech } from "../hooks/useSpeech";
import facialExpressions from "../constants/facialExpressions";
import visemesMapping from "../constants/visemesMapping";
import morphTargets from "../constants/morphTargets";

/* ------------------------------------------------------------------ */
const FallbackAvatar = () => (
  <mesh position={[0, 0, 0]}>
    <boxGeometry args={[1, 2, 0.5]} />
    <meshStandardMaterial color="#6366f1" />
  </mesh>
);

/* ------------------------------------------------------------------ */
export const Avatar = (props: any) => {
  /* ---- Load model (with fallback) ---- */
  let gltf;
  try {
    gltf = useGLTF("/models/model.glb");
  } catch (e) {
    console.warn("model.glb failed → fallback box", e);
    return <FallbackAvatar />;
  }
  const { nodes, materials, scene } = gltf;

  /* ---- Load animations (PRELOADED GLOBALLY) ---- */
  const { animations } = useGLTF("/models/animations.glb");

  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  const { message, onMessagePlayed } = useSpeech();

  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === "Idle")?.name ?? "Idle"
  );
  const [facialExpression, setFacialExpression] = useState("");
  const [lipsync, setLipsync] = useState<any>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [blink, setBlink] = useState(false);
  const lastHandledMessageKeyRef = useRef<string | null>(null);

  /* ------------------- Play incoming message ------------------- */
  useEffect(() => {
    if (!message) {
      setAnimation("Idle");
      lastHandledMessageKeyRef.current = null;
      return;
    }
    const messageKey =
      message.id ||
      `${String(message.text || "").slice(0, 64)}|${String(message.audio || "").slice(0, 64)}`;
    if (lastHandledMessageKeyRef.current === messageKey) return;
    lastHandledMessageKeyRef.current = messageKey;

    setAnimation(message.animation ?? "Idle");
    setFacialExpression(message.facialExpression ?? "");
    setLipsync(message.lipsync ?? null);
    if (message.audio) {
      const a = new Audio(`data:audio/mp3;base64,${message.audio}`);
      a.play().catch(() => {
        onMessagePlayed();
      });
      setAudio(a);
      a.onended = onMessagePlayed;
    } else {
      setAudio(null);
      const timeout = setTimeout(onMessagePlayed, 1200);
      return () => clearTimeout(timeout);
    }
  }, [message, onMessagePlayed]);

  /* ------------------- Animation playback ------------------- */
  useEffect(() => {
    const act = actions[animation];
    if (act) {
      act.reset().fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5).play();
      return () => act.fadeOut(0.5);
    }
  }, [animation, actions, mixer]);

  /* ------------------- Morph-target lerp helper ------------------- */
  const lerpMorphTarget = (target: string, value: number, speed = 0.1) => {
    scene.traverse((child) => {
      if (
        child.isSkinnedMesh &&
        child.morphTargetDictionary &&
        child.morphTargetDictionary[target] !== undefined
      ) {
        const idx = child.morphTargetDictionary[target];
        child.morphTargetInfluences![idx] = THREE.MathUtils.lerp(
          child.morphTargetInfluences![idx],
          value,
          speed
        );
      }
    });
  };

  /* ------------------- Blink loop ------------------- */
  useEffect(() => {
    const next = () => {
      const delay = THREE.MathUtils.randInt(1000, 5000);
      const timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          next();
        }, 150);
      }, delay);
      return () => clearTimeout(timeout);
    };
    return next();
  }, []);

  /* ------------------- Frame loop ------------------- */
  useFrame(() => {
    /* facial expressions */
    morphTargets.forEach((key) => {
      if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
      const map = facialExpressions[facialExpression];
      lerpMorphTarget(key, map?.[key] ?? 0, 0.1);
    });

    /* blink */
    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);

    /* lip-sync */
    if (message && lipsync && audio && audio.currentTime !== undefined) {
      const t = audio.currentTime;
      let applied = false;
      for (const cue of lipsync.mouthCues) {
        if (t >= cue.start && t <= cue.end) {
          lerpMorphTarget(visemesMapping[cue.value], 1, 0.2);
          applied = true;
          break;
        }
      }
      if (!applied) {
        Object.values(visemesMapping).forEach((v) =>
          lerpMorphTarget(v, 0, 0.1)
        );
      }
    }
  });

  /* ------------------------------------------------------------------ */
  return (
    <group {...props} ref={group} dispose={null} position={[0, -0.5, 0]}>
      <primitive object={nodes.Hips} />
      {[
        "avaturn_body",
        "avaturn_hair_0",
        "avaturn_hair_1",
        "avaturn_shoes_0",
        "avaturn_look_0",
      ].map((name) => {
        const mesh = nodes[name];
        return mesh ? (
          <skinnedMesh
            key={name}
            name={name}
            geometry={mesh.geometry}
            material={materials[`${name}_material`]}
            skeleton={mesh.skeleton}
            morphTargetDictionary={mesh.morphTargetDictionary}
            morphTargetInfluences={mesh.morphTargetInfluences}
          />
        ) : null;
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ */
useGLTF.preload("/models/model.glb");
useGLTF.preload("/models/animations.glb");