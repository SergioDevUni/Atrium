"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types";

// Original Atrium model loads three.js from CDN at runtime, so it keeps loose window types.
declare global {
  interface Window { THREE?: any; }
  namespace THREE {
    type Mesh = any; type Vector3 = any; type Vector2 = any;
    type Material = any; type Object3D = any; type Box3 = any;
    type MeshStandardMaterial = any; type MeshPhysicalMaterial = any;
    type MeshBasicMaterial = any;
  }
}

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js";

type Mode = "skin" | "wire" | "xray" | "bones";

export interface HumanBody3DProps {
  onPickRegion?: (regionId: string) => void;
  onPickSubregion?: (pick: { regionId: string; subregionId: string }) => void;
  highlightRegion?: string | null;
  focusRegion?: string | null;
  selectedSubregion?: string | null;
  subregionLabels?: Record<string, string>;
  language?: Language;
  className?: string;
}

// region ids align with organToSpecialist regex in clinic/page.tsx
const REGION_INTENT: Record<string, string> = {
  head: "brain",
  brain: "brain",
  torso_chest: "heart",
  heart: "heart",
  lungs: "lung",
  torso_abdomen: "stomach",
  stomach: "stomach",
  liver: "liver",
  kidneys: "stomach",
  pelvis: "skeleton",
  arm_left: "muscle",
  arm_right: "muscle",
  leg_left: "skeleton",
  leg_right: "skeleton",
  hand_left: "skeleton",
  hand_right: "skeleton",
  foot_left: "skeleton",
  foot_right: "skeleton",
};

let threeLoading: Promise<void> | null = null;
function ensureThreeLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.THREE) return Promise.resolve();
  if (threeLoading) return threeLoading;
  threeLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-threejs]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("three load failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = THREE_CDN;
    s.async = true;
    s.dataset.threejs = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("three load failed"));
    document.head.appendChild(s);
  });
  return threeLoading;
}

export default function HumanBody3D({
  onPickRegion,
  onPickSubregion,
  highlightRegion,
  focusRegion,
  selectedSubregion,
  subregionLabels = {},
  language = "en",
  className,
}: HumanBody3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{
    setMode: (m: Mode) => void;
    setHighlight: (region: string | null) => void;
    setFocus: (region: string | null) => void;
    setSelectedSubregion: (subregion: string | null) => void;
    dispose: () => void;
  } | null>(null);
  const [mode, setMode] = useState<Mode>("skin");
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [hoverSubregion, setHoverSubregion] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const onPickRegionRef = useRef(onPickRegion);
  const onPickSubregionRef = useRef(onPickSubregion);
  const selectedSubregionRef = useRef(selectedSubregion);
  const hoverRef = useRef<string | null>(null);

  // build the scene once
  useEffect(() => {
    let disposed = false;
    let raf = 0;

    ensureThreeLoaded().then(() => {
      if (disposed) return;
      const THREE = window.THREE;
      const container = containerRef.current;
      if (!THREE || !container) return;

      const w = () => container.clientWidth || 1;
      const h = () => container.clientHeight || 1;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w(), h());
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#08090c");
      scene.fog = new THREE.Fog("#08090c", 6, 18);

      const camera = new THREE.PerspectiveCamera(35, w() / h(), 0.1, 100);
      camera.position.set(0, 1.2, 4.6);

      // ─── orbit controls (inline minimal)
      const target = new THREE.Vector3(0, 1.0, 0);
      const sph = new THREE.Spherical();
      const offset = new THREE.Vector3();
      offset.copy(camera.position).sub(target);
      sph.setFromVector3(offset);
      let radius = sph.radius, theta = sph.theta, phi = sph.phi;
      let vTheta = 0, vPhi = 0, vRad = 0;
      const damp = 0.08;

      let dragging = false, lx = 0, ly = 0, dragMoved = false;
      const dom = renderer.domElement;
      dom.style.touchAction = "none";

      const onDown = (e: MouseEvent | TouchEvent) => {
        dragging = true; dragMoved = false;
        const p = "touches" in e ? e.touches[0] : (e as MouseEvent);
        lx = p.clientX; ly = p.clientY;
      };
      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!dragging) return;
        const p = "touches" in e ? e.touches[0] : (e as MouseEvent);
        const dx = p.clientX - lx, dy = p.clientY - ly;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        lx = p.clientX; ly = p.clientY;
        vTheta -= dx * 0.005;
        vPhi -= dy * 0.005;
        if ("preventDefault" in e) (e as Event).preventDefault();
      };
      const onUp = () => { dragging = false; };
      const onWheel = (e: WheelEvent) => { vRad += e.deltaY * 0.0015; e.preventDefault(); };

      dom.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      dom.addEventListener("touchstart", onDown, { passive: false });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
      dom.addEventListener("wheel", onWheel, { passive: false });

      // ─── lights
      scene.add(new THREE.HemisphereLight("#3a4a66", "#0a0e14", 0.45));
      const key = new THREE.DirectionalLight("#ffe9d0", 1.6);
      key.position.set(2.6, 4.2, 3.0);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
      key.shadow.camera.left = -3; key.shadow.camera.right = 3;
      key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
      key.shadow.bias = -0.0005; key.shadow.radius = 4;
      scene.add(key);

      const fill = new THREE.DirectionalLight("#7ad9ff", 0.55);
      fill.position.set(-3.5, 2.0, 1.5);
      scene.add(fill);

      const rim = new THREE.DirectionalLight("#ff8a4c", 0.9);
      rim.position.set(-1.0, 3.0, -3.5);
      scene.add(rim);

      // ─── floor
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(6, 64),
        new THREE.MeshStandardMaterial({ color: "#0d1117", roughness: 0.85, metalness: 0.05 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.22, 96),
        new THREE.MeshBasicMaterial({ color: "#7ad9ff", transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.001;
      scene.add(ring);

      // ─── materials
      const skinMat = new THREE.MeshStandardMaterial({
        color: "#d9a288", roughness: 0.55, metalness: 0.0,
        emissive: "#1a0a08", emissiveIntensity: 0.25,
      });
      const skinDeep = new THREE.MeshStandardMaterial({ color: "#b88572", roughness: 0.6, metalness: 0.0 });
      const hairMat = new THREE.MeshStandardMaterial({ color: "#1c1611", roughness: 0.7, metalness: 0.05 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: "#0a0a0a", roughness: 0.15, metalness: 0.0 });
      const lipMat = new THREE.MeshStandardMaterial({ color: "#a04a3c", roughness: 0.5 });

      const wireMat = new THREE.MeshBasicMaterial({ color: "#7ad9ff", wireframe: true, transparent: true, opacity: 0.6 });
      const xrayMat = new THREE.MeshPhysicalMaterial({
        color: "#7ad9ff", roughness: 0.2, metalness: 0.0,
        transmission: 0.85, thickness: 0.6, ior: 1.2,
        transparent: true, opacity: 0.35,
        emissive: "#1a3a52", emissiveIntensity: 0.4,
        side: THREE.DoubleSide,
      });
      const boneMat = new THREE.MeshStandardMaterial({
        color: "#e8e0cf", roughness: 0.6, metalness: 0.05,
        emissive: "#181410", emissiveIntensity: 0.3,
      });

      const figure = new THREE.Group();
      scene.add(figure);

      // helpers — every mesh stamps userData.region for raycast
      const tagRegion = <T extends { userData: Record<string, unknown> }>(m: T, region: string): T => {
        m.userData.region = region; return m;
      };
      const cap = (r: number, hh: number, mat: THREE.Material, region: string) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, hh, 8, 16), mat);
        m.castShadow = true; m.receiveShadow = true;
        return tagRegion(m, region);
      };
      const sph2 = (r: number, mat: THREE.Material, region: string) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat);
        m.castShadow = true; m.receiveShadow = true;
        return tagRegion(m, region);
      };
      const boxM = (sw: number, sh: number, sd: number, mat: THREE.Material, region: string) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat);
        m.castShadow = true; m.receiveShadow = true;
        return tagRegion(m, region);
      };

      // ── HEAD
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.66;
      figure.add(headGroup);

      const skull = sph2(0.105, skinMat, "head");
      skull.scale.set(0.95, 1.08, 1.0); skull.position.y = 0.04; headGroup.add(skull);
      const jaw = sph2(0.08, skinMat, "head");
      jaw.scale.set(0.9, 0.7, 0.95); jaw.position.set(0, -0.04, 0.012); headGroup.add(jaw);
      const hair = sph2(0.112, hairMat, "head");
      hair.scale.set(0.96, 0.8, 1.02); hair.position.set(0, 0.075, -0.012); headGroup.add(hair);

      const eyeL = sph2(0.014, eyeMat, "head");
      eyeL.position.set(-0.034, 0.04, 0.094); headGroup.add(eyeL);
      const eyeR = eyeL.clone(); eyeR.position.x = 0.034; tagRegion(eyeR, "head"); headGroup.add(eyeR);

      const browGeo = new THREE.BoxGeometry(0.028, 0.005, 0.008);
      const browL = new THREE.Mesh(browGeo, hairMat); browL.position.set(-0.034, 0.062, 0.098); tagRegion(browL, "head"); headGroup.add(browL);
      const browR = browL.clone(); browR.position.x = 0.034; tagRegion(browR, "head"); headGroup.add(browR);

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 12), skinMat);
      nose.rotation.x = Math.PI; nose.position.set(0, 0.012, 0.105); nose.castShadow = true;
      tagRegion(nose, "head"); headGroup.add(nose);

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.006, 0.005), lipMat);
      mouth.position.set(0, -0.038, 0.098); tagRegion(mouth, "head"); headGroup.add(mouth);

      const earL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), skinMat);
      earL.scale.set(0.5, 1.1, 0.7); earL.position.set(-0.108, 0.018, 0.005); earL.castShadow = true;
      tagRegion(earL, "head"); headGroup.add(earL);
      const earR = earL.clone(); earR.position.x = 0.108; tagRegion(earR, "head"); headGroup.add(earR);

      // ── NECK
      const neck = cap(0.055, 0.08, skinMat, "head");
      neck.position.y = 1.55;
      figure.add(neck);

      // ── TORSO (lathe)
      const torsoGroup = new THREE.Group();
      torsoGroup.position.y = 1.20;
      figure.add(torsoGroup);

      const torsoProfile = [
        new THREE.Vector2(0.005, -0.36),
        new THREE.Vector2(0.18, -0.34),
        new THREE.Vector2(0.20, -0.28),
        new THREE.Vector2(0.18, -0.20),
        new THREE.Vector2(0.165, -0.10),
        new THREE.Vector2(0.185, 0.00),
        new THREE.Vector2(0.20, 0.10),
        new THREE.Vector2(0.205, 0.22),
        new THREE.Vector2(0.20, 0.28),
        new THREE.Vector2(0.16, 0.32),
        new THREE.Vector2(0.005, 0.34),
      ];
      const torsoGeo = new THREE.LatheGeometry(torsoProfile, 48);
      torsoGeo.computeVertexNormals();
      const torso = new THREE.Mesh(torsoGeo, skinMat);
      torso.scale.set(1.0, 1.0, 0.7);
      torso.castShadow = true; torso.receiveShadow = true;
      tagRegion(torso, "torso_chest");
      torsoGroup.add(torso);

      // Invisible click zones make small distal areas like hands and feet selectable.
      const clickProxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const tagClickProxy = <T extends { userData: Record<string, unknown> }>(m: T, region: string): T => {
        tagRegion(m, region);
        m.userData.clickProxy = true;
        return m;
      };
      const clickBox = (sw: number, sh: number, sd: number, region: string) =>
        tagClickProxy(new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), clickProxyMat), region);
      const isClickProxy = (m: THREE.Mesh) => m.userData.clickProxy === true;

      const chestProxy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), clickProxyMat);
      chestProxy.scale.set(1, 1, 0.7); chestProxy.position.set(0, 0.18, 0.05);
      tagClickProxy(chestProxy, "torso_chest"); torsoGroup.add(chestProxy);
      const abdoProxy = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 12), clickProxyMat);
      abdoProxy.scale.set(1, 1, 0.7); abdoProxy.position.set(0, -0.05, 0.05);
      tagClickProxy(abdoProxy, "torso_abdomen"); torsoGroup.add(abdoProxy);
      const pelvisProxy = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), clickProxyMat);
      pelvisProxy.scale.set(1, 1, 0.7); pelvisProxy.position.set(0, -0.27, 0.05);
      tagClickProxy(pelvisProxy, "pelvis"); torsoGroup.add(pelvisProxy);

      // ── ARMS
      function buildArm(side: "L" | "R") {
        const s = side === "L" ? -1 : 1;
        const arm = new THREE.Group();
        arm.position.set(s * 0.255, 1.42, 0);
        figure.add(arm);
        const armReg = side === "L" ? "arm_left" : "arm_right";
        const handReg = side === "L" ? "hand_left" : "hand_right";

        arm.add(sph2(0.075, skinMat, armReg));
        const upper = cap(0.055, 0.22, skinMat, armReg); upper.position.y = -0.16; arm.add(upper);
        const elbow = sph2(0.05, skinMat, armReg); elbow.position.y = -0.30; arm.add(elbow);
        const fore = cap(0.045, 0.20, skinMat, armReg); fore.position.y = -0.43; arm.add(fore);
        const wrist = sph2(0.04, skinMat, handReg); wrist.position.y = -0.56; arm.add(wrist);
        const palm = boxM(0.08, 0.10, 0.035, skinMat, handReg); palm.position.y = -0.62; arm.add(palm);
        for (let i = 0; i < 4; i++) {
          const f = cap(0.008, 0.055, skinMat, handReg);
          f.position.set(-0.024 + i * 0.016, -0.71, 0); arm.add(f);
        }
        const thumb = cap(0.01, 0.04, skinMat, handReg);
        thumb.rotation.z = s * Math.PI / 3;
        thumb.position.set(s * 0.04, -0.65, 0.01);
        arm.add(thumb);
        const armProxy = clickBox(0.16, 0.58, 0.18, armReg);
        armProxy.position.y = -0.29; arm.add(armProxy);
        const handProxy = clickBox(0.16, 0.24, 0.16, handReg);
        handProxy.position.y = -0.65; arm.add(handProxy);
        arm.rotation.z = s * 0.08;
        return arm;
      }
      const leftArmGroup = buildArm("L");
      const rightArmGroup = buildArm("R");

      // ── LEGS
      function buildLeg(side: "L" | "R") {
        const s = side === "L" ? -1 : 1;
        const leg = new THREE.Group();
        leg.position.set(s * 0.10, 0.92, 0);
        figure.add(leg);
        const legReg = side === "L" ? "leg_left" : "leg_right";
        const footReg = side === "L" ? "foot_left" : "foot_right";

        leg.add(sph2(0.085, skinMat, legReg));
        const thigh = cap(0.085, 0.32, skinMat, legReg); thigh.position.y = -0.22; leg.add(thigh);
        const knee = sph2(0.07, skinMat, legReg); knee.position.y = -0.42; leg.add(knee);
        const shin = cap(0.065, 0.30, skinMat, legReg); shin.position.y = -0.62; leg.add(shin);
        const ankle = sph2(0.05, skinMat, footReg); ankle.position.y = -0.82; leg.add(ankle);
        const foot = boxM(0.10, 0.05, 0.22, skinDeep, footReg); foot.position.set(0, -0.87, 0.05); leg.add(foot);
        const legProxy = clickBox(0.20, 0.82, 0.20, legReg);
        legProxy.position.y = -0.38; leg.add(legProxy);
        const footProxy = clickBox(0.18, 0.14, 0.30, footReg);
        footProxy.position.set(0, -0.86, 0.05); leg.add(footProxy);
        return leg;
      }
      const leftLegGroup = buildLeg("L");
      const rightLegGroup = buildLeg("R");

      // ── SKELETON (toggle)
      const skeleton = new THREE.Group();
      skeleton.visible = false;
      figure.add(skeleton);

      const sk = sph2(0.10, boneMat, "skeleton");
      sk.position.set(0, 1.66, 0); sk.scale.set(0.9, 1.05, 1.0); skeleton.add(sk);
      for (let i = 0; i < 18; i++) {
        const v = sph2(0.026, boneMat, "skeleton");
        v.position.set(0, 1.55 - i * 0.045, -0.02); skeleton.add(v);
      }
      for (let i = 0; i < 8; i++) {
        const r = 0.20 + Math.sin(i / 8 * Math.PI) * 0.04;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 16, Math.PI * 0.85), boneMat);
        rib.rotation.set(Math.PI / 2, 0, -0.1);
        rib.position.set(0, 1.45 - i * 0.045, 0); rib.castShadow = true;
        tagRegion(rib, "skeleton"); skeleton.add(rib);
      }
      const pelvisRing = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.025, 8, 24), boneMat);
      pelvisRing.rotation.x = Math.PI / 2; pelvisRing.position.y = 0.92;
      pelvisRing.scale.set(1.0, 1.0, 0.7);
      tagRegion(pelvisRing, "skeleton"); skeleton.add(pelvisRing);
      const clavL = cap(0.018, 0.18, boneMat, "skeleton"); clavL.rotation.z = Math.PI / 2; clavL.position.set(-0.13, 1.45, 0.06); skeleton.add(clavL);
      const clavR = clavL.clone(); clavR.position.x = 0.13; skeleton.add(clavR);
      [
        [0.025, 0.22, -0.255, 1.26, 0], [0.022, 0.22, 0.255, 1.26, 0],
        [0.022, 0.22, -0.255, 0.99, 0], [0.020, 0.22, 0.255, 0.99, 0],
        [0.038, 0.32, -0.10, 0.70, 0], [0.038, 0.32, 0.10, 0.70, 0],
        [0.030, 0.30, -0.10, 0.30, 0], [0.030, 0.30, 0.10, 0.30, 0],
      ].forEach(([r, hh, x, y, z]) => {
        const b = cap(r, hh, boneMat, "skeleton"); b.position.set(x, y, z); skeleton.add(b);
      });

      // ── INTERNAL ORGANS (visible in xray/bones modes, always clickable)
      const organs = new THREE.Group();
      figure.add(organs);

      const heartMat = new THREE.MeshStandardMaterial({
        color: "#c1372b", roughness: 0.45, metalness: 0.1,
        emissive: "#3a0a06", emissiveIntensity: 0.6,
      });
      const lungMat = new THREE.MeshStandardMaterial({
        color: "#d68a86", roughness: 0.7, metalness: 0.0,
        emissive: "#2a1010", emissiveIntensity: 0.3,
      });
      const brainMat = new THREE.MeshStandardMaterial({
        color: "#e6b9c0", roughness: 0.55, metalness: 0.0,
        emissive: "#3a1a22", emissiveIntensity: 0.4,
      });
      const liverMat = new THREE.MeshStandardMaterial({
        color: "#7a2c1c", roughness: 0.55, metalness: 0.05,
        emissive: "#1a0604", emissiveIntensity: 0.4,
      });
      const stomachMat = new THREE.MeshStandardMaterial({
        color: "#c47a4a", roughness: 0.6, metalness: 0.0,
        emissive: "#2a1208", emissiveIntensity: 0.3,
      });
      const kidneyMat = new THREE.MeshStandardMaterial({
        color: "#8a3528", roughness: 0.5, metalness: 0.05,
        emissive: "#1a0604", emissiveIntensity: 0.35,
      });

      // brain — inside skull
      const brain = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), brainMat);
      brain.scale.set(1.0, 0.85, 0.95);
      brain.position.set(0, 1.69, -0.005);
      brain.castShadow = true;
      tagRegion(brain, "brain"); organs.add(brain);

      // heart — left chest, slightly off-center
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), heartMat);
      heart.scale.set(1.1, 1.2, 0.85);
      heart.position.set(-0.04, 1.36, 0.04);
      heart.rotation.z = -0.3;
      heart.castShadow = true;
      tagRegion(heart, "heart"); organs.add(heart);

      // lungs — two lobes flanking the heart
      const lungL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), lungMat);
      lungL.scale.set(0.8, 1.4, 0.6);
      lungL.position.set(-0.10, 1.38, 0.02);
      lungL.castShadow = true;
      tagRegion(lungL, "lungs"); organs.add(lungL);
      const lungR = lungL.clone(); lungR.position.x = 0.10; tagRegion(lungR, "lungs"); organs.add(lungR);

      // liver — upper-right abdomen
      const liver = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), liverMat);
      liver.scale.set(1.3, 0.7, 0.7);
      liver.position.set(0.06, 1.18, 0.04);
      liver.castShadow = true;
      tagRegion(liver, "liver"); organs.add(liver);

      // stomach — upper-left abdomen
      const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), stomachMat);
      stomach.scale.set(1.1, 1.0, 0.7);
      stomach.position.set(-0.06, 1.16, 0.05);
      stomach.castShadow = true;
      tagRegion(stomach, "stomach"); organs.add(stomach);

      // kidneys — lower back, paired
      const kidneyL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), kidneyMat);
      kidneyL.scale.set(0.9, 1.4, 0.7);
      kidneyL.position.set(-0.07, 1.04, -0.05);
      kidneyL.castShadow = true;
      tagRegion(kidneyL, "kidneys"); organs.add(kidneyL);
      const kidneyR = kidneyL.clone(); kidneyR.position.x = 0.07; tagRegion(kidneyR, "kidneys"); organs.add(kidneyR);

      organs.visible = false; // hidden by default (skin mode)

      // collect body meshes for mode swap (excluding skeleton, organs, floor, ring)
      const bodyMeshes: THREE.Mesh[] = [];
      figure.traverse((o: any) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          let inSkel = false, inOrg = false;
          let p: THREE.Object3D | null = m.parent;
          while (p) {
            if (p === skeleton) inSkel = true;
            if (p === organs) inOrg = true;
            p = p.parent;
          }
          if (!inSkel && !inOrg) bodyMeshes.push(m);
        }
      });
      const organMeshes: THREE.Mesh[] = [];
      organs.traverse((o: any) => { if ((o as THREE.Mesh).isMesh) organMeshes.push(o as THREE.Mesh); });
      // clone shared materials so we can dim individual meshes (opacity per mesh)
      bodyMeshes.forEach((m) => {
        const orig = m.material as THREE.Material;
        if (isClickProxy(m)) return; // keep proxies sharing the invisible material
        m.material = orig.clone();
      });
      organMeshes.forEach((m) => {
        m.material = (m.material as THREE.Material).clone();
      });

      const originalMats = new Map<THREE.Mesh, THREE.Material>();
      bodyMeshes.forEach((m) => originalMats.set(m, m.material as THREE.Material));

      // visible (non-proxy) skin meshes for highlight effects
      const clickProxyMeshes: THREE.Mesh[] = bodyMeshes.filter(isClickProxy);
      const visibleBodyMeshes: THREE.Mesh[] = bodyMeshes.filter((m) => !isClickProxy(m));
      const skinMeshes: THREE.Mesh[] = visibleBodyMeshes;
      const allHighlightable: THREE.Mesh[] = [...skinMeshes, ...organMeshes];
      const subregionProxyMeshes: THREE.Mesh[] = [];
      const SUBREGION_REGION_BY_FOCUS: Record<string, string> = {
        head: "head",
        torso_chest: "torso_chest",
        torso_abdomen: "torso_abdomen",
        kidneys: "kidneys",
        arm_left: "arm_left",
        arm_right: "arm_right",
        hand_left: "hand_left",
        hand_right: "hand_right",
        leg_left: "leg_left",
        leg_right: "leg_right",
        foot_left: "foot_left",
        foot_right: "foot_right",
      };

      type SubregionSurfaceOptions = {
        depthTest?: boolean;
        fillOpacity?: number;
        hoverOpacity?: number;
        selectedOpacity?: number;
        rimOpacity?: number;
        rimHoverOpacity?: number;
        rimScale?: number;
        rimSelectedOpacity?: number;
      };

      const subregionMaterial = (options: SubregionSurfaceOptions = {}) =>
        new THREE.MeshBasicMaterial({
          color: "#8deaff",
          transparent: true,
          opacity: options.fillOpacity ?? 0.36,
          depthTest: options.depthTest ?? false,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
          side: THREE.DoubleSide,
        });
      const subregionRimMaterial = (options: SubregionSurfaceOptions = {}) =>
        new THREE.MeshBasicMaterial({
          color: "#04151a",
          transparent: true,
          opacity: options.rimOpacity ?? 0.58,
          depthTest: options.depthTest ?? false,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      const roundedRectGeometry = (width: number, height: number, radius = Math.min(width, height) * 0.22) => {
        const shape = new THREE.Shape();
        const x = -width / 2;
        const y = -height / 2;
        const r = Math.min(radius, width / 2, height / 2);
        shape.moveTo(x + r, y);
        shape.lineTo(x + width - r, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + r);
        shape.lineTo(x + width, y + height - r);
        shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        shape.lineTo(x + r, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        return new THREE.ShapeGeometry(shape);
      };
      const registerSubregionSurface = (
        mesh: THREE.Mesh,
        parent: THREE.Object3D,
        region: string,
        subregion: string,
        position: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
        scale: [number, number, number] = [1, 1, 1],
        options: SubregionSurfaceOptions = {},
      ) => {
        const rimScale = options.rimScale ?? 1.12;
        const rim = new THREE.Mesh(mesh.geometry, subregionRimMaterial(options));
        rim.position.set(...position);
        rim.rotation.set(...rotation);
        rim.scale.set(scale[0] * rimScale, scale[1] * rimScale, scale[2] * rimScale);
        rim.renderOrder = 7;
        rim.visible = false;
        rim.userData.region = region;
        rim.userData.subregion = subregion;
        rim.raycast = () => undefined;
        parent.add(rim);

        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.scale.set(...scale);
        mesh.renderOrder = 9;
        mesh.visible = false;
        mesh.userData.region = region;
        mesh.userData.subregion = subregion;
        mesh.userData.subregionProxy = true;
        mesh.userData.rim = rim;
        mesh.userData.baseOpacity = options.fillOpacity ?? 0.36;
        mesh.userData.hoverOpacity = options.hoverOpacity ?? 0.56;
        mesh.userData.selectedOpacity = options.selectedOpacity ?? 0.72;
        mesh.userData.rimBaseOpacity = options.rimOpacity ?? 0.58;
        mesh.userData.rimHoverOpacity = options.rimHoverOpacity ?? 0.68;
        mesh.userData.rimSelectedOpacity = options.rimSelectedOpacity ?? 0.8;
        subregionProxyMeshes.push(mesh);
        parent.add(mesh);
        return mesh;
      };
      const addSurfacePatch = (
        parent: THREE.Object3D,
        region: string,
        subregion: string,
        size: [number, number],
        position: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
        options: SubregionSurfaceOptions = {},
      ) =>
        registerSubregionSurface(
          new THREE.Mesh(roundedRectGeometry(size[0], size[1]), subregionMaterial(options)),
          parent,
          region,
          subregion,
          position,
          rotation,
          [1, 1, 1],
          options,
        );
      const addEllipsePatch = (
        parent: THREE.Object3D,
        region: string,
        subregion: string,
        radius: number,
        scale: [number, number, number],
        position: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
        options: SubregionSurfaceOptions = {},
      ) =>
        registerSubregionSurface(
          new THREE.Mesh(new THREE.CircleGeometry(radius, 32), subregionMaterial(options)),
          parent,
          region,
          subregion,
          position,
          rotation,
          scale,
          options,
        );
      const addCapsulePatch = (
        parent: THREE.Object3D,
        region: string,
        subregion: string,
        radius: number,
        height: number,
        position: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
        scale: [number, number, number] = [1, 1, 1],
        options: SubregionSurfaceOptions = {},
      ) =>
        registerSubregionSurface(
          new THREE.Mesh(new THREE.CapsuleGeometry(radius, height, 8, 18), subregionMaterial(options)),
          parent,
          region,
          subregion,
          position,
          rotation,
          scale,
          options,
        );

      const addMirrorPair = (
        parent: THREE.Object3D,
        region: string,
        subregion: string,
        radius: number,
        scale: [number, number, number],
        leftPosition: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
        options: SubregionSurfaceOptions = {},
      ) => {
        addEllipsePatch(parent, region, subregion, radius, scale, leftPosition, rotation, options);
        addEllipsePatch(parent, region, subregion, radius, scale, [-leftPosition[0], leftPosition[1], leftPosition[2]], rotation, options);
      };

      const headSurfaceOptions: SubregionSurfaceOptions = {
        depthTest: true,
        fillOpacity: 0.34,
        hoverOpacity: 0.5,
        selectedOpacity: 0.68,
        rimOpacity: 0.3,
        rimHoverOpacity: 0.48,
        rimScale: 1.06,
        rimSelectedOpacity: 0.66,
      };
      addEllipsePatch(headGroup, "head", "forehead", 0.032, [1.8, 0.52, 1], [0, 0.087, 0.126], [0, 0, 0], headSurfaceOptions);
      addEllipsePatch(headGroup, "head", "top_head", 0.038, [1.4, 0.72, 1], [0, 0.145, 0.012], [Math.PI / 2, 0, 0], headSurfaceOptions);
      addEllipsePatch(headGroup, "head", "back_head", 0.042, [1.25, 0.9, 1], [0, 0.04, -0.126], [0, Math.PI, 0], headSurfaceOptions);
      addMirrorPair(headGroup, "head", "face", 0.029, [0.78, 1.2, 1], [-0.047, -0.006, 0.133], [0, 0, 0], headSurfaceOptions);
      addEllipsePatch(headGroup, "head", "eye_area", 0.022, [2.35, 0.42, 1], [0, 0.049, 0.145], [0, 0, 0], headSurfaceOptions);
      addMirrorPair(headGroup, "head", "ear_area", 0.026, [0.48, 1.0, 1], [-0.118, 0.018, 0.006], [0, Math.PI / 2, 0], headSurfaceOptions);
      addEllipsePatch(headGroup, "head", "nose_sinus", 0.021, [0.74, 1.18, 1], [0, 0.01, 0.151], [0, 0, 0], headSurfaceOptions);
      addEllipsePatch(headGroup, "head", "mouth_jaw", 0.024, [1.55, 0.54, 1], [0, -0.054, 0.132], [0, 0, 0], headSurfaceOptions);
      addSurfacePatch(figure, "head", "neck", [0.088, 0.11], [0, 1.53, 0.065], [0, 0, 0], headSurfaceOptions);

      [
        ["upper_left_chest", -0.12, 0.2],
        ["upper_center_chest", 0, 0.2],
        ["upper_right_chest", 0.12, 0.2],
        ["lower_left_chest", -0.12, 0.065],
        ["lower_center_chest", 0, 0.065],
        ["lower_right_chest", 0.12, 0.065],
      ].forEach(([subregion, x, y]) =>
        addSurfacePatch(torsoGroup, "torso_chest", subregion as string, [0.105, 0.118], [x as number, y as number, 0.151]),
      );

      [
        ["upper_left_abdomen", -0.12, -0.035],
        ["upper_center_stomach", 0, -0.035],
        ["upper_right_abdomen", 0.12, -0.035],
        ["middle_left_abdomen", -0.12, -0.15],
        ["navel_center", 0, -0.15],
        ["middle_right_abdomen", 0.12, -0.15],
        ["lower_left_abdomen", -0.12, -0.265],
        ["lower_center_pelvis", 0, -0.265],
        ["lower_right_abdomen", 0.12, -0.265],
      ].forEach(([subregion, x, y]) =>
        addSurfacePatch(torsoGroup, "torso_abdomen", subregion as string, [0.105, 0.102], [x as number, y as number, 0.151]),
      );

      [
        ["upper_left_back", -0.12, 0.2],
        ["upper_center_back", 0, 0.2],
        ["upper_right_back", 0.12, 0.2],
        ["mid_left_back", -0.095, 0.035],
        ["mid_right_back", 0.095, 0.035],
        ["lower_left_back", -0.12, -0.18],
        ["lower_center_back", 0, -0.18],
        ["lower_right_back", 0.12, -0.18],
      ].forEach(([subregion, x, y]) =>
        addSurfacePatch(torsoGroup, "kidneys", subregion as string, [0.108, 0.118], [x as number, y as number, -0.151], [0, Math.PI, 0]),
      );

      const addArmSubregions = (arm: THREE.Object3D, armRegion: string, handRegion: string, side: -1 | 1) => {
        addCapsulePatch(arm, armRegion, "upper_arm", 0.064, 0.22, [0, -0.16, 0]);
        addCapsulePatch(arm, armRegion, "lower_arm", 0.052, 0.2, [0, -0.43, 0]);
        addSurfacePatch(arm, handRegion, "palm", [0.09, 0.1], [0, -0.62, 0.045]);
        addSurfacePatch(arm, handRegion, "back_of_hand", [0.09, 0.1], [0, -0.62, -0.045], [0, Math.PI, 0]);
        addCapsulePatch(arm, handRegion, "thumb", 0.014, 0.052, [side * 0.047, -0.66, 0.02], [0, 0, side * Math.PI / 3]);
        addCapsulePatch(arm, handRegion, "index_finger", 0.011, 0.062, [-0.025, -0.715, 0]);
        addCapsulePatch(arm, handRegion, "middle_finger", 0.011, 0.067, [-0.008, -0.722, 0]);
        addCapsulePatch(arm, handRegion, "ring_finger", 0.011, 0.062, [0.009, -0.715, 0]);
        addCapsulePatch(arm, handRegion, "pinky_finger", 0.011, 0.054, [0.026, -0.707, 0]);
      };
      addArmSubregions(leftArmGroup, "arm_left", "hand_left", -1);
      addArmSubregions(rightArmGroup, "arm_right", "hand_right", 1);

      const addLegSubregions = (leg: THREE.Object3D, legRegion: string, footRegion: string, side: -1 | 1) => {
        addCapsulePatch(leg, legRegion, "upper_leg", 0.093, 0.33, [0, -0.23, 0]);
        addCapsulePatch(leg, legRegion, "lower_leg", 0.074, 0.31, [0, -0.62, 0]);
        addSurfacePatch(leg, footRegion, "top_of_foot", [0.118, 0.148], [0, -0.842, 0.167], [Math.PI / 2, 0, 0]);
        addSurfacePatch(leg, footRegion, "sole", [0.112, 0.14], [0, -0.914, 0.065], [-Math.PI / 2, 0, 0]);
        addEllipsePatch(leg, footRegion, "heel", 0.045, [1.55, 0.9, 1], [0, -0.865, -0.07], [0, Math.PI, 0]);
        addEllipsePatch(leg, footRegion, "arch", 0.043, [1.25, 0.78, 1], [0, -0.905, 0.04], [-Math.PI / 2, 0, 0]);
        addCapsulePatch(leg, footRegion, "big_toe", 0.02, 0.052, [side * -0.03, -0.86, 0.185], [Math.PI / 2, 0, 0]);
        addCapsulePatch(leg, footRegion, "other_toes", 0.023, 0.07, [side * 0.025, -0.86, 0.185], [Math.PI / 2, 0, Math.PI / 2], [1, 1.18, 1]);
      };
      addLegSubregions(leftLegGroup, "leg_left", "foot_left", -1);
      addLegSubregions(rightLegGroup, "leg_right", "foot_right", 1);

      // emissive original snapshot for highlight pulse
      const origEmissive = new Map<THREE.Mesh, { color: number; intensity: number }>();
      allHighlightable.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat.emissive) origEmissive.set(m, { color: mat.emissive.getHex(), intensity: mat.emissiveIntensity ?? 0 });
      });

      let currentMode: Mode = "skin";
      function applyMode(mm: Mode) {
        currentMode = mm;
        skeleton.visible = false;
        organs.visible = false;
        bodyMeshes.forEach((m) => { m.visible = true; });
        if (mm === "skin") {
          bodyMeshes.forEach((m) => { if (!isClickProxy(m)) m.material = originalMats.get(m)!; });
        } else if (mm === "wire") {
          bodyMeshes.forEach((m) => { if (!isClickProxy(m)) m.material = wireMat; });
        } else if (mm === "xray") {
          bodyMeshes.forEach((m) => { if (!isClickProxy(m)) m.material = xrayMat; });
          skeleton.visible = true;
          organs.visible = true;
        } else if (mm === "bones") {
          bodyMeshes.forEach((m) => { m.visible = isClickProxy(m); });
          skeleton.visible = true;
          organs.visible = true;
        }
      }
      applyMode("skin");

      // highlight (selected) — strong orange persistent
      let selectedRegion: string | null = null;
      // hover — soft cyan, transient
      let hoveredRegion: string | null = null;

      function paintRegion(region: string, color: number, intensity: number) {
        allHighlightable.forEach((m) => {
          if (m.userData.region === region) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat.emissive) { mat.emissive.setHex(color); mat.emissiveIntensity = intensity; }
          }
        });
      }
      function restoreRegion(region: string) {
        allHighlightable.forEach((m) => {
          if (m.userData.region === region) {
            const mat = m.material as THREE.MeshStandardMaterial;
            const orig = origEmissive.get(m);
            if (mat.emissive && orig) { mat.emissive.setHex(orig.color); mat.emissiveIntensity = orig.intensity; }
          }
        });
      }
      function refreshPaint() {
        // priority: selected (orange) > hover (cyan) > original
        if (selectedRegion) paintRegion(selectedRegion, 0xff5d2b, 0.9);
        if (hoveredRegion && hoveredRegion !== selectedRegion) paintRegion(hoveredRegion, 0x7ad9ff, 0.55);
      }
      function setHighlight(region: string | null) {
        if (selectedRegion === region) return;
        if (selectedRegion) restoreRegion(selectedRegion);
        selectedRegion = region;
        // restore hover too in case it overlapped
        if (hoveredRegion && hoveredRegion !== region) restoreRegion(hoveredRegion);
        refreshPaint();
      }
      function setHover(region: string | null) {
        if (hoveredRegion === region) return;
        if (hoveredRegion && hoveredRegion !== selectedRegion) restoreRegion(hoveredRegion);
        hoveredRegion = region;
        refreshPaint();
      }

      // ── focus / camera target per region
      function regionCenter(region: string): THREE.Vector3 | null {
        const candidates: THREE.Mesh[] = [];
        [...bodyMeshes, ...organMeshes, ...skeleton.children]
          .forEach((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh && m.userData.region === region) candidates.push(m);
          });
        if (!candidates.length) return null;
        const box = new THREE.Box3();
        candidates.forEach((m) => {
          const b = new THREE.Box3().setFromObject(m);
          if (!b.isEmpty()) box.union(b);
        });
        if (box.isEmpty()) return null;
        return box.getCenter(new THREE.Vector3());
      }

      const FOCUS_RADIUS: Record<string, number> = {
        head: 1.2, brain: 0.8,
        heart: 0.7, lungs: 1.0, torso_chest: 1.6,
        torso_abdomen: 1.4, stomach: 0.7, liver: 0.8, kidneys: 0.9,
        pelvis: 1.2,
        arm_left: 1.1, arm_right: 1.1,
        hand_left: 0.7, hand_right: 0.7,
        leg_left: 1.5, leg_right: 1.5,
        foot_left: 0.8, foot_right: 0.8,
        skeleton: 4.0,
      };

      let focusedRegion: string | null = null;
      let hoveredSubregionId: string | null = null;
      let selectedSubregionId: string | null = null;
      const targetTarget = new THREE.Vector3(0, 1.0, 0);
      let targetRadius = 4.6;
      const DEFAULT_TARGET = new THREE.Vector3(0, 1.0, 0);
      const DEFAULT_RADIUS = 4.6;
      const INTERNAL_ORGANS = new Set(["brain", "heart", "lungs", "liver", "stomach", "kidneys"]);

      function syncSubregionZones() {
        const focusKey = focusedRegion ? SUBREGION_REGION_BY_FOCUS[focusedRegion] : null;
        subregionProxyMeshes.forEach((mesh) => {
          const isVisible = !!focusKey && mesh.userData.region === focusKey;
          mesh.visible = isVisible;
          const rim = mesh.userData.rim as THREE.Mesh | undefined;
          if (!isVisible) {
            if (rim) rim.visible = false;
            return;
          }

          const material = mesh.material as THREE.MeshBasicMaterial;
          const rimMaterial = rim?.material as THREE.MeshBasicMaterial | undefined;
          const subregion = mesh.userData.subregion as string;
          const isSelected = selectedSubregionId === subregion;
          const isHovered = hoveredSubregionId === subregion;
          material.color.setHex(isSelected ? 0xf4d06f : isHovered ? 0x8deaff : 0x8deaff);
          material.opacity = isSelected
            ? (mesh.userData.selectedOpacity as number | undefined) ?? 0.72
            : isHovered
              ? (mesh.userData.hoverOpacity as number | undefined) ?? 0.56
              : (mesh.userData.baseOpacity as number | undefined) ?? 0.36;
          material.needsUpdate = true;
          if (rim && rimMaterial) {
            rim.visible = true;
            rimMaterial.color.setHex(isSelected ? 0xffe6a3 : isHovered ? 0xd8fbff : 0x052831);
            rimMaterial.opacity = isSelected
              ? (mesh.userData.rimSelectedOpacity as number | undefined) ?? 0.8
              : isHovered
                ? (mesh.userData.rimHoverOpacity as number | undefined) ?? 0.68
                : (mesh.userData.rimBaseOpacity as number | undefined) ?? 0.58;
            rimMaterial.needsUpdate = true;
          }
        });
      }

      function setSelectedSubregion(subregion: string | null) {
        selectedSubregionId = subregion;
        syncSubregionZones();
      }

      function setSubregionHover(subregion: string | null) {
        if (hoveredSubregionId === subregion) return;
        hoveredSubregionId = subregion;
        syncSubregionZones();
      }

      function setFocus(region: string | null) {
        if (focusedRegion === region) return;
        focusedRegion = region;
        if (!region) {
          targetTarget.copy(DEFAULT_TARGET);
          targetRadius = DEFAULT_RADIUS;
          setSubregionHover(null);
          syncSubregionZones();
          // restore visibility to whatever the current mode dictates
          applyMode(currentMode);
          return;
        }
        const c = regionCenter(region);
        if (c) {
          targetTarget.copy(c);
          targetRadius = FOCUS_RADIUS[region] ?? 1.2;
        }
        // when focusing an internal organ, reveal organs even in skin/wire modes
        if (INTERNAL_ORGANS.has(region)) organs.visible = true;
        syncSubregionZones();
      }

      // raycast — when organs are visible, they take priority over the translucent body
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      function pickTargetAt(clientX: number, clientY: number): { region: string; subregion?: string } | null {
        const rect = dom.getBoundingClientRect();
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const sh = raycaster.intersectObjects(subregionProxyMeshes.filter((mesh) => mesh.visible), true);
        if (sh.length) {
          return {
            region: (sh[0].object.userData.region as string) ?? focusedRegion ?? "head",
            subregion: (sh[0].object.userData.subregion as string) ?? undefined,
          };
        }
        if (organs.visible) {
          const oh = raycaster.intersectObjects(organMeshes, true);
          if (oh.length) return { region: (oh[0].object.userData.region as string) ?? "torso_chest" };
        }
        const ph = raycaster.intersectObjects(clickProxyMeshes, true);
        if (ph.length) return { region: (ph[0].object.userData.region as string) ?? "head" };
        const bh = raycaster.intersectObjects(visibleBodyMeshes, true);
        if (bh.length) return { region: (bh[0].object.userData.region as string) ?? "head" };
        return null;
      }

      const onClick = (e: MouseEvent) => {
        if (dragMoved) return;
        const target = pickTargetAt(e.clientX, e.clientY);
        if (!target) return;
        setHighlight(target.region);
        if (target.subregion && onPickSubregionRef.current) {
          onPickSubregionRef.current({ regionId: target.region, subregionId: target.subregion });
          return;
        }
        if (onPickRegionRef.current) onPickRegionRef.current(target.region);
      };
      dom.addEventListener("click", onClick);

      const onHover = (e: MouseEvent) => {
        if (dragging) return;
        const target = pickTargetAt(e.clientX, e.clientY);
        const hoverKey = target ? `${target.region}:${target.subregion ?? ""}` : null;
        dom.style.cursor = target ? "pointer" : "grab";
        setHover(target?.region ?? null);
        setSubregionHover(target?.subregion ?? null);
        if (hoverRef.current !== hoverKey) {
          hoverRef.current = hoverKey;
          setHoverRegion(target?.region ?? null);
          setHoverSubregion(target?.subregion ?? null);
        }
      };
      dom.addEventListener("mousemove", onHover);
      dom.addEventListener("mouseleave", () => {
        setHover(null);
        setSubregionHover(null);
        setHoverRegion(null);
        setHoverSubregion(null);
        hoverRef.current = null;
      });

      // resize observer
      const ro = new ResizeObserver(() => {
        const W = w(), H = h();
        camera.aspect = W / H; camera.updateProjectionMatrix();
        renderer.setSize(W, H);
      });
      ro.observe(container);

      // store base scales for organs to animate around them
      const heartBase = heart.scale.clone();
      const lungLBase = lungL.scale.clone();
      const lungRBase = lungR.scale.clone();

      // animation
      const clock = new THREE.Clock();
      const tick = () => {
        if (disposed) return;
        const t = clock.getElapsedTime();

        // torso breathing
        torso.scale.set(1.0, 1.0, 0.7 * (1 + Math.sin(t * 1.4) * 0.015));

        // micro sway
        figure.position.y = Math.sin(t * 0.7) * 0.006;
        figure.rotation.y = Math.sin(t * 0.3) * 0.04;
        headGroup.rotation.y = Math.sin(t * 0.45) * 0.10;
        headGroup.rotation.x = Math.sin(t * 0.6 + 1.2) * 0.04;

        ring.material.opacity = 0.18 + Math.sin(t * 1.4) * 0.06;
        if ("emissiveIntensity" in xrayMat) xrayMat.emissiveIntensity = 0.4 + Math.sin(t * 7.5) * 0.08;

        // ── organ-specific animations (visible whenever organs are visible)
        // heart: 72bpm = 1.2Hz, lub-dub double pulse
        const hb = Math.sin(t * 7.54) * 0.04 + Math.sin(t * 7.54 + 0.4) * 0.025;
        const heartScale = 1 + hb + (focusedRegion === "heart" ? 0.05 : 0);
        heart.scale.set(heartBase.x * heartScale, heartBase.y * heartScale, heartBase.z * heartScale);
        const heartMatLocal = heart.material as THREE.MeshStandardMaterial;
        if (heartMatLocal.emissive && focusedRegion !== "heart" && selectedRegion !== "heart") {
          heartMatLocal.emissiveIntensity = 0.55 + (Math.sin(t * 7.54) > 0 ? 0.4 : 0);
        }

        // lungs: 14 breaths/min = 0.23Hz expansion
        const lungBreath = 1 + Math.sin(t * 1.5) * 0.07;
        lungL.scale.set(lungLBase.x * lungBreath, lungLBase.y, lungLBase.z * lungBreath);
        lungR.scale.set(lungRBase.x * lungBreath, lungRBase.y, lungRBase.z * lungBreath);

        // brain: subtle emissive pulse
        if (brainMat.emissive) {
          brainMat.emissiveIntensity = 0.4 + Math.sin(t * 2.1) * 0.15 + (focusedRegion === "brain" ? 0.3 : 0);
        }

        // ── camera focus interpolation (smooth lerp toward target)
        target.lerp(targetTarget, 0.06);
        radius += (targetRadius - radius) * 0.06;

        // controls input
        theta += vTheta; phi += vPhi; radius += vRad * radius;
        vTheta *= (1 - damp); vPhi *= (1 - damp); vRad *= (1 - damp);
        phi = Math.max(0.2, Math.min(Math.PI - 0.2, phi));
        radius = Math.max(0.5, Math.min(9, radius));
        sph.set(radius, phi, theta);
        offset.setFromSpherical(sph);
        camera.position.copy(target).add(offset);
        camera.lookAt(target);

        // ── focus dimming: fade out everything that isn't the focused region (or its parents)
        const focusActive = !!focusedRegion;
        const dimTargets = [...visibleBodyMeshes, ...organMeshes];
        dimTargets.forEach((m) => {
          if (!m.visible) return;
          const mat = m.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial;
          if (!("opacity" in mat)) return;
          const isFocused = focusedRegion && m.userData.region === focusedRegion;
          // brief related groups: when focus is "heart", keep lungs faintly visible too
          const related =
            (focusedRegion === "heart" && (m.userData.region === "lungs" || m.userData.region === "torso_chest")) ||
            (focusedRegion === "lungs" && (m.userData.region === "heart" || m.userData.region === "torso_chest")) ||
            (focusedRegion === "brain" && m.userData.region === "head") ||
            (focusedRegion === "stomach" && (m.userData.region === "liver" || m.userData.region === "kidneys")) ||
            (focusedRegion === "liver" && (m.userData.region === "stomach" || m.userData.region === "kidneys")) ||
            (focusedRegion === "kidneys" && (m.userData.region === "stomach" || m.userData.region === "liver"));
          let desired = 1.0;
          if (focusActive && !isFocused) desired = related ? 0.45 : 0.18;
          // smooth opacity blend
          const cur = mat.opacity ?? 1;
          const next = cur + (desired - cur) * 0.08;
          mat.opacity = next;
          mat.transparent = focusActive ? true : (mat.transparent ?? false);
        });

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      apiRef.current = {
        setMode: applyMode,
        setHighlight,
        setFocus,
        setSelectedSubregion,
        dispose: () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          dom.removeEventListener("mousedown", onDown);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          dom.removeEventListener("touchstart", onDown);
          window.removeEventListener("touchmove", onMove);
          window.removeEventListener("touchend", onUp);
          dom.removeEventListener("wheel", onWheel);
          dom.removeEventListener("click", onClick);
          dom.removeEventListener("mousemove", onHover);
          renderer.dispose();
          renderer.domElement.remove();
          scene.traverse((o: any) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.geometry?.dispose();
              const mat = mesh.material as THREE.Material | THREE.Material[];
              if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
              else mat?.dispose();
            }
          });
        },
      };

      setSelectedSubregion(selectedSubregionRef.current ?? null);
      setReady(true);
    }).catch(() => { /* swallow CDN failure; UI shows fallback */ });

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, []);

  // keep latest callback in ref so the effect can stay deps-empty
  useEffect(() => { onPickRegionRef.current = onPickRegion; }, [onPickRegion]);
  useEffect(() => { onPickSubregionRef.current = onPickSubregion; }, [onPickSubregion]);
  useEffect(() => {
    selectedSubregionRef.current = selectedSubregion;
    apiRef.current?.setSelectedSubregion(selectedSubregion ?? null);
  }, [selectedSubregion]);

  // mode change
  useEffect(() => {
    apiRef.current?.setMode(mode);
  }, [mode]);

  // external highlight
  useEffect(() => {
    apiRef.current?.setHighlight(highlightRegion ?? null);
  }, [highlightRegion]);

  // external focus
  useEffect(() => {
    apiRef.current?.setFocus(focusRegion ?? null);
  }, [focusRegion]);

  return (
    <div className={`atrium-original-human-body ${className ?? ""}`}>
      <div ref={containerRef} className="atrium-original-human-body-canvas" />

      {!ready && (
        <div className="atrium-original-human-body-loading">
          <div>Loading body map...</div>
        </div>
      )}

      {/* mode switcher */}
      <div className="atrium-original-human-body-modes">
        {(["skin", "wire", "xray", "bones"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={mode === m ? "active" : ""}
          >
            {m === "skin" ? "Skin" : m === "wire" ? "Wire" : m === "xray" ? "X-Ray" : "Bones"}
          </button>
        ))}
      </div>

      {/* hover label */}
      {hoverRegion && (
        <div className="atrium-original-human-body-hover">
          {hoverSubregion ? subregionLabelFor(hoverSubregion, subregionLabels) : labelFor(hoverRegion, language)}
        </div>
      )}

      {/* attribution */}
      <div className="atrium-original-human-body-credit">
        ATRIUM - interactive body map
      </div>
    </div>
  );
}

function labelFor(region: string, language: Language): string {
  const labels: Record<Language, Record<string, string>> = {
    en: {
      head: "Head",
      brain: "Brain",
      torso_chest: "Chest",
      heart: "Heart",
      lungs: "Lungs",
      torso_abdomen: "Abdomen",
      stomach: "Stomach",
      liver: "Liver",
      kidneys: "Back",
      pelvis: "Pelvis",
      arm_left: "Left arm",
      arm_right: "Right arm",
      leg_left: "Left leg",
      leg_right: "Right leg",
      hand_left: "Left hand",
      hand_right: "Right hand",
      foot_left: "Left foot",
      foot_right: "Right foot",
      skeleton: "Back",
    },
    es: {
      head: "Cabeza",
      brain: "Cerebro",
      torso_chest: "Pecho",
      heart: "Corazon",
      lungs: "Pulmones",
      torso_abdomen: "Abdomen",
      stomach: "Estomago",
      liver: "Higado",
      kidneys: "Espalda",
      pelvis: "Pelvis",
      arm_left: "Brazo izquierdo",
      arm_right: "Brazo derecho",
      leg_left: "Pierna izquierda",
      leg_right: "Pierna derecha",
      hand_left: "Mano izquierda",
      hand_right: "Mano derecha",
      foot_left: "Pie izquierdo",
      foot_right: "Pie derecho",
      skeleton: "Espalda",
    },
  };
  return labels[language][region] ?? humanizeLabel(region);
}

function subregionLabelFor(subregion: string, labels: Record<string, string>) {
  return labels[subregion] ?? humanizeLabel(subregion);
}

function humanizeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// keyword that the existing `organToSpecialist(id)` regex will detect
export function regionToOrganHint(region: string): string {
  return REGION_INTENT[region] ?? "atlas";
}

// inverse: for LLM scene commands ("highlight heart") map objectId → body region
export function objectIdToBodyRegion(objectId: string | undefined | null): string | null {
  if (!objectId) return null;
  const id = objectId.toLowerCase();
  if (/heart|cardio|atri|ventric|aort|coronar/.test(id)) return "heart";
  if (/lung|pulm|bronch|alveol/.test(id)) return "lungs";
  if (/brain|cerebr|cortex|cerebell|hippocamp|neur/.test(id)) return "brain";
  if (/liver|hepat/.test(id)) return "liver";
  if (/stomach|gastr/.test(id)) return "stomach";
  if (/kidney|renal/.test(id)) return "kidneys";
  if (/skull|head|face|cranium/.test(id)) return "head";
  if (/chest|thorax|pector|rib/.test(id)) return "torso_chest";
  if (/abdomen|belly|gut/.test(id)) return "torso_abdomen";
  if (/pelvis|hip/.test(id)) return "pelvis";
  if (/femur|tibia|leg|knee/.test(id)) return "leg_left";
  if (/humerus|arm|elbow/.test(id)) return "arm_left";
  if (/hand|finger|palm/.test(id)) return "hand_left";
  if (/foot|toe|ankle/.test(id)) return "foot_left";
  return null;
}
