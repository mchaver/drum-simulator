import * as THREE from 'three';

// PS1-style material settings
const PS1_MATERIAL_CONFIG = {
  flatShading: true,
  // Low texture resolution simulation
  anisotropy: 0,
};

// Drum piece interface
interface DrumPiece {
  mesh: THREE.Mesh;
  originalY: number;
  key: string;
  name: string;
}

// Particle interface
interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

// Display modes
type DisplayMode = 'none' | 'sticks';

// Drumstick interface
interface Drumstick {
  mesh: THREE.Group;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  isAnimating: boolean;
  targetPosition: THREE.Vector3 | null;
  animationProgress: number;
  animationPhase: 'down' | 'up' | 'idle';
}

// Character parts
interface Character {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftForearm: THREE.Mesh;
  rightForearm: THREE.Mesh;
}

// Kick pedal interface
interface KickPedal {
  group: THREE.Group;
  pedal: THREE.Mesh;
  originalRotation: THREE.Euler;
  isAnimating: boolean;
  animationProgress: number;
  animationPhase: 'down' | 'up' | 'idle';
}

class DrumSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private drumPieces: DrumPiece[] = [];
  private audioContext: AudioContext;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private cameraDistance: number = 6;
  private cameraAngleY: number = 0;
  private cameraAngleX: number = Math.PI / 6; // 30 degrees up
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private lookAtPoint: THREE.Vector3;
  private particles: Particle[] = [];
  private lastFrameTime: number = 0;
  private displayMode: DisplayMode = 'none';
  private leftStick: Drumstick | null = null;
  private rightStick: Drumstick | null = null;
  private character: Character | null = null;
  private chair: THREE.Group | null = null;
  private kickPedal: KickPedal | null = null;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 6);
    this.camera.lookAt(0, 1, 0);

    // Renderer setup with PS1 aesthetic
    this.renderer = new THREE.WebGLRenderer({ antialias: false }); // No antialiasing for PS1 look
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // Low pixel ratio for chunky look
    document.body.appendChild(this.renderer.domElement);

    // Audio context
    this.audioContext = new AudioContext();

    // Raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera controls
    this.lookAtPoint = new THREE.Vector3(0, 0.9, -0.5);
    this.updateCameraPosition();

    // Setup scene
    this.setupLights();
    this.createDrumSet();
    this.createGround();

    // Create character system
    this.createDrumsticks();
    this.createKickPedal();
    this.createCharacter();
    this.createChair();
    this.updateDisplayMode();

    // Setup UI
    this.setupUI();

    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Start animation loop
    this.animate();
  }

  private setupLights(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambient);

    // Directional light (main light)
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);

    // Colored accent lights for atmosphere
    const redLight = new THREE.PointLight(0xff0000, 0.5, 20);
    redLight.position.set(-5, 2, 0);
    this.scene.add(redLight);

    const blueLight = new THREE.PointLight(0x0000ff, 0.5, 20);
    blueLight.position.set(5, 2, 0);
    this.scene.add(blueLight);
  }

  private createDrumSet(): void {
    // Kick drum - on ground, centered, upright
    this.createDrum(0, 0.5, -0.8, 0.45, 0.6, 0xff4444, 'Q', 'Kick', Math.PI / 2, 0);

    // Snare - between legs, slightly left, angled up toward drummer
    this.createDrum(-0.35, 0.95, -0.5, 0.35, 0.25, 0xcccccc, 'W', 'Snare', Math.PI / 12, 0);

    // Hi-hat - left of snare, angled
    this.createCymbal(-0.8, 1.1, -0.3, 0.3, 0xffff00, 'E', 'Hi-Hat', Math.PI / 8);

    // Tom 1 - small rack tom, mounted above kick, left side
    this.createDrum(-0.25, 1.2, -0.9, 0.3, 0.28, 0x4444ff, 'A', 'Tom 1', Math.PI / 6, -Math.PI / 12);

    // Tom 2 - medium rack tom, mounted above kick, right side
    this.createDrum(0.25, 1.2, -0.9, 0.35, 0.3, 0x44ff44, 'S', 'Tom 2', Math.PI / 6, Math.PI / 12);

    // Floor tom - right side with legs, angled toward drummer
    this.createDrum(0.8, 0.6, -0.4, 0.4, 0.42, 0xff44ff, 'F', 'Floor Tom', Math.PI / 8, Math.PI / 6);

    // Crash cymbal - left-back area on stand
    this.createCymbal(-0.9, 1.5, -0.9, 0.4, 0xffaa00, 'D', 'Crash', Math.PI / 10);

    // Ride cymbal - right-back area on stand
    this.createCymbal(1.0, 1.4, -0.9, 0.45, 0xffdd44, 'R', 'Ride', Math.PI / 12);
  }

  private createDrum(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    color: number,
    key: string,
    name: string,
    rotationX: number = 0,
    rotationY: number = 0
  ): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
    const material = new THREE.MeshPhongMaterial({
      color,
      ...PS1_MATERIAL_CONFIG,
    });
    const drum = new THREE.Mesh(geometry, material);
    drum.position.set(x, y, z);
    drum.rotation.set(rotationX, rotationY, 0);

    // Add a top surface
    const topGeometry = new THREE.CircleGeometry(radius * 0.98, 8);
    const topMaterial = new THREE.MeshPhongMaterial({
      color: color * 0.7,
      ...PS1_MATERIAL_CONFIG,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;

    // Apply same rotations as drum, then add the top rotation
    const topGroup = new THREE.Group();
    topGroup.position.set(x, y, z);
    topGroup.rotation.set(rotationX, rotationY, 0);
    top.position.y = height / 2 + 0.01;
    topGroup.add(top);

    this.scene.add(drum);
    this.scene.add(topGroup);

    this.drumPieces.push({
      mesh: drum,
      originalY: y,
      key: key.toLowerCase(),
      name,
    });
  }

  private createCymbal(
    x: number,
    y: number,
    z: number,
    radius: number,
    color: number,
    key: string,
    name: string,
    rotationX: number = 0
  ): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.05, 16);
    const material = new THREE.MeshPhongMaterial({
      color,
      ...PS1_MATERIAL_CONFIG,
      shininess: 100,
    });
    const cymbal = new THREE.Mesh(geometry, material);
    cymbal.position.set(x, y, z);
    cymbal.rotation.x = rotationX;

    // Stand
    const standGeometry = new THREE.CylinderGeometry(0.02, 0.02, y - 0.1, 6);
    const standMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      ...PS1_MATERIAL_CONFIG,
    });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.set(x, (y - 0.1) / 2 + 0.1, z);

    this.scene.add(cymbal);
    this.scene.add(stand);

    this.drumPieces.push({
      mesh: cymbal,
      originalY: y,
      key: key.toLowerCase(),
      name,
    });
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(20, 20, 10, 10);
    const material = new THREE.MeshPhongMaterial({
      color: 0x0a0a1a,
      ...PS1_MATERIAL_CONFIG,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);

    // Add grid lines for PS1 aesthetic
    const gridHelper = new THREE.GridHelper(20, 20, 0x00ff00, 0x003300);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private createDrumsticks(): void {
    // Left stick
    const leftStickGroup = new THREE.Group();
    const stickGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.4, 6);
    const stickMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      ...PS1_MATERIAL_CONFIG,
    });
    const leftStickMesh = new THREE.Mesh(stickGeometry, stickMaterial);
    leftStickMesh.rotation.z = Math.PI / 2;
    leftStickGroup.add(leftStickMesh);

    // Position above hi-hat/left side (natural resting position)
    leftStickGroup.position.set(-0.6, 1.3, -0.4);
    leftStickGroup.rotation.set(0, 0, 0);
    this.scene.add(leftStickGroup);

    this.leftStick = {
      mesh: leftStickGroup,
      originalPosition: leftStickGroup.position.clone(),
      originalRotation: leftStickGroup.rotation.clone(),
      isAnimating: false,
      targetPosition: null,
      animationProgress: 0,
      animationPhase: 'idle',
    };

    // Right stick
    const rightStickGroup = new THREE.Group();
    const rightStickMesh = new THREE.Mesh(stickGeometry, stickMaterial);
    rightStickMesh.rotation.z = Math.PI / 2;
    rightStickGroup.add(rightStickMesh);

    // Position above snare/right side (natural resting position)
    rightStickGroup.position.set(0.15, 1.2, -0.5);
    rightStickGroup.rotation.set(0, 0, 0);
    this.scene.add(rightStickGroup);

    this.rightStick = {
      mesh: rightStickGroup,
      originalPosition: rightStickGroup.position.clone(),
      originalRotation: rightStickGroup.rotation.clone(),
      isAnimating: false,
      targetPosition: null,
      animationProgress: 0,
      animationPhase: 'idle',
    };
  }

  private createKickPedal(): void {
    const pedalGroup = new THREE.Group();

    // Pedal base plate (on ground)
    const baseGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.25);
    const metalMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      ...PS1_MATERIAL_CONFIG,
    });
    const base = new THREE.Mesh(baseGeometry, metalMaterial);
    base.position.set(0, 0.01, -0.4);
    pedalGroup.add(base);

    // Pedal plate (the part you step on)
    const pedalGeometry = new THREE.BoxGeometry(0.12, 0.02, 0.15);
    const pedal = new THREE.Mesh(pedalGeometry, metalMaterial);
    pedal.position.set(0, 0.03, -0.35);
    pedalGroup.add(pedal);

    // Beater rod (connects to drum)
    const rodGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6);
    const rod = new THREE.Mesh(rodGeometry, metalMaterial);
    rod.position.set(0, 0.2, -0.5);
    rod.rotation.x = -Math.PI / 3;
    pedalGroup.add(rod);

    // Beater head (hits the drum)
    const beaterGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const beaterMaterial = new THREE.MeshPhongMaterial({
      color: 0xffdddd,
      ...PS1_MATERIAL_CONFIG,
    });
    const beater = new THREE.Mesh(beaterGeometry, beaterMaterial);
    beater.position.set(0, 0.35, -0.65);
    pedalGroup.add(beater);

    this.scene.add(pedalGroup);

    this.kickPedal = {
      group: pedalGroup,
      pedal,
      originalRotation: pedal.rotation.clone(),
      isAnimating: false,
      animationProgress: 0,
      animationPhase: 'idle',
    };
  }

  private createCharacter(): void {
    const characterGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x2244aa,
      ...PS1_MATERIAL_CONFIG,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 1.3, -1.5);
    characterGroup.add(body);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0xffdbac,
      ...PS1_MATERIAL_CONFIG,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.75, -1.5);
    characterGroup.add(head);

    // Left arm (upper arm)
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6);
    const armMaterial = new THREE.MeshPhongMaterial({
      color: 0x2244aa,
      ...PS1_MATERIAL_CONFIG,
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.28, 1.4, -1.5);
    leftArm.rotation.z = Math.PI / 6;
    characterGroup.add(leftArm);

    // Right arm (upper arm)
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.28, 1.4, -1.5);
    rightArm.rotation.z = -Math.PI / 6;
    characterGroup.add(rightArm);

    // Left forearm
    const forearmGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6);
    const leftForearm = new THREE.Mesh(forearmGeometry, armMaterial);
    leftForearm.position.set(-0.45, 1.15, -1.4);
    leftForearm.rotation.z = Math.PI / 3;
    characterGroup.add(leftForearm);

    // Right forearm
    const rightForearm = new THREE.Mesh(forearmGeometry, armMaterial);
    rightForearm.position.set(0.45, 1.15, -1.4);
    rightForearm.rotation.z = -Math.PI / 3;
    characterGroup.add(rightForearm);

    this.scene.add(characterGroup);

    this.character = {
      group: characterGroup,
      body,
      head,
      leftArm,
      rightArm,
      leftForearm,
      rightForearm,
    };
  }

  private createChair(): void {
    const chairGroup = new THREE.Group();

    // Seat
    const seatGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.4);
    const chairMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      ...PS1_MATERIAL_CONFIG,
    });
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    seat.position.set(0, 1.0, -1.5);
    chairGroup.add(seat);

    // Backrest
    const backGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.05);
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    back.position.set(0, 1.2, -1.7);
    chairGroup.add(back);

    // Legs (4 legs)
    const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6);
    const positions = [
      [-0.2, 0.5, -1.35],
      [0.2, 0.5, -1.35],
      [-0.2, 0.5, -1.65],
      [0.2, 0.5, -1.65],
    ];

    positions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, chairMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      chairGroup.add(leg);
    });

    this.scene.add(chairGroup);
    this.chair = chairGroup;
  }

  private setupUI(): void {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'display-controls';
    controlsDiv.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border: 2px solid #00ff00;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      text-shadow: 2px 2px 0px #003300;
      z-index: 100;
    `;

    controlsDiv.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">Display Mode:</div>
      <label style="display: block; margin: 5px 0; cursor: pointer;">
        <input type="radio" name="displayMode" value="none" checked style="margin-right: 5px;">
        None
      </label>
      <label style="display: block; margin: 5px 0; cursor: pointer;">
        <input type="radio" name="displayMode" value="sticks" style="margin-right: 5px;">
        Sticks Only
      </label>
    `;

    document.body.appendChild(controlsDiv);

    // Add event listeners to radio buttons
    const radios = document.querySelectorAll('input[name="displayMode"]');
    radios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.displayMode = target.value as DisplayMode;
        this.updateDisplayMode();
      });
    });
  }

  private updateDisplayMode(): void {
    // Hide everything first
    if (this.leftStick) this.leftStick.mesh.visible = false;
    if (this.rightStick) this.rightStick.mesh.visible = false;
    if (this.kickPedal) this.kickPedal.group.visible = false;
    if (this.character) this.character.group.visible = false;
    if (this.chair) this.chair.visible = false;

    // Show based on mode
    if (this.displayMode === 'sticks') {
      if (this.leftStick) this.leftStick.mesh.visible = true;
      if (this.rightStick) this.rightStick.mesh.visible = true;
      if (this.kickPedal) this.kickPedal.group.visible = true;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const drumPiece = this.drumPieces.find((d) => d.key === key);

    if (drumPiece) {
      this.hitDrum(drumPiece);
      this.playSound(drumPiece.name);
    }
  }

  private onClick(event: MouseEvent): void {
    // Only trigger click if we weren't dragging
    if (this.isDragging) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the picking ray
    const drumMeshes = this.drumPieces.map((d) => d.mesh);
    const intersects = this.raycaster.intersectObjects(drumMeshes);

    // If we hit a drum, play it
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const drumPiece = this.drumPieces.find((d) => d.mesh === clickedMesh);

      if (drumPiece) {
        this.hitDrum(drumPiece);
        this.playSound(drumPiece.name);
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    // Right click or ctrl+click to rotate camera
    if (event.button === 2 || event.ctrlKey) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    // Update camera angles
    this.cameraAngleY -= deltaX * 0.005;
    this.cameraAngleX -= deltaY * 0.005;

    // Clamp vertical angle to prevent flipping
    this.cameraAngleX = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraAngleX));

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
    this.updateCameraPosition();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance += event.deltaY * 0.01;
    // Clamp distance
    this.cameraDistance = Math.max(3, Math.min(15, this.cameraDistance));
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    // Convert spherical coordinates to cartesian
    const x = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.sin(this.cameraAngleY);
    const y = this.cameraDistance * Math.cos(this.cameraAngleX);
    const z = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookAtPoint);
  }

  private hitDrum(drumPiece: DrumPiece): void {
    // Animate drum hit
    drumPiece.mesh.position.y = drumPiece.originalY - 0.05;

    // Return to original position
    setTimeout(() => {
      drumPiece.mesh.position.y = drumPiece.originalY;
    }, 100);

    // Flash effect
    const material = drumPiece.mesh.material as THREE.MeshPhongMaterial;
    const originalColor = material.color.clone();
    material.color.multiplyScalar(1.5);

    setTimeout(() => {
      material.color.copy(originalColor);
    }, 100);

    // Spawn particles
    this.spawnParticles(drumPiece);

    // Animate drumsticks or kick pedal
    if (drumPiece.name === 'Kick') {
      this.animateKickPedal();
    } else {
      this.animateStick(drumPiece);
    }
  }

  private animateStick(drumPiece: DrumPiece): void {
    // Skip kick drum - it uses the pedal instead
    if (drumPiece.name === 'Kick') return;

    // Determine which stick to use based on drum position
    const drumPosition = drumPiece.mesh.position;
    const isLeftSide =
      drumPiece.name === 'Hi-Hat' ||
      drumPiece.name === 'Tom 1' ||
      drumPiece.name === 'Snare';
    const stick = isLeftSide ? this.leftStick : this.rightStick;

    if (!stick || stick.isAnimating) return;

    stick.isAnimating = true;
    stick.animationPhase = 'down';
    stick.animationProgress = 0;

    // Calculate target position (above the drum)
    stick.targetPosition = new THREE.Vector3(
      drumPosition.x,
      drumPosition.y + 0.3,
      drumPosition.z
    );
  }

  private animateKickPedal(): void {
    if (!this.kickPedal || this.kickPedal.isAnimating) return;

    this.kickPedal.isAnimating = true;
    this.kickPedal.animationPhase = 'down';
    this.kickPedal.animationProgress = 0;
  }

  private updateDrumsticks(deltaTime: number): void {
    const sticks = [this.leftStick, this.rightStick];

    sticks.forEach((stick) => {
      if (!stick || !stick.isAnimating || !stick.targetPosition) return;

      const speed = 8; // Animation speed multiplier
      stick.animationProgress += deltaTime * speed;

      if (stick.animationPhase === 'down') {
        // Move down to drum
        const t = Math.min(stick.animationProgress, 1);
        // Use easing function for smooth motion
        const eased = this.easeOutCubic(t);

        stick.mesh.position.lerpVectors(
          stick.originalPosition,
          stick.targetPosition,
          eased
        );

        if (t >= 1) {
          stick.animationPhase = 'up';
          stick.animationProgress = 0;
        }
      } else if (stick.animationPhase === 'up') {
        // Move back up to original position
        const t = Math.min(stick.animationProgress, 1);
        const eased = this.easeInCubic(t);

        stick.mesh.position.lerpVectors(
          stick.targetPosition,
          stick.originalPosition,
          eased
        );

        if (t >= 1) {
          stick.animationPhase = 'idle';
          stick.isAnimating = false;
          stick.targetPosition = null;
          stick.animationProgress = 0;
          stick.mesh.position.copy(stick.originalPosition);
        }
      }
    });
  }

  private updateKickPedal(deltaTime: number): void {
    if (!this.kickPedal || !this.kickPedal.isAnimating) return;

    const speed = 12; // Faster animation for kick pedal
    this.kickPedal.animationProgress += deltaTime * speed;

    if (this.kickPedal.animationPhase === 'down') {
      // Press down pedal
      const t = Math.min(this.kickPedal.animationProgress, 1);
      const eased = this.easeOutCubic(t);

      // Rotate pedal downward
      this.kickPedal.pedal.rotation.x = eased * -Math.PI / 6;

      if (t >= 1) {
        this.kickPedal.animationPhase = 'up';
        this.kickPedal.animationProgress = 0;
      }
    } else if (this.kickPedal.animationPhase === 'up') {
      // Release pedal back up
      const t = Math.min(this.kickPedal.animationProgress, 1);
      const eased = this.easeInCubic(t);

      // Rotate back to original
      this.kickPedal.pedal.rotation.x = (1 - eased) * -Math.PI / 6;

      if (t >= 1) {
        this.kickPedal.animationPhase = 'idle';
        this.kickPedal.isAnimating = false;
        this.kickPedal.animationProgress = 0;
        this.kickPedal.pedal.rotation.copy(this.kickPedal.originalRotation);
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private spawnParticles(drumPiece: DrumPiece): void {
    const particleCount = 8;
    const drumColor = (drumPiece.mesh.material as THREE.MeshPhongMaterial).color;

    for (let i = 0; i < particleCount; i++) {
      // Create small cube particles for PS1 aesthetic
      const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const material = new THREE.MeshBasicMaterial({
        color: drumColor,
      });
      const particleMesh = new THREE.Mesh(geometry, material);

      // Position at drum location
      particleMesh.position.copy(drumPiece.mesh.position);

      // Random velocity
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 0.5 + Math.random() * 0.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        1 + Math.random() * 0.5, // Upward velocity
        Math.sin(angle) * speed
      );

      this.scene.add(particleMesh);

      this.particles.push({
        mesh: particleMesh,
        velocity,
        life: 0,
        maxLife: 0.5, // 0.5 seconds lifetime
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life += deltaTime;

      // Update position
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );

      // Apply gravity
      particle.velocity.y -= 9.8 * deltaTime;

      // Fade out
      const lifeRatio = particle.life / particle.maxLife;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - lifeRatio;
      material.transparent = true;

      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playSound(drumName: string): void {
    const now = this.audioContext.currentTime;

    switch (drumName) {
      case 'Kick':
        this.playKick(now);
        break;
      case 'Snare':
        this.playSnare(now);
        break;
      case 'Hi-Hat':
        this.playHiHat(now);
        break;
      case 'Tom 1':
        this.playTom(now, 200, 0.4);
        break;
      case 'Tom 2':
        this.playTom(now, 150, 0.45);
        break;
      case 'Floor Tom':
        this.playTom(now, 110, 0.5);
        break;
      case 'Crash':
        this.playCrash(now);
        break;
      case 'Ride':
        this.playRide(now);
        break;
    }
  }

  private playKick(time: number): void {
    // Layered oscillators for punchy kick
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc1.type = 'sine';
    osc2.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, time);
    filter.Q.setValueAtTime(1, time);

    // Main low frequency
    osc1.frequency.setValueAtTime(150, time);
    osc1.frequency.exponentialRampToValueAtTime(40, time + 0.5);

    // Sub frequency for depth
    osc2.frequency.setValueAtTime(75, time);
    osc2.frequency.exponentialRampToValueAtTime(20, time + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(1.2, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.5);
    osc2.stop(time + 0.5);
  }

  private playSnare(time: number): void {
    // Tone component (body)
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);

    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);

    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.2);

    // Noise component (snares)
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.audioContext.createGain();

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.start(time);
    noise.stop(time + 0.2);
  }

  private playHiHat(time: number): void {
    // Pure noise with tight high-pass filter
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);
    filter.Q.setValueAtTime(1, time);

    const gainNode = this.audioContext.createGain();

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    noise.start(time);
    noise.stop(time + 0.1);
  }

  private playTom(time: number, frequency: number, duration: number): void {
    // Two layered oscillators for fuller tom sound
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc1.type = 'sine';
    osc2.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);

    osc1.frequency.setValueAtTime(frequency, time);
    osc1.frequency.exponentialRampToValueAtTime(frequency * 0.3, time + duration);

    osc2.frequency.setValueAtTime(frequency * 1.5, time);
    osc2.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      time + duration
    );

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(0.9, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  private playCrash(time: number): void {
    // Multiple oscillators and noise for cymbal complexity
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.Q.setValueAtTime(0.5, time);

    const gainNode = this.audioContext.createGain();

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.3, time + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1.2);

    noise.start(time);
    noise.stop(time + 1.5);
  }

  private playRide(time: number): void {
    // Metallic tone with noise
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, time);
    filter.Q.setValueAtTime(2, time);

    const gainNode = this.audioContext.createGain();

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(0.4, time);
    gainNode.gain.exponentialRampToValueAtTime(0.2, time + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.8);

    noise.start(time);
    noise.stop(time + 1);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    // Calculate delta time
    const currentTime = performance.now() / 1000; // Convert to seconds
    const deltaTime = this.lastFrameTime === 0 ? 0 : currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update particles
    this.updateParticles(deltaTime);

    // Update drumstick animations
    this.updateDrumsticks(deltaTime);

    // Update kick pedal animation
    this.updateKickPedal(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the drum simulator
new DrumSimulator();
