// src/components/Avatar2.jsx
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSpeech } from "../hooks/useSpeech";
import facialExpressions from "../constants/facialExpressions";
import visemesMapping from "../constants/visemesMapping";
import morphTargets from "../constants/morphTargets";

export function Avatar2(props) {
  const { nodes, materials, scene } = useGLTF("/models/avatar.glb");

  // ANIMATIONS ARE PRELOADED GLOBALLY — NO RELOAD ON NAV
  const { animations } = useGLTF("/models/animations.glb");

  const { message, onMessagePlayed, muted } = useSpeech();
  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);

  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === "Idle")?.name ?? animations[0]?.name ?? "Idle"
  );
  const [facialExpression, setFacialExpression] = useState("");
  const [lipsync, setLipsync] = useState<any>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [blink, setBlink] = useState(false);
  const lastHandledMessageKeyRef = useRef<string | null>(null);

  /* ------------------- Message handling ------------------- */
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
    if (message.audio && !message.muted) {
      const a = new Audio(`data:audio/mp3;base64,${message.audio}`);
      a.muted = muted;
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

  useEffect(() => {
    if (audio) {
      audio.muted = muted;
      if (!muted && audio.paused) {
        audio.play().catch(() => {});
      }
    }
  }, [audio, muted]);

  /* ------------------- Play animation ------------------- */
  useEffect(() => {
    const act = actions[animation];
    if (act) {
      act.reset().fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5).play();
      return () => act.fadeOut(0.5);
    }
  }, [animation, actions, mixer]);

  /* ------------------- Morph lerp helper ------------------- */
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

  /* ------------------- Blink ------------------- */
  useEffect(() => {
    const next = () => {
      const delay = THREE.MathUtils.randInt(1000, 5000);
      const t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          next();
        }, 150);
      }, delay);
      return () => clearTimeout(t);
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

  return (
    <group {...props} ref={group} dispose={null} position={[0, -0.5, 0]}>
      <primitive object={nodes.Hips} />
      {[
        "EyeLeft",
        "EyeRight",
        "Wolf3D_Head",
        "Wolf3D_Teeth",
        "Wolf3D_Glasses",
        "Wolf3D_Headwear",
        "Wolf3D_Body",
        "Wolf3D_Outfit_Bottom",
        "Wolf3D_Outfit_Footwear",
        "Wolf3D_Outfit_Top",
      ].map((name) => {
        const node = nodes[name];
        if (!node) return null;
        return node.isSkinnedMesh ? (
          <skinnedMesh
            key={name}
            geometry={node.geometry}
            material={materials[node.material?.name || ""]}
            skeleton={node.skeleton}
            morphTargetDictionary={node.morphTargetDictionary}
            morphTargetInfluences={node.morphTargetInfluences}
          />
        ) : (
          <mesh
            key={name}
            geometry={node.geometry}
            material={materials[node.material?.name || ""]}
          />
        );
      })}
    </group>
  );
}

useGLTF.preload("/models/avatar.glb");
useGLTF.preload("/models/animations.glb");