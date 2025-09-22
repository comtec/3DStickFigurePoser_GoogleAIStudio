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
  const limbs = useRef<THREE.Line[]>([]);
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


    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.5 });
    const limbMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffaaff, roughness: 0.5 });

    const createJoint = (name: string, radius = 0.1): THREE.Mesh => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), name === JOINT_NAMES.HEAD ? headMaterial : jointMaterial);
        sphere.name = name;
        return sphere;
    };
    
    const createLimb = (start: THREE.Object3D, end: THREE.Object3D) => {
      const points = [new THREE.Vector3(), new THREE.Vector3()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, limbMaterial);
      limbs.current.push(line);
      sceneRef.current.add(line);
      return line;
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
    torso.position.y = 0.5;
    hips.add(torso);
    jointObjects.current.set(JOINT_NAMES.TORSO, torso);
    interactiveJoints.current.push(torso);
    torso.add(createJoint('torso_sphere'));

    const neck = new THREE.Group();
    neck.name = JOINT_NAMES.NECK;
    neck.position.y = 0.5;
    torso.add(neck);
    jointObjects.current.set(JOINT_NAMES.NECK, neck);
    interactiveJoints.current.push(neck);
    neck.add(createJoint('neck_sphere', 0.08));

    const head = new THREE.Group();
    head.position.y = 0.2;
    neck.add(head);
    jointObjects.current.set(JOINT_NAMES.HEAD, head);
    head.add(createJoint(JOINT_NAMES.HEAD, 0.2));

    // Arms
    const createArm = (side: 'left' | 'right') => {
        const sideX = side === 'left' ? 0.3 : -0.3;
        const shoulderName = side === 'left' ? JOINT_NAMES.LEFT_SHOULDER : JOINT_NAMES.RIGHT_SHOULDER;
        const elbowName = side === 'left' ? JOINT_NAMES.LEFT_ELBOW : JOINT_NAMES.RIGHT_ELBOW;
        const handName = side === 'left' ? JOINT_NAMES.LEFT_HAND : JOINT_NAMES.RIGHT_HAND;

        const shoulder = new THREE.Group();
        shoulder.name = shoulderName;
        shoulder.position.x = sideX;
        torso.add(shoulder);
        jointObjects.current.set(shoulderName, shoulder);
        interactiveJoints.current.push(shoulder);
        shoulder.add(createJoint('shoulder_sphere'));

        const elbow = new THREE.Group();
        elbow.name = elbowName;
        elbow.position.y = -0.5;
        shoulder.add(elbow);
        jointObjects.current.set(elbowName, elbow);
        interactiveJoints.current.push(elbow);
        elbow.add(createJoint('elbow_sphere'));

        const hand = new THREE.Group();
        hand.position.y = -0.4;
        elbow.add(hand);
        jointObjects.current.set(handName, hand);
        hand.add(createJoint('hand_sphere', 0.08));
    };
    createArm('left');
    createArm('right');

    // Legs
    const createLeg = (side: 'left' | 'right') => {
        const sideX = side === 'left' ? 0.15 : -0.15;
        const hipName = side === 'left' ? JOINT_NAMES.LEFT_HIP : JOINT_NAMES.RIGHT_HIP;
        const kneeName = side === 'left' ? JOINT_NAMES.LEFT_KNEE : JOINT_NAMES.RIGHT_KNEE;
        const footName = side === 'left' ? JOINT_NAMES.LEFT_FOOT : JOINT_NAMES.RIGHT_FOOT;
        
        const hip = new THREE.Group();
        hip.name = hipName;
        hip.position.x = sideX;
        hips.add(hip);
        jointObjects.current.set(hipName, hip);
        interactiveJoints.current.push(hip);
        hip.add(createJoint('hip_sphere'));

        const knee = new THREE.Group();
        knee.name = kneeName;
        knee.position.y = -0.6;
        hip.add(knee);
        jointObjects.current.set(kneeName, knee);
        interactiveJoints.current.push(knee);
        knee.add(createJoint('knee_sphere'));

        const foot = new THREE.Group();
        foot.position.y = -0.5;
        knee.add(foot);
        jointObjects.current.set(footName, foot);
        foot.add(createJoint('foot_sphere', 0.08));
    };
    createLeg('left');
    createLeg('right');

    // Connect limbs
    createLimb(jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.TORSO)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.NECK)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.NECK)!, jointObjects.current.get(JOINT_NAMES.HEAD)!);
    
    createLimb(jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.LEFT_HAND)!);
    
    createLimb(jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HAND)!);

    createLimb(jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!, jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!, jointObjects.current.get(JOINT_NAMES.LEFT_FOOT)!);

    createLimb(jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!, jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!);
    createLimb(jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!, jointObjects.current.get(JOINT_NAMES.RIGHT_FOOT)!);

    return figure;
  }, []);
  
  const updateLimbs = useCallback(() => {
    if (limbs.current.length === 0) return;
    const worldPos = new THREE.Vector3();
    const updateLimb = (line: THREE.Line, start: THREE.Object3D, end: THREE.Object3D) => {
        if (!line || !start || !end) return;
        const positions = line.geometry.attributes.position;
        start.getWorldPosition(worldPos);
        positions.setXYZ(0, worldPos.x, worldPos.y, worldPos.z);
        end.getWorldPosition(worldPos);
        positions.setXYZ(1, worldPos.x, worldPos.y, worldPos.z);
        positions.needsUpdate = true;
    };
    
    let limbIndex = 0;
    const getLimb = () => limbs.current[limbIndex++];

    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.TORSO)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.NECK)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.NECK)!, jointObjects.current.get(JOINT_NAMES.HEAD)!);
    
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.LEFT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.LEFT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.LEFT_HAND)!);

    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.TORSO)!, jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.RIGHT_SHOULDER)!, jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.RIGHT_ELBOW)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HAND)!);

    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.LEFT_HIP)!, jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.LEFT_KNEE)!, jointObjects.current.get(JOINT_NAMES.LEFT_FOOT)!);

    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.HIPS)!, jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.RIGHT_HIP)!, jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!);
    updateLimb(getLimb()!, jointObjects.current.get(JOINT_NAMES.RIGHT_KNEE)!, jointObjects.current.get(JOINT_NAMES.RIGHT_FOOT)!);
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