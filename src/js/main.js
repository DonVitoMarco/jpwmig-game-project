var sceneWidth;
var sceneHeight;
var camera;
var scene;
var renderer;
var dom;
var sun;
var ground;
var rollingGroundSphere;
var heroSphere;
var rollingSpeed = 0.004;
var heroRollingSpeed;
var worldRadius = 26;
var heroRadius = 0.1;
var sphericalHelper;
var pathAngleValues;
var heroBaseY = 2.0;
var leftLane = -1;
var rightLane = 1;
var middleLane = 0;
var currentLane;
var clock;
var blockReleaseInterval = 0.5;
var blocksInPath;
var blocksPool;
var particleGeometry;
var particleCount = 20;
var explosionPower = 1.09;
var particles;
var score;
var scoreText;

// start app
init();

// init function
function init() {
    // set up the scene
    createScene();

    // game loop
    update();
}

function createScene() {
    // blocks
    blocksInPath = [];
    blocksPool = [];
    sphericalHelper = new THREE.Spherical();
    pathAngleValues = [1.52, 1.57, 1.62];
    createBlockPool();

    // resize window
    window.addEventListener('resize', onWindowResize, false);

    // create clock
    clock = new THREE.Clock();
    clock.start();

    var loader = new THREE.TextureLoader();
    var texture = loader.load('img/stars.png');

    // create scene
    sceneWidth = window.innerWidth;
    sceneHeight = window.innerHeight;
    scene = new THREE.Scene();
    scene.background = texture;
    scene.fog = new THREE.FogExp2(0xf0fff0, 0.12);

    // create camera
    camera = new THREE.PerspectiveCamera(60, sceneWidth / sceneHeight, 0.1, 1000);
    camera.position.z = 6.5;
    camera.position.y = 2.5;

    // renderer
    renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setClearColor(0xfffaaa, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(sceneWidth, sceneHeight);
    dom = document.getElementById('game-container');
    dom.appendChild(renderer.domElement);

    // init world
    addExplosion();
    addLight();
    addWorld();
    addHero();
    addBlocks();

    // controls
    document.onkeydown = handleKeyDown;

    // score
    score = 0;
    scoreText = document.createElement('div');
    scoreText.style.position = 'absolute';
    scoreText.style.width = 200;
    scoreText.style.height = 200;
    scoreText.style.fontSize = 100 + 'px';
    scoreText.style.color = 'yellow';
    scoreText.style.top = 50 + 'px';
    scoreText.style.left = 50 + 'px';
    document.body.appendChild(scoreText);

    // audio
    var listener = new THREE.AudioListener();
    camera.add(listener);

    var sound = new THREE.Audio(listener);

    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('music/sound.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });

}

function addWorld() {
    var sides = 40;
    var tiers = 40;

    var sphereGeometry = new THREE.SphereGeometry(worldRadius, sides, tiers);
    var sphereMaterial = new THREE.MeshStandardMaterial(
        {
            color: 0xfffafa,
            shading: THREE.FlatShading
        }
    );

    var vertexIndex;
    var vertexVector = new THREE.Vector3();
    var nextVertexVector = new THREE.Vector3();
    var firstVertexVector = new THREE.Vector3();
    var offset = new THREE.Vector3();
    var currentTier = 1;
    var lerpValue = 0.5;
    var heightValue;
    var maxHeight = 0.07;
    for (var j = 1; j < tiers - 2; j++) {
        currentTier = j;
        for (var i = 0; i < sides; i++) {
            vertexIndex = (currentTier * sides) + 1;
            vertexVector = sphereGeometry.vertices[i + vertexIndex].clone();
            if (j % 2 !== 0) {
                if (i == 0) {
                    firstVertexVector = vertexVector.clone();
                }
                nextVertexVector = sphereGeometry.vertices[i + vertexIndex + 1].clone();
                if (i == sides - 1) {
                    nextVertexVector = firstVertexVector;
                }
                lerpValue = (Math.random() * (0.75 - 0.25)) + 0.25;
                vertexVector.lerp(nextVertexVector, lerpValue);
            }
            heightValue = (Math.random() * maxHeight) - (maxHeight / 2);
            offset = vertexVector.clone().normalize().multiplyScalar(heightValue);
            sphereGeometry.vertices[i + vertexIndex] = (vertexVector.add(offset));
        }
    }

    rollingGroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(rollingGroundSphere);
    rollingGroundSphere.position.y = -24;
    rollingGroundSphere.rotation.z = -Math.PI / 2;
    rollingGroundSphere.position.z = 2;
}

function addHero() {
    currentLane = middleLane;
    var sphereGeometry = new THREE.OctahedronGeometry(heroRadius, 1);
    var sphereMaterial = new THREE.MeshStandardMaterial({color: 0xf44e4e, shading: THREE.FlatShading});
    heroSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    heroSphere.position.y = heroBaseY;
    heroSphere.position.z = 4.8;
    heroSphere.position.x = currentLane;
    heroSphere.castShadow = true;
    heroSphere.receiveShadow = false;
    scene.add(heroSphere);
}

function addLight() {
    // light
    var hemisphereLight = new THREE.HemisphereLight(0xfffafa, 0x000000, .9);
    scene.add(hemisphereLight);
    // sun
    sun = new THREE.DirectionalLight(0xcdc1c5, .9, 100);
    sun.position.set(12, 6, -7);
    scene.add(sun);

    sun.shadow.mapSize.width = 256;
    sun.shadow.mapSize.height = 256;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
}

function createBlockPool() {
    var maxBlocksInPool = 45;
    var newBlock;
    for (var i = 0; i < maxBlocksInPool; i++) {
        newBlock = createBlock();
        blocksPool.push(newBlock);
    }
}

function addBlocks() {
    var numBlocks = 36;
    var gap = 6.28 / 36;
    for (var i = 0; i < numBlocks; i++) {
        addBlock(false, i * gap, true);
        addBlock(false, i * gap, false);
    }
}

function addBlock(inPath, row, isLeft) {
    var newBlock;
    if (inPath) {
        if (blocksPool.length == 0) {
            return;
        }
        newBlock = blocksPool.pop();
        newBlock.visible = true;
        blocksInPath.push(newBlock);
        sphericalHelper.set(worldRadius - 0.3, pathAngleValues[row], rollingGroundSphere.rotation.x + 4);
    } else {
        newBlock = createBlock();
        var areaAngle = 0;
        if (isLeft) {
            areaAngle = 1.68 + Math.random() * 0.1;
        } else {
            areaAngle = 1.46 - Math.random() * 0.1;
        }
        sphericalHelper.set(worldRadius - 0.3, areaAngle, row);
    }
    newBlock.position.setFromSpherical(sphericalHelper);
    var rollingGroundVector = rollingGroundSphere.position.clone().normalize();
    var blockVector = newBlock.position.clone().normalize();
    newBlock.quaternion.setFromUnitVectors(blockVector, rollingGroundVector);
    newBlock.rotation.x += (Math.random() * (2 * Math.PI / 10) + -Math.PI / 10);
    rollingGroundSphere.add(newBlock);
}

function addPathBlock() {
    var options = [0, 1, 2];
    var lane = Math.floor(Math.random() * 3);
    addBlock(true, lane);
}

function createBlock() {
    var blockMaterial = new THREE.MeshStandardMaterial({color: 0x33ff33, shading: THREE.FlatShading});
    var blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    var block = new THREE.Mesh(blockGeometry, blockMaterial);
    return block;
}


function update() {
    rollingGroundSphere.rotation.x += rollingSpeed;

    heroSphere.position.x = THREE.Math.lerp(heroSphere.position.x, currentLane, 2 * clock.getDelta());


    if (clock.getElapsedTime() > 1.5) {
        clock.start();
        score++;
        scoreText.innerHTML = score.toString();
        addPathBlock();
    }

    doBlockLogic();
    doExplosionLogic();
    render();
    requestAnimationFrame(update);
}

function render() {
    // draw
    renderer.render(scene, camera);
}

function doBlockLogic() {
    var oneBlock;
    var blockPosition = new THREE.Vector3();

    blocksInPath.forEach(function (element, index) {
        oneBlock = blocksInPath[index];
        blockPosition.setFromMatrixPosition(oneBlock.matrixWorld);
        if (blockPosition.z > 6 && oneBlock.visible) {

        } else {
            if (blockPosition.distanceTo(heroSphere.position) <= 0.8) {
                score = 0;
                scoreText.innerHTML = score.toString();
                explode();
            }
        }
    })
}

function addExplosion() {
    particleGeometry = new THREE.Geometry();
    for (var i = 0; i < particleCount; i++) {
        var vertex = new THREE.Vector3();
        particleGeometry.vertices.push(vertex);
    }
    var pMaterial = new THREE.ParticleBasicMaterial({
        color: 0xfffafa,
        size: 0.2
    });
    particles = new THREE.Points(particleGeometry, pMaterial);
    scene.add(particles);
    particles.visible = false;
}

function doExplosionLogic() {
    if (!particles.visible) return;
    for (var i = 0; i < particleCount; i++) {
        particleGeometry.vertices[i].multiplyScalar(explosionPower);
    }
    if (explosionPower > 1.005) {
        explosionPower -= 0.001;
    } else {
        particles.visible = false;
    }
    particleGeometry.verticesNeedUpdate = true;
}

function explode() {
    var crashListener = new THREE.AudioListener();
    camera.add(crashListener);

    var sound = new THREE.Audio(crashListener);

    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('music/crash.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setVolume(0.3);
        sound.play();
    });

    particles.position.y = 2;
    particles.position.z = 4.8;
    particles.position.x = heroSphere.position.x;
    for (var i = 0; i < particleCount; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = -0.2 + Math.random() * 0.4;
        vertex.y = -0.2 + Math.random() * 0.4;
        vertex.z = -0.2 + Math.random() * 0.4;
        particleGeometry.vertices[i] = vertex;
    }
    explosionPower = 1.07;
    particles.visible = true;
}

function onWindowResize() {
    sceneHeight = window.innerHeight;
    sceneWidth = window.innerWidth;
    renderer.setSize(sceneWidth, sceneHeight);
    camera.aspect = sceneWidth / sceneHeight;
    camera.updateProjectionMatrix();
}

function handleKeyDown(keyEvent) {
    var validMove = true;
    // left
    if (keyEvent.keyCode === 37) {
        if (currentLane == middleLane) {
            currentLane = leftLane;
        } else if (currentLane == rightLane) {
            currentLane = middleLane;
        } else {
            validMove = false;
        }
    }
    // right
    else if (keyEvent.keyCode === 39) {
        if (currentLane == middleLane) {
            currentLane = rightLane;
        } else if (currentLane == leftLane) {
            currentLane = middleLane;
        } else {
            validMove = false;
        }
    }
}