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
    this.lookAtPoint = new THREE.Vector3(0, 1, 0);
    this.updateCameraPosition();

    // Setup scene
    this.setupLights();
    this.createDrumSet();
    this.createGround();

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
    // Kick drum (center, back)
    this.createDrum(0, 0.6, -0.5, 0.8, 0.6, 0xff4444, 'Q', 'Kick');

    // Snare (left front)
    this.createDrum(-1, 1.2, 0.5, 0.5, 0.3, 0xcccccc, 'W', 'Snare');

    // Hi-hat (left, higher)
    this.createCymbal(-1.5, 1.5, 0.3, 0.4, 0xffff00, 'E', 'Hi-Hat');

    // Tom 1 (left-center, higher)
    this.createDrum(-0.5, 1.3, -0.2, 0.45, 0.35, 0x4444ff, 'A', 'Tom 1');

    // Tom 2 (right-center, higher)
    this.createDrum(0.5, 1.3, -0.2, 0.45, 0.35, 0x44ff44, 'S', 'Tom 2');

    // Floor tom (right front, lower)
    this.createDrum(1.2, 0.9, 0.5, 0.55, 0.5, 0xff44ff, 'F', 'Floor Tom');

    // Crash cymbal (left-back, higher)
    this.createCymbal(1.5, 1.8, 0, 0.5, 0xffaa00, 'D', 'Crash');

    // Ride cymbal (right-back, higher)
    this.createCymbal(1.8, 1.6, -0.5, 0.55, 0xffdd44, 'R', 'Ride');
  }

  private createDrum(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    color: number,
    key: string,
    name: string
  ): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
    const material = new THREE.MeshPhongMaterial({
      color,
      ...PS1_MATERIAL_CONFIG,
    });
    const drum = new THREE.Mesh(geometry, material);
    drum.position.set(x, y, z);

    // Add a top surface
    const topGeometry = new THREE.CircleGeometry(radius, 8);
    const topMaterial = new THREE.MeshPhongMaterial({
      color: color * 0.7,
      ...PS1_MATERIAL_CONFIG,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, y + height / 2, z);

    this.scene.add(drum);
    this.scene.add(top);

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
    name: string
  ): void {
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.05, 16);
    const material = new THREE.MeshPhongMaterial({
      color,
      ...PS1_MATERIAL_CONFIG,
      shininess: 100,
    });
    const cymbal = new THREE.Mesh(geometry, material);
    cymbal.position.set(x, y, z);

    // Stand
    const standGeometry = new THREE.CylinderGeometry(0.02, 0.02, y - 0.5, 6);
    const standMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      ...PS1_MATERIAL_CONFIG,
    });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.set(x, y / 2, z);

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

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the drum simulator
new DrumSimulator();
