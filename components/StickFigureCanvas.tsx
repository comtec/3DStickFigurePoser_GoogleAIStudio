import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PoseData } from '../types';
import { JOINT_NAMES } from '../constants';

interface StickFigureCanvasProps {
  onPoseUpdate: (pose: PoseData) => void;
  pose: PoseData;
}

const StickFigureCanvas: React.FC<StickFigureCanvasProps> = ({ onPoseUpdate, pose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  const selectedJoint = useRef<THREE.Object3D | null>(null);
  const interactiveJoints = useRef<THREE.Object3D[]>([]);
  const limbs = useRef<THREE.Mesh[]>([]);
  const jointObjects = useRef<Map<string, THREE.Object3D>>(new Map());

  // Fix stale closure issue by using a ref to hold the latest onPoseUpdate callback.
  const onPoseUpdateRef = useRef(onPoseUpdate);
  useEffect(() => {
    onPoseUpdateRef.current = onPoseUpdate;
  }, [onPoseUpdate]);

  const createStickFigure = useCallback(() => {
    // Cleanup previous figure if any
    const existingFigure = sceneRef.current.getObjectByName('stickFigure');
    if (existingFigure) {
        sceneRef.current.remove(existingFigure);
    }
    limbs.current.forEach(limb => sceneRef.current.remove(limb));
    limbs.current = [];
    interactiveJoints.current = [];
    jointObjects.current.clear();

    const limbRadius = 0.05;

    // Joint Materials
    // Right (Warm)
    const rightShoulderMat = new THREE.MeshStandardMaterial({ color: 0xff6347, roughness: 0.5 }); // Tomato
    const rightElbowMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.5 });    // DarkOrange
    const rightHandMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.5 });     // Gold
    const rightHipMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, roughness: 0.5 });      // Crimson
    const rightKneeMat = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.5 });     // OrangeRed
    const rightFootMat = new THREE.MeshStandardMaterial({ color: 0xff7f50, roughness: 0.5 });     // Coral
    // Left (Cool)
    const leftShoulderMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, roughness: 0.5 });  // DodgerBlue
    const leftElbowMat = new THREE.MeshStandardMaterial({ color: 0x00bfff, roughness: 0.5 });   // DeepSkyBlue
    const leftHandMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.5 });      // Cyan
    const leftHipMat = new THREE.MeshStandardMaterial({ color: 0x4169e1, roughness: 0.5 });       // RoyalBlue
    const leftKneeMat = new THREE.MeshStandardMaterial({ color: 0x7b68ee, roughness: 0.5 });    // MediumSlateBlue
    const leftFootMat = new THREE.MeshStandardMaterial({ color: 0x7fffd4, roughness: 0.5 });      // Aquamarine
    // Center
    const centerJointMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.5 }); // Gainsboro
    const neckMat = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, roughness: 0.5 });         // LightGray
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 });        // Pink

    // Limb Materials
    const limbRoughness = 0.8;
    // Right (Warm)
    const torsoToRShoulderMat = new THREE.MeshStandardMaterial({ color: 0xffa07a, roughness: limbRoughness }); // LightSalmon
    const rShoulderToRElbowMat = new THREE.MeshStandardMaterial({ color: 0xf4a460, roughness: limbRoughness });// SandyBrown
    const rElbowToRHandMat = new THREE.MeshStandardMaterial({ color: 0xffdab9, roughness: limbRoughness });    // PeachPuff
    const hipsToRHipMat = new THREE.MeshStandardMaterial({ color: 0xcd5c5c, roughness: limbRoughness });       // IndianRed
    const rHipToRKneeMat = new THREE.MeshStandardMaterial({ color: 0xf08080, roughness: limbRoughness });      // LightCoral
    const rKneeToRFootMat = new THREE.MeshStandardMaterial({ color: 0xfa8072, roughness: limbRoughness });     // Salmon
    // Left (Cool)
    const torsoToLShoulderMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, roughness: limbRoughness }); // SteelBlue
    const lShoulderToLElbowMat = new THREE.MeshStandardMaterial({ color: 0x48d1cc, roughness: limbRoughness });// MediumTurquoise
    const lElbowToLHandMat = new THREE.MeshStandardMaterial({ color: 0xafeeee, roughness: limbRoughness });    // PaleTurquoise
    const hipsToLHipMat = new THREE.MeshStandardMaterial({ color: 0x6495ed, roughness: limbRoughness });       // CornflowerBlue
    const lHipToLKneeMat = new THREE.MeshStandardMaterial({ color: 0x87cefa, roughness: limbRoughness });      // LightSkyBlue
    const lKneeToLFootMat = new THREE.MeshStandardMaterial({ color: 0xb0e0e6, roughness: limbRoughness });     // PowderBlue
    // Center
    const hipsToTorsoMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: limbRoughness });      // Silver
    const torsoToNeckMat = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, roughness: limbRoughness });      // DarkGray
    const neckToHeadMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: limbRoughness });       // DimGray

    const createJoint = (name: string, material: THREE.Material, radius = 0.1): THREE.Mesh => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
        sphere.name = name;
        return sphere;
    };
    
    const createLimb = (material: THREE.Material) => {
      const geometry = new THREE.CylinderGeometry(limbRadius, limbRadius, 1, 8);
      const limb = new THREE.Mesh(geometry, material);
      limbs.current.push(limb);
      sceneRef.current.add(limb);
    };

    const figure = new THREE.Group();
    figure.name = 'stickFigure';

    // Body structure
    const hips = new THREE.Group();
    hips.position.y = 1;
    figure.add(hips);
    jointObjects.current.set(JOINT_NAMES.HIPS, hips);

    const torso = new THREE.Group();
    torso.name = JOINT_NAMES.TORSO;
    torso.position.y = 0.6; // Shorter torso
    hips.add(torso);
    jointObjects.current.set(JOINT_NAMES.TORSO, torso);
    interactiveJoints.current.push(torso);
    torso.add(createJoint('torso_sphere', centerJointMat));

    const neck = new THREE.Group();
    neck.name = JOINT_NAMES.NECK;
    neck.position.y = 0.1; // Shorter neck
    torso.add(neck);
    jointObjects.current.set(JOINT_NAMES.NECK, neck);
    interactiveJoints.current.push(neck);
    neck.add(createJoint('neck_sphere', neckMat, 0.08));

    const head = new THREE.Group();
    head.position.y = 0.15; // Adjusted head position
    neck.add(head);
    jointObjects.current.set(JOINT_NAMES.HEAD, head);
    head.add(createJoint(JOINT_NAMES.HEAD, headMat, 0.2));

    // Arms
    const createArm = (side: 'left' | 'right') => {
        const sideX = side === 'left' ? 0.3 : -0.3;
        const shoulderName = side === 'left' ? JOINT_NAMES.LEFT_SHOULDER : JOINT_NAMES.RIGHT_SHOULDER;
        const elbowName = side === 'left' ? JOINT_NAMES.LEFT_ELBOW : JOINT_NAMES.RIGHT_ELBOW;
        const handName = side === 'left' ? JOINT_NAMES.LEFT_HAND : JOINT_NAMES.RIGHT_HAND;

        const shoulderMat = side === 'left' ? leftShoulderMat : rightShoulderMat;
        const elbowMat = side === 'left' ? leftElbowMat : rightElbowMat;
        const handMat = side === 'left' ? leftHandMat : rightHandMat;

        const shoulder = new THREE.Group();
        shoulder.name = shoulderName;
        shoulder.position.x = sideX;
        torso.add(shoulder);
        jointObjects.current.set(shoulderName, shoulder);
        interactiveJoints.current.push(shoulder);
        shoulder.add(createJoint('shoulder_sphere', shoulderMat));

        const elbow = new THREE.Group();
        elbow.name = elbowName;
        elbow.position.y = -0.6; // Longer upper arm
        shoulder.add(elbow);
        jointObjects.current.set(elbowName, elbow);
        interactiveJoints.current.push(elbow);
        elbow.add(createJoint('elbow_sphere', elbowMat));

        const hand = new THREE.Group();
        hand.position.y = -0.5; // Longer forearm
        elbow.add(hand);
        jointObjects.current.set(handName, hand);
        hand.add(createJoint('hand_sphere', handMat, 0.08));
    };
    createArm('left');
    createArm('right');

    // Legs
    const createLeg = (side: 'left' | 'right') => {
        const sideX = side === 'left' ? 0.2 : -0.2; // Slightly wider hips
        const hipName = side === 'left' ? JOINT_NAMES.LEFT_HIP : JOINT_NAMES.RIGHT_HIP;
        const kneeName = side === 'left' ? JOINT_NAMES.LEFT_KNEE : JOINT_NAMES.RIGHT_KNEE;
        const footName = side === 'left' ? JOINT_NAMES.LEFT_FOOT : JOINT_NAMES.RIGHT_FOOT;
        
        const hipMat = side === 'left' ? leftHipMat : rightHipMat;
        const kneeMat = side === 'left' ? leftKneeMat : rightKneeMat;
        const footMat = side === 'left' ? leftFootMat : rightFootMat;
        
        const hip = new THREE.Group();
        hip.name = hipName;
        hip.position.x = sideX;
        hips.add(hip);
        jointObjects.current.set(hipName, hip);
        interactiveJoints.current.push(hip);
        hip.add(createJoint('hip_sphere', hipMat));

        const knee = new THREE.Group();
        knee.name = kneeName;
        knee.position.y = -0.7; // Longer thigh
        hip.add(knee);
        jointObjects.current.set(kneeName, knee);
        interactiveJoints.current.push(knee);
        knee.add(createJoint('knee_sphere', kneeMat));

        const foot = new THREE.Group();
        foot.position.y = -0.6; // Longer shin
        knee.add(foot);
        jointObjects.current.set(footName, foot);
        foot.add(createJoint('foot_sphere', footMat, 0.08));
    };
    createLeg('left');
    createLeg('right');

    // Connect limbs
    createLimb(hipsToTorsoMat);
    createLimb(torsoToNeckMat);
    createLimb(neckToHeadMat);
    
    createLimb(torsoToLShoulderMat);
    createLimb(lShoulderToLElbowMat);
    createLimb(lElbowToLHandMat);
    
    createLimb(torsoToRShoulderMat);
    createLimb(rShoulderToRElbowMat);
    createLimb(rElbowToRHandMat);

    createLimb(hipsToLHipMat);
    createLimb(lHipToLKneeMat);
    createLimb(lKneeToLFootMat);

    createLimb(hipsToRHipMat);
    createLimb(rHipToRKneeMat);
    createLimb(rKneeToRFootMat);

    return figure;
  }, []);
  
  const updateLimbs = useCallback(() => {
    if (limbs.current.length === 0) return;
    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();

    const updateLimb = (limb: THREE.Mesh, start: THREE.Object3D, end: THREE.Object3D) => {
        if (!limb || !start || !end) return;

        start.getWorldPosition(startPos);
        end.getWorldPosition(endPos);
        
        const distance = startPos.distanceTo(endPos);
        // Cylinder's height is along Y. We scale Y.
        limb.scale.set(1, distance, 1);

        // Position the limb at the midpoint
        limb.position.copy(startPos).lerp(endPos, 0.5);

        // Align the limb to point from start to end
        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        if (direction.lengthSq() > 0) { // Avoid issues with zero-length vectors
          quaternion.setFromUnitVectors(up, direction);
          limb.quaternion.copy(quaternion);
        }
    };
    
    let limbIndex = 0;
    const getLimb = () => limbs.current[limbIndex++];

    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.TORSO)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.NECK)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.NECK)!, jointObjects.current.get(JOINT_NAMES.HEAD)!);
    
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.LEFT_HAND)!);

    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HAND)!);

    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!, jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!, jointObjects.current.get(JOINT_NAMES.LEFT_FOOT)!);

    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!, jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!);
    updateLimb(getLimb(), jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!, jointObjects.current.get(JOINT_NAMES.RIGHT_FOOT)!);
  }, []);

  const updatePoseData = useCallback(() => {
    const newPoseData: PoseData = {};
    for (const joint of interactiveJoints.current) {
        newPoseData[joint.name] = {
            x: Math.round(THREE.MathUtils.radToDeg(joint.rotation.x)),
            y: Math.round(THREE.MathUtils.radToDeg(joint.rotation.y)),
            z: Math.round(THREE.MathUtils.radToDeg(joint.rotation.z)),
        };
    }
    onPoseUpdateRef.current(newPoseData);
  }, []);

  const onPointerDown = useCallback((event: PointerEvent) => {
    event.preventDefault();
    if (!mountRef.current || !cameraRef.current) return;
    
    const rect = mountRef.current.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObjects(interactiveJoints.current.map(j => j.children[0]), true);

    if (intersects.length > 0) {
        selectedJoint.current = intersects[0].object.parent; // Select the group
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
    }
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    event.preventDefault();
    if (selectedJoint.current) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        selectedJoint.current.rotation.y += movementX * 0.01;
        selectedJoint.current.rotation.x += movementY * 0.01;

        updatePoseData();
    }
  }, [updatePoseData]);

  const onPointerUp = useCallback(() => {
    selectedJoint.current = null;
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, []);
  
  // Effect to apply pose from props
  useEffect(() => {
    for (const [name, rotation] of Object.entries(pose)) {
        const joint = jointObjects.current.get(name);
        if (joint) {
            joint.rotation.set(
                THREE.MathUtils.degToRad(rotation.x),
                THREE.MathUtils.degToRad(rotation.y),
                THREE.MathUtils.degToRad(rotation.z)
            );
        }
    }
    // After applying a new pose, the limbs need to be redrawn.
    updateLimbs();
  }, [pose, updateLimbs]);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene setup
    sceneRef.current.background = new THREE.Color(0x111827); // bg-gray-900

    // Camera setup
    cameraRef.current = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    cameraRef.current.position.set(0, 1.5, 3);

    // Renderer setup
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(rendererRef.current.domElement);

    // Controls setup
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.target.set(0, 1, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    sceneRef.current.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7.5);
    sceneRef.current.add(directionalLight);
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(10, 10);
    sceneRef.current.add(gridHelper);

    // Stick Figure
    const stickFigure = createStickFigure();
    sceneRef.current.add(stickFigure);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controlsRef.current?.update();
      updateLimbs();
      rendererRef.current?.render(sceneRef.current, cameraRef.current!);
    };
    animate();

    // Event listeners
    currentMount.addEventListener('pointerdown', onPointerDown);
    currentMount.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    
    // Resize handler
    const handleResize = () => {
        if (currentMount && rendererRef.current && cameraRef.current) {
            cameraRef.current.aspect = currentMount.clientWidth / currentMount.clientHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
        }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('pointerdown', onPointerDown);
      currentMount.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      if (rendererRef.current) {
        currentMount.removeChild(rendererRef.current.domElement);
      }
      // Dispose Three.js objects
      sceneRef.current.traverse(object => {
          if (object instanceof THREE.Mesh) {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
              }
          }
      });
    };
  }, [createStickFigure, onPointerDown, onPointerMove, onPointerUp, updateLimbs]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};

export default StickFigureCanvas;