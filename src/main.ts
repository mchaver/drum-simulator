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

class DrumSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private drumPieces: DrumPiece[] = [];
  private audioContext: AudioContext;

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

    // Setup scene
    this.setupLights();
    this.createDrumSet();
    this.createGround();

    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

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

    // Crash cymbal (right, higher)
    this.createCymbal(1.5, 1.8, 0, 0.5, 0xffaa00, 'D', 'Crash');
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
  }

  private playSound(drumName: string): void {
    // Create a simple synthesized drum sound
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Different sounds for different drums
    switch (drumName) {
      case 'Kick':
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        break;
      case 'Snare':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, now);
        gainNode.gain.setValueAtTime(0.7, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'Hi-Hat':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(8000, now);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        break;
      case 'Tom 1':
        oscillator.frequency.setValueAtTime(180, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.4);
        gainNode.gain.setValueAtTime(0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        break;
      case 'Tom 2':
        oscillator.frequency.setValueAtTime(140, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, now + 0.4);
        gainNode.gain.setValueAtTime(0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        break;
      case 'Crash':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(4000, now);
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        break;
    }

    oscillator.start(now);
    oscillator.stop(now + 1);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    // Subtle camera movement for that PS1 wobble
    const time = Date.now() * 0.0001;
    this.camera.position.x = Math.sin(time) * 0.1;

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the drum simulator
new DrumSimulator();
