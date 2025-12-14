// game.js

const MAP_WIDTH = 1024;
const MAP_HEIGHT = 640;
const TILE_SIZE = 32;

// 1. DATOS DE LOS OBSTÁCULOS (Muros Invisibles)
const OBSTACLES_DATA = [
    { x: 0, y: 0, w: 370, h: 200 }, // Borde Superior 
    { x: 371, y: 0, w: 70, h: 150 },
    { x: 442, y: 0, w: 200, h: 140 },
    { x: 442, y: 300, w: 125, h: 80 },
    { x: 0, y: 0, w: 50, h: 640 },  // Borde Izquierdo
    { x: 800, y: 100, w: 100, h: 400 }  // Barranco
];

// DATOS DE PREGUNTAS
const QUESTIONS_DATA = [
  {
    x: 220, y: 385,
    type: "choice",
    question: "Quin és l'animal més ràpid de la selva?",
    options: ["Jaguar", "Lleó", "Elefant", "Tortuga"],
    correct: 0
  },
  {
    x: 650, y: 250,
    type: "text",
    question: "Què és allò que et pertany, però els altres ho utilitzen més que tu? Pista: 1 paraula i 3 lletres",
    answer: "nom"
  },
  {
    x: 390, y: 145,
    type: "text",
    question: "Què és tan fràgil que si ho anomenes es trenca?",
    answer: "silenci"
  },
  {
    x: 705, y: 400,
    type: "text",
    question: "Com es diu el planeta vermell?",
    answer: "marte"
  }
];

let isQuizOpen = false;
let currentQuestionData = null;
let lastDirection = "down";


function startGame(userData) {
  const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: window.innerWidth,
    height: window.innerHeight,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { 
          gravity: { y: 0 }, 
          debug: false // MANTÉN ESTO EN TRUE PARA VER LA CAJA MORADA (HITBOX) false no hitbox
      }
    },
    scene: { preload, create, update }
  };

  window.game = new Phaser.Game(config);

  function preload() {
    this.load.image("map_background", "assets/mapa_estatico.png");
    // ✅ Cargar la imagen del tótem definitivo
    this.load.image("totem_definitivo", "assets/totem_definitivo.png"); 
    
    // 🛑 CANVI CLAU 1: Carreguem la imatge estàtica
    this.load.image("main_character", "assets/main_character.png");
    
    // 🛑 Codi anterior del spritesheet DESACTIVAT/ELIMINAT
    /*
    this.load.spritesheet("player", "assets/personaje_principal.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 4,
      padding: 6
    });
    */
  }

  function create() {
    // Fondo
    this.add.image(0, 0, "map_background").setOrigin(0).setDepth(0);

    // ======================
    // 2. CREACIÓN DE MUROS
    // ======================
    this.wallsGroup = this.physics.add.staticGroup();

    OBSTACLES_DATA.forEach(obs => {
        const wall = this.add.rectangle(obs.x, obs.y, obs.w, obs.h, 0x0000ff, 0);
        wall.setOrigin(0, 0);
        this.physics.add.existing(wall, true);
        this.wallsGroup.add(wall);
    });

    // ======================
    // JUGADOR (SPRITE)
    // ======================
    
    this.ship = this.physics.add.sprite(500, 500, "main_character");
    this.ship.setDepth(2);
    // ✅ Mantenim escala 1.0 (Personatge gran)
    this.ship.setScale(1.0); 
    this.ship.setCollideWorldBounds(true);

    // HITBOX 
    // 🛑 CANVI CLAU 1: Mida de la Hitbox a 32x32
    this.ship.body.setSize(32, 32);
    // 🛑 CANVI CLAU 2: Offset ajustat per centrar la petita Hitbox a la base del personatge gran
    // Si la imatge és de 64x64, necessitem offset 16 (horitzontal) i 32 (vertical, per a la base)
    this.ship.body.setOffset(16, 32); 

    // 3. COLISIÓN JUGADOR vs MUROS
    this.physics.add.collider(this.ship, this.wallsGroup);

    // ======================
    // ZONAS INTERACTIVAS (Tótems y Hitbox)
    // ======================
    this.quizZones = this.physics.add.staticGroup();

    QUESTIONS_DATA.forEach(qData => {
      // 1. Añadir la imagen VISIBLE del tótem
      this.add.image(qData.x, qData.y, 'totem_definitivo').setDepth(1);
      
      // 2. Añadir el círculo INVISIBLE (hitbox) para la colisión/interacción
      const zone = this.add.circle(qData.x, qData.y, 20, 0x00ff00, 0); // Opacidad 0
      this.physics.add.existing(zone, true);
      zone.questionData = qData;
      this.quizZones.add(zone);
    });

    // Cámara
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.ship);
    this.cameras.main.setZoom(2.5);

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    createInteractionHint();
  }

  function update() {
    if (!this.ship) return;

    if (isQuizOpen) {
      this.ship.setVelocity(0, 0);
      return;
    }

    const speed = 100;
    let vx = 0, vy = 0;
    let moving = false;

    if (this.cursors.left.isDown) {
      vx = -speed;
      
      lastDirection = "left";
      moving = true;
    } else if (this.cursors.right.isDown) {
      vx = speed;
      
      lastDirection = "right";
      moving = true;
    } else if (this.cursors.up.isDown) {
      vy = -speed;
      
      lastDirection = "up";
      moving = true;
    } else if (this.cursors.down.isDown) {
      vy = speed;
      // 🛑 ELIMINADES: this.ship.anims.play()
      lastDirection = "down";
      moving = true;
    }

    // 🛑 ELIMINADES: Lògica per parar animació i frames IDLE
    // if (!moving) {
    //   this.ship.anims.stop();
    //   this.ship.setFrame(this.IDLE_FRAMES[lastDirection]);
    // }
    

    this.ship.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.ship.body.velocity.normalize().scale(speed);
    }

    // Detección Quiz
    let activeZone = null;
    this.physics.overlap(this.ship, this.quizZones, (_, zone) => activeZone = zone);

    const hintEl = document.getElementById("interaction-hint");

    if (activeZone) {
      if(hintEl) {
        hintEl.style.display = "block";
        hintEl.innerText = activeZone.questionData.type === "text"
            ? "Prem ESPAI per interactuar" // He arreglat el text d'interacció!
            : "Prem ESPAI per triar";
      }
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        openQuizModal(activeZone.questionData);
      }
    } else {
      if(hintEl) hintEl.style.display = "none";
    }
  }
}

// ... (El resto de funciones HTML se mantienen igual) ...

// =======================================
// LÓGICA QUIZ (HTML)
// =======================================

function createInteractionHint() {
  let hint = document.getElementById("interaction-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "interaction-hint";
    Object.assign(hint.style, {
        position: "absolute",
        bottom: "10%",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px 20px",
        borderRadius: "20px",
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontWeight: "bold",
        display: "none",
        zIndex: "1000"
    });
    document.body.appendChild(hint);
  }
}

function openQuizModal(data) {
  isQuizOpen = true;
  currentQuestionData = data;

  const modal = document.getElementById("quiz-modal");
  const qText = document.getElementById("quiz-question");
  const qResult = document.getElementById("quiz-result");
  const optionsContainer = document.getElementById("quiz-options-container");
  const inputContainer = document.getElementById("quiz-input-container");

  modal.classList.remove("hidden");
  if(qResult) qResult.classList.add("hidden");
  qText.innerText = data.question;

  if (data.type === "choice") {
    optionsContainer.classList.remove("hidden");
    inputContainer.classList.add("hidden");

    const grid = document.getElementById("quiz-options-grid");
    grid.innerHTML = "";

    data.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "quiz-btn";
      btn.innerText = opt;
      btn.onclick = () => checkChoiceAnswer(i, data.correct, btn);
      grid.appendChild(btn);
    });
  } else {
    optionsContainer.classList.add("hidden");
    inputContainer.classList.remove("hidden");

    const qInput = document.getElementById("quiz-input");
    const qBtn = document.getElementById("quiz-submit-btn");

    qInput.value = "";
    qInput.disabled = false;
    qBtn.disabled = false;
    qBtn.style.backgroundColor = "";
    qBtn.onclick = submitTextAnswer;
    qInput.focus();
  }
}

function checkChoiceAnswer(selectedIndex, correctIndex, btnElement) {
  const qResult = document.getElementById("quiz-result");
  document.querySelectorAll(".quiz-btn").forEach(b => b.disabled = true);
  qResult.classList.remove("hidden");

  if (selectedIndex === correctIndex) {
    btnElement.style.backgroundColor = "green";
    qResult.style.color = "green";
    qResult.innerText = "¡Correcto! 🎉";
  } else {
    btnElement.style.backgroundColor = "red";
    qResult.style.color = "red";
    qResult.innerText = "Incorrecto... 😢";
  }
  setTimeout(closeQuiz, 1500);
}

function submitTextAnswer() {
  const qInput = document.getElementById("quiz-input");
  const qResult = document.getElementById("quiz-result");
  const qBtn = document.getElementById("quiz-submit-btn");

  const userAnswer = qInput.value.toLowerCase().trim();
  const correctAnswer = currentQuestionData.answer.toLowerCase().trim();

  qInput.disabled = true;
  qBtn.disabled = true;
  qResult.classList.remove("hidden");

  if (userAnswer === correctAnswer) {
    qBtn.style.backgroundColor = "green";
    qResult.style.color = "green";
    qResult.innerText = "¡Correcto! 🎉";
  } else {
    qBtn.style.backgroundColor = "red";
    qResult.style.color = "red";
    qResult.innerText = `Incorrecto. Era: "${currentQuestionData.answer}"`;
  }
  setTimeout(closeQuiz, 2000);
}

function closeQuiz() {
  document.getElementById("quiz-modal").classList.add("hidden");
  isQuizOpen = false;
}

window.startGame = startGame;
window.closeQuiz = closeQuiz;