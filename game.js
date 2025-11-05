// Meditative Game Experience
// A journey of self-discovery and acceptance

// Global variables
let scene, camera, renderer, player, fog;
let mouse = { x: 0, y: 0 };
let targetPosition = { x: 0, z: 0 };
let currentPhase = 1;
let playerColor = new THREE.Color(0x808080); // Start gray
let trails = [];
let colorSpheres = [];
let yellowSphere = null;
let bridge = null;
let graySelf = null;
let hasMerged = false;
let isAscending = false;
let door = null;
let phase4StartTime = null;
let phase4PauseDuration = 2000; // 2 seconds pause

// Phase management
const phases = {
    1: { caption: "It's okay to feel lost.", prompt: "Move your cursor to guide the sphere • Touch the door to continue" },
    2: { caption: "Choose the color that feels like you.", prompt: "Hover over a color and click to select" },
    3: { caption: "", prompt: "Approach or observe" },
    4: { caption: "If you fall, I'll catch you.", prompt: "Cross the bridge carefully • Reach the door on the right" },
    5: { caption: "Can we hug?", prompt: "Approach your past self" }
};

// Initialize the scene
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd0d0d0);

    // Camera - top-down with slight angle
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Fog for Phase 1
    fog = new THREE.Fog(0xd0d0d0, 10, 30);
    scene.fog = fog;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // Ground plane (foggy gray)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xb8b8b8,
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Create player sphere with sad face
    createPlayer();

    // Mouse/touch events
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('click', onClick, false);

    // Window resize
    window.addEventListener('resize', onWindowResize, false);

    // Show initial caption
    showCaption(phases[1].caption);

    // Show follow-up message after a pause
    setTimeout(() => {
        showCaption("Go forward when you're ready. I'm at your back.", 0);
        // Create the door after this message
        createDoor();
    }, 4000);

    // Show interaction prompt
    setTimeout(() => {
        showPrompt(phases[1].prompt);
    }, 7000);

    // Start animation loop
    animate();
}

// Create glowing white door
function createDoor() {
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.3);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0
    });
    door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, -8); // Position at the top (back) of the screen
    door.castShadow = true;
    scene.add(door);

    // Add a point light to make it glow
    const doorLight = new THREE.PointLight(0xffffff, 1, 10);
    doorLight.position.copy(door.position);
    door.userData.light = doorLight;
    scene.add(doorLight);

    // Fade in the door
    let fadeIn = setInterval(() => {
        if (door && door.material.opacity < 1) {
            door.material.opacity += 0.02;
        } else {
            clearInterval(fadeIn);
        }
    }, 30);
}

// Create player sphere with face
function createPlayer() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);

    // Create canvas for face texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw sad face :(
    ctx.fillStyle = '#606060';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#404040';
    // Left eye
    ctx.beginPath();
    ctx.arc(180, 200, 20, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(332, 200, 20, 0, Math.PI * 2);
    ctx.fill();
    // Sad mouth :( - downward curve
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(256, 280, 60, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshStandardMaterial({
        color: playerColor,
        map: texture,
        roughness: 0.9,
        metalness: 0.1
    });

    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0.5, 0);
    player.castShadow = true;
    player.userData.rotation = { x: 0, z: 0 }; // Track rotation for rolling effect
    scene.add(player);
}

// Update face texture based on phase
function updatePlayerFace(faceType) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background color based on current player color
    ctx.fillStyle = '#' + playerColor.getHexString();
    ctx.fillRect(0, 0, 512, 512);

    // Determine face color (darker version of player color)
    const faceColor = new THREE.Color(playerColor).multiplyScalar(0.6);
    ctx.fillStyle = '#' + faceColor.getHexString();

    if (faceType === 'sad') {
        // Left eye
        ctx.beginPath();
        ctx.arc(180, 200, 20, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.arc(332, 200, 20, 0, Math.PI * 2);
        ctx.fill();
        // Sad mouth :( - downward curve
        ctx.strokeStyle = '#' + faceColor.getHexString();
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(256, 280, 60, 0.3 * Math.PI, 0.7 * Math.PI);
        ctx.stroke();
    } else if (faceType === 'neutral') {
        // Left eye
        ctx.beginPath();
        ctx.arc(180, 210, 20, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.arc(332, 210, 20, 0, Math.PI * 2);
        ctx.fill();
        // Neutral mouth - straight line
        ctx.fillStyle = '#' + faceColor.getHexString();
        ctx.fillRect(200, 300, 112, 12);
    } else if (faceType === 'happy') {
        // Left eye
        ctx.beginPath();
        ctx.arc(180, 200, 20, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.arc(332, 200, 20, 0, Math.PI * 2);
        ctx.fill();
        // Happy mouth :) - upward curve
        ctx.strokeStyle = '#' + faceColor.getHexString();
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(256, 320, 60, 1.3 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    player.material.map = texture;
    player.material.needsUpdate = true;
}

// Mouse movement handler
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Convert mouse position to 3D world position
    if (currentPhase === 1 || currentPhase === 2 || currentPhase === 3 || currentPhase === 4 || currentPhase === 5) {
        // Check if Phase 4 is in pause period
        if (currentPhase === 4 && phase4StartTime) {
            const elapsed = Date.now() - phase4StartTime;
            if (elapsed < phase4PauseDuration) {
                // Still in pause, don't update target position
                return;
            }
        }

        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.y / dir.y;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));

        targetPosition.x = pos.x;
        targetPosition.z = pos.z;

        // Limit movement range
        const maxRange = currentPhase === 4 ? 12 : 8;
        targetPosition.x = Math.max(-maxRange, Math.min(maxRange, targetPosition.x));
        targetPosition.z = Math.max(-maxRange, Math.min(maxRange, targetPosition.z));
    }
}

// Click handler
function onClick(event) {
    if (currentPhase === 2 && colorSpheres.length > 0) {
        // Use raycaster to detect click on color spheres
        const raycaster = new THREE.Raycaster();
        const mouseVec = new THREE.Vector2(mouse.x, mouse.y);
        raycaster.setFromCamera(mouseVec, camera);

        const intersects = raycaster.intersectObjects(colorSpheres);
        if (intersects.length > 0) {
            const clickedSphere = intersects[0].object;
            selectColor(clickedSphere.userData.color);
        }
    }
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Show caption text
function showCaption(text, duration = 3000) {
    const caption = document.getElementById('caption');
    caption.textContent = text;
    caption.classList.remove('visible');

    setTimeout(() => {
        caption.classList.add('visible');
    }, 100);

    if (duration > 0) {
        setTimeout(() => {
            caption.classList.remove('visible');
        }, duration);
    }
}

// Show interaction prompt
function showPrompt(text) {
    const prompt = document.getElementById('interaction-prompt');
    prompt.textContent = text;
    prompt.classList.add('visible');
}

// Hide prompt
function hidePrompt() {
    const prompt = document.getElementById('interaction-prompt');
    prompt.classList.remove('visible');
}

// Create trail effect
function createTrail() {
    if (Math.random() < 0.3) { // Only create trail occasionally
        const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: playerColor,
            transparent: true,
            opacity: 0.3
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.position.copy(player.position);
        trail.position.y = 0.1;
        trail.userData.life = 1.0;
        scene.add(trail);
        trails.push(trail);
    }
}

// Update trails (fade out)
function updateTrails() {
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        trail.userData.life -= 0.01;
        trail.material.opacity = trail.userData.life * 0.3;

        if (trail.userData.life <= 0) {
            scene.remove(trail);
            trails.splice(i, 1);
        }
    }
}

// Phase 2: Create color selection spheres
function startPhase2() {
    currentPhase = 2;

    // Ensure camera is looking at center where player is
    camera.lookAt(0, 0, 0);

    // Clear fog slightly
    scene.fog.near = 15;
    scene.fog.far = 40;

    // Change face to neutral
    updatePlayerFace('neutral');

    // Create floating color spheres - positioned at top, left, right, bottom
    const colors = [
        { color: 0xffe66d, position: { x: 0, y: 2.5, z: -5 } },   // Yellow (top)
        { color: 0xff6b6b, position: { x: -5, y: 2.5, z: 0 } },   // Red (left)
        { color: 0x4ecdc4, position: { x: 5, y: 2.5, z: 0 } },    // Blue (right)
        { color: 0xc492e8, position: { x: 0, y: 2.5, z: 5 } }     // Purple (bottom)
    ];

    colors.forEach(colorData => {
        const geometry = new THREE.SphereGeometry(0.6, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: colorData.color,
            emissive: colorData.color,
            emissiveIntensity: 0.2,
            roughness: 0.5,
            metalness: 0.2,
            transparent: true,
            opacity: 0
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(colorData.position.x, colorData.position.y, colorData.position.z);
        sphere.userData.color = colorData.color;
        sphere.userData.baseY = colorData.position.y;
        sphere.userData.time = Math.random() * Math.PI * 2;
        sphere.userData.fadingIn = true;
        sphere.userData.targetOpacity = 1.0;
        scene.add(sphere);
        colorSpheres.push(sphere);
    });

    // Wait a moment before showing first caption (like Phase 1)
    setTimeout(() => {
        showCaption(phases[2].caption);
    }, 500);

    // Show apology caption after first caption (matching Phase 1 pattern)
    setTimeout(() => {
        showCaption("Sorry if your color is not here.", 0);
    }, 4000);

    // Show prompt (matching Phase 1 timing)
    setTimeout(() => {
        showPrompt(phases[2].prompt);
    }, 7000);
}

// Get color name from hex value
function getColorName(colorHex) {
    const colorMap = {
        0xffe66d: "Yellow",
        0xff6b6b: "Red",
        0x4ecdc4: "Blue",
        0xc492e8: "Purple"
    };
    return colorMap[colorHex] || "Color";
}

// Select a color
function selectColor(color) {
    playerColor = new THREE.Color(color);
    player.material.color = playerColor;
    updatePlayerFace('happy');

    // Create ripple effect
    createRipple();

    // Remove all spheres immediately
    colorSpheres.forEach(sphere => {
        scene.remove(sphere);
    });
    colorSpheres = [];

    hidePrompt();

    // Show color name caption first
    const colorName = getColorName(color);
    setTimeout(() => {
        showCaption(`${colorName} looks great on you...`, 0);
    }, 500);

    // Show affirmation caption after
    setTimeout(() => {
        showCaption("Always be who you are, I love you.", 0);
    }, 3500);

    // Create door at the top after both captions
    setTimeout(() => {
        const doorGeometry = new THREE.BoxGeometry(2, 3, 0.3);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0
        });
        door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.5, -8); // Position at the top (back) of the screen
        door.castShadow = true;
        scene.add(door);

        // Add a point light to make it glow
        const doorLight = new THREE.PointLight(0xffffff, 0, 10);
        doorLight.position.copy(door.position);
        door.userData.light = doorLight;
        scene.add(doorLight);

        // Fade in the door
        let fadeIn = setInterval(() => {
            if (door && door.material.opacity < 1) {
                door.material.opacity += 0.02;
                if (door.userData.light) {
                    door.userData.light.intensity = door.material.opacity;
                }
            } else {
                clearInterval(fadeIn);
            }
        }, 30);
    }, 6000);
}

// Create ripple effect
function createRipple() {
    const geometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const material = new THREE.MeshBasicMaterial({
        color: playerColor,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(geometry, material);
    ripple.position.copy(player.position);
    ripple.position.y = 0.1;
    ripple.rotation.x = -Math.PI / 2;
    ripple.userData.scale = 1;
    ripple.userData.isRipple = true;
    scene.add(ripple);
}

// Fade out sphere
function fadeOutSphere(sphere) {
    sphere.userData.fadingOut = true;
}

// Phase 3: Yellow sphere encounter
function startPhase3() {
    currentPhase = 3;

    // Clear fog more
    scene.fog.near = 20;
    scene.fog.far = 50;

    // Change background to lighter
    scene.background = new THREE.Color(0xe8e8e8);

    // Create yellow sphere in the distance
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.3,
        roughness: 0.7,
        metalness: 0.2
    });
    yellowSphere = new THREE.Mesh(geometry, material);
    yellowSphere.position.set(8, 0.5, 8);
    yellowSphere.castShadow = true;
    scene.add(yellowSphere);

    setTimeout(() => {
        showPrompt(phases[3].prompt);
    }, 1000);
}

// Phase 4: The Bridge
function startPhase4() {
    currentPhase = 4;
    phase4StartTime = Date.now(); // Start pause timer

    // Remove any remaining objects
    if (yellowSphere) {
        scene.remove(yellowSphere);
        yellowSphere = null;
    }

    // Reset player position - start closer to center
    player.position.set(-10, 0.5, 0);
    targetPosition.x = -10;
    targetPosition.z = 0;

    // Remove ground and add reflective plane
    const ground = scene.getObjectByName('ground');
    if (ground) {
        scene.remove(ground);
    }

    const reflectiveGeometry = new THREE.PlaneGeometry(100, 100);
    const reflectiveMaterial = new THREE.MeshStandardMaterial({
        color: playerColor,
        roughness: 0.3,
        metalness: 0.7,
        opacity: 0.3,
        transparent: true
    });
    const reflectivePlane = new THREE.Mesh(reflectiveGeometry, reflectiveMaterial);
    reflectivePlane.rotation.x = -Math.PI / 2;
    reflectivePlane.position.y = -1;
    reflectivePlane.receiveShadow = true;
    scene.add(reflectivePlane);

    // Create bridge - shorter and more centered
    const bridgeGeometry = new THREE.BoxGeometry(25, 0.2, 1.5);
    const bridgeMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        emissive: playerColor,
        emissiveIntensity: 0.1,
        roughness: 0.6,
        metalness: 0.3
    });
    bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    bridge.position.set(0, 0.3, 0);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    scene.add(bridge);

    // Create glowing door on the right side (start invisible, will fade in)
    const doorGeometry = new THREE.BoxGeometry(0.5, 4, 1.5);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0
    });
    door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(10, 2, 0);
    door.castShadow = true;
    scene.add(door);

    // Add a point light to make the door glow
    const doorLight = new THREE.PointLight(0xffd700, 0, 15);
    doorLight.position.copy(door.position);
    door.userData.light = doorLight;
    scene.add(doorLight);

    // Fade in the door
    let doorFadeIn = setInterval(() => {
        if (door && door.material.opacity < 1) {
            door.material.opacity += 0.02;
            if (door.userData.light) {
                door.userData.light.intensity = door.material.opacity * 2;
            }
        } else {
            clearInterval(doorFadeIn);
        }
    }, 30);

    // Change background to white
    scene.background = new THREE.Color(0xfafafa);
    scene.fog = null;

    showCaption(phases[4].caption);
    // Show prompt after the 3-second pause
    setTimeout(() => {
        showPrompt(phases[4].prompt);
    }, phase4PauseDuration);
}

// Check if player is on bridge
function checkBridgeBounds() {
    if (currentPhase === 4 && bridge) {
        const onBridge = Math.abs(player.position.z) < 0.75 &&
                        player.position.x > -12.5 &&
                        player.position.x < 12.5;

        if (!onBridge && player.position.y > -5) {
            // Player fell off - faster fall
            player.position.y -= 0.15;
            player.material.opacity = Math.max(0, player.material.opacity - 0.06);
            player.material.transparent = true;

            if (player.position.y <= -5) {
                // Reset - respawn closer to center
                player.position.set(-10, 0.5, 0);
                player.material.opacity = 1.0;
                targetPosition.x = -10;
                targetPosition.z = 0;
                // Restart pause timer for respawn
                phase4StartTime = Date.now();
            }
        } else if (door) {
            // Check if player reached the door
            const doorDistance = player.position.distanceTo(door.position);
            if (doorDistance < 3) {
                // Player reached the door
                hidePrompt();

                // Remove door and its light
                if (door.userData.light) {
                    scene.remove(door.userData.light);
                }
                scene.remove(door);
                door = null;

                setTimeout(() => {
                    startPhase5();
                }, 1000);
            }
        }
    }
}

// Phase 5: Reunion and Ascension
function startPhase5() {
    currentPhase = 5;

    // Remove bridge
    if (bridge) {
        scene.remove(bridge);
        bridge = null;
    }

    // Reset player position
    player.position.set(-3, 0.5, 0);
    targetPosition.x = -3;
    targetPosition.z = 0;

    // Create gray version of self
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const grayMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.9,
        metalness: 0.1
    });
    graySelf = new THREE.Mesh(geometry, grayMaterial);
    graySelf.position.set(3, 0.5, 0);
    graySelf.castShadow = true;
    scene.add(graySelf);

    showCaption(phases[5].caption, 0); // Keep visible
    setTimeout(() => {
        showPrompt(phases[5].prompt);
    }, 2000);
}

// Check proximity to gray self
function checkGraySelfProximity() {
    if (currentPhase === 5 && graySelf && !hasMerged && !isAscending) {
        const distance = player.position.distanceTo(graySelf.position);

        if (distance < 1.2) {
            // Merge!
            hasMerged = true;
            hidePrompt();
            mergeSpheres();
        }
    }
}

// Merge spheres and ascend
function mergeSpheres() {
    // Create light effect
    const light = new THREE.PointLight(playerColor, 2, 10);
    light.position.copy(player.position);
    scene.add(light);

    // Fade out gray self
    let fadeInterval = setInterval(() => {
        if (graySelf) {
            graySelf.material.opacity -= 0.02;
            graySelf.material.transparent = true;

            if (graySelf.material.opacity <= 0) {
                scene.remove(graySelf);
                graySelf = null;
                clearInterval(fadeInterval);
            }
        }
    }, 30);

    // Show final message
    setTimeout(() => {
        showCaption("Well… I will be seeing you, perhaps again, someday.", 0);
    }, 2000);

    // Start ascension
    setTimeout(() => {
        isAscending = true;
    }, 5000);

    // Final message
    setTimeout(() => {
        showCaption("I love you.", 0);
    }, 10000);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (!player) return;

    // Smooth movement toward target
    const speed = 0.03;
    const dx = targetPosition.x - player.position.x;
    const dz = targetPosition.z - player.position.z;

    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        player.position.x += dx * speed;
        player.position.z += dz * speed;

        // Rolling effect - rotate sphere based on movement
        const moveDistance = Math.sqrt(dx * dx + dz * dz);
        if (moveDistance > 0.01) {
            const rotationSpeed = speed * 2;
            player.rotation.x += dz * rotationSpeed;
            player.rotation.z -= dx * rotationSpeed;
        }

        // Create trail in Phase 1
        if (currentPhase === 1) {
            createTrail();
        }
    }

    // Update trails
    updateTrails();

    // Check door collision in Phase 1
    if (currentPhase === 1 && door) {
        const doorDistance = player.position.distanceTo(door.position);
        if (doorDistance < 2) {
            // Player touched the door - teleport to Phase 2
            hidePrompt();

            // Fade out door
            if (door.userData.light) {
                scene.remove(door.userData.light);
            }
            scene.remove(door);
            door = null;

            // Teleport to center and start Phase 2
            player.position.set(0, 0.5, 0);
            targetPosition.x = 0;
            targetPosition.z = 0;

            setTimeout(() => {
                startPhase2();
            }, 500);
        }
    }

    // Phase-specific updates
    if (currentPhase === 2) {
        // Use raycaster to detect mouse hover over color spheres
        const raycaster = new THREE.Raycaster();
        const mouseVec = new THREE.Vector2(mouse.x, mouse.y);
        raycaster.setFromCamera(mouseVec, camera);

        const intersects = raycaster.intersectObjects(colorSpheres);
        const hoveredSphere = intersects.length > 0 ? intersects[0].object : null;

        // Animate color spheres (gentle floating)
        colorSpheres.forEach(sphere => {
            sphere.userData.time += 0.02;
            sphere.position.y = sphere.userData.baseY + Math.sin(sphere.userData.time) * 0.2;

            // Fade in animation
            if (sphere.userData.fadingIn) {
                sphere.material.opacity += 0.015;
                if (sphere.material.opacity >= sphere.userData.targetOpacity) {
                    sphere.material.opacity = sphere.userData.targetOpacity;
                    sphere.userData.fadingIn = false;
                }
            }

            // Check if this sphere is being hovered
            const isHovered = sphere === hoveredSphere;
            sphere.userData.isHovered = isHovered;

            // Make sphere lighter when cursor hovers over it
            if (isHovered && !sphere.userData.fadingIn) {
                // Brighten the color - multiply by 1.3 to make it lighter
                const baseColor = new THREE.Color(sphere.userData.color);
                sphere.material.color.copy(baseColor).multiplyScalar(1.3);
                sphere.material.emissiveIntensity = 0.5;
            } else if (!sphere.userData.fadingIn) {
                // Reset to original color
                sphere.material.color.setHex(sphere.userData.color);
                sphere.material.emissiveIntensity = 0.2;
            }
        });

        // Check door collision after color selection
        if (door && colorSpheres.length === 0) {
            const doorDistance = player.position.distanceTo(door.position);
            if (doorDistance < 2) {
                // Player touched the door - go to Phase 3
                hidePrompt();

                // Fade out door
                if (door.userData.light) {
                    scene.remove(door.userData.light);
                }
                scene.remove(door);
                door = null;

                setTimeout(() => {
                    startPhase3();
                }, 500);
            }
        }
    }

    if (currentPhase === 3 && yellowSphere) {
        // Move yellow sphere slowly toward player
        const direction = new THREE.Vector3().subVectors(player.position, yellowSphere.position).normalize();
        yellowSphere.position.add(direction.multiplyScalar(0.01));

        // Check for merge
        const distance = player.position.distanceTo(yellowSphere.position);
        if (distance < 1.5) {
            // Merge - increase saturation
            player.material.color.multiplyScalar(1.5);

            // Create glow
            const glowLight = new THREE.PointLight(0xffd700, 1.5, 10);
            glowLight.position.copy(player.position);
            scene.add(glowLight);

            showCaption("Hope you feel better.", 3000);
            hidePrompt();

            // Remove yellow sphere
            setTimeout(() => {
                scene.remove(yellowSphere);
                yellowSphere = null;
                // Move to Phase 4
                setTimeout(() => {
                    startPhase4();
                }, 3000);
            }, 1000);
        } else if (distance > 15) {
            // Drifted past
            showCaption("There's always tough times in life.", 3000);
            hidePrompt();
            scene.remove(yellowSphere);
            yellowSphere = null;
            setTimeout(() => {
                startPhase4();
            }, 4000);
        }
    }

    if (currentPhase === 4) {
        checkBridgeBounds();
    }

    if (currentPhase === 5) {
        checkGraySelfProximity();

        // Ascension
        if (isAscending) {
            player.position.y += 0.015;

            // Create light trail during ascension
            if (Math.random() < 0.2) {
                const trailGeometry = new THREE.SphereGeometry(0.08, 8, 8);
                const trailMaterial = new THREE.MeshBasicMaterial({
                    color: playerColor,
                    transparent: true,
                    opacity: 0.5
                });
                const trail = new THREE.Mesh(trailGeometry, trailMaterial);
                trail.position.copy(player.position);
                trail.userData.life = 1.0;
                scene.add(trail);
                trails.push(trail);
            }

            // Fade out as it ascends
            if (player.position.y > 15) {
                player.material.opacity -= 0.005;
                player.material.transparent = true;

                if (player.material.opacity <= 0) {
                    scene.remove(player);
                }
            }
        }
    }

    // Update ripples
    const ripples = scene.children.filter(obj => obj.userData.isRipple);
    ripples.forEach(ripple => {
        ripple.userData.scale += 0.05;
        ripple.scale.set(ripple.userData.scale, ripple.userData.scale, 1);
        ripple.material.opacity -= 0.02;

        if (ripple.material.opacity <= 0) {
            scene.remove(ripple);
        }
    });

    renderer.render(scene, camera);
}

// Start the experience
init();
