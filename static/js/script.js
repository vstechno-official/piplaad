const TOTAL_BEADS = 108;
let currentBead = 0;
let malaCount = parseInt(localStorage.getItem("piplaad_mala_count")) || 0;
let totalLifetimeJap = parseInt(localStorage.getItem("piplaad_total_jap")) || 0;
let currentLiquid = "water";
let audioUnlocked = false;

document.getElementById("mala-cycle-display").innerText = malaCount;
document.getElementById("modal-total-jap").innerText = totalLifetimeJap;

const malaTrack = document.getElementById("mala-track");
const beads = [];
const RADIUS = 170;

function buildMala() {
  for (let i = 0; i < TOTAL_BEADS; i++) {
    const bead = document.createElement("div");
    bead.className = "bead";
    const angle = ((i + 1) * (Math.PI * 2)) / TOTAL_BEADS;

    const x = RADIUS + RADIUS * Math.cos(angle);
    const y = RADIUS + RADIUS * Math.sin(angle);

    bead.style.left = `${x}px`;
    bead.style.top = `${y}px`;

    bead.style.transform = `translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad)`;

    malaTrack.appendChild(bead);
    beads.push(bead);
  }
}
buildMala();

const profileModal = document.getElementById("profile-modal");
document.getElementById("btn-open-profile").addEventListener("click", () => {
  document.getElementById("modal-total-jap").innerText = totalLifetimeJap;
  profileModal.classList.add("open");
});
document.getElementById("btn-close-profile").addEventListener("click", () => {
  profileModal.classList.remove("open");
});

const canvas = document.getElementById("fluid-layer");
const ctx = canvas.getContext("2d");
let drops = [];

function resize() {
  canvas.width = window.innerWidth > 428 ? 428 : window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

class Drop {
  constructor(isMilk) {
    const coreRect = document
      .getElementById("shrine-core")
      .getBoundingClientRect();
    this.x = canvas.width / 2 + (Math.random() - 0.5) * 80;
    this.y = coreRect.top + 50;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = Math.random() * 2 + 1;
    this.r = Math.random() * 8 + 4;
    this.isMilk = isMilk;
    this.life = 1;
    this.decay = isMilk ? 0.007 : 0.012;
  }
  update() {
    this.vy += 0.35;
    this.vx *= 0.97;
    this.y += this.vy;
    this.x += this.vx;
    this.life -= this.decay;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    if (this.isMilk) {
      ctx.fillStyle = `rgba(255, 250, 240, ${this.life})`;
    } else {
      ctx.fillStyle = `rgba(147, 197, 253, ${this.life * 0.7})`;
    }
    ctx.fill();
  }
}

function animateFluid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = drops.length - 1; i >= 0; i--) {
    drops[i].update();
    drops[i].draw();
    if (drops[i].life <= 0 || drops[i].y > canvas.height) {
      drops.splice(i, 1);
    }
  }
  requestAnimationFrame(animateFluid);
}
animateFluid();

const ambientCanvas = document.getElementById("ambient-canvas");
const actx = ambientCanvas.getContext("2d");
let embers = [];

function resizeAmbient() {
  ambientCanvas.width = window.innerWidth;
  ambientCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeAmbient);
resizeAmbient();

for (let i = 0; i < 35; i++) {
  embers.push({
    x: Math.random() * ambientCanvas.width,
    y: Math.random() * ambientCanvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 1) * 0.4,
    size: Math.random() * 1.5 + 0.5,
    alpha: Math.random(),
  });
}

function animateEmbers() {
  actx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
  embers.forEach((e) => {
    e.y += e.vy;
    e.x += e.vx;
    e.alpha += (Math.random() - 0.5) * 0.03;
    if (e.alpha < 0) e.alpha = 0;
    if (e.alpha > 0.6) e.alpha = 0.6;

    if (e.y < 0) {
      e.y = ambientCanvas.height;
      e.x = Math.random() * ambientCanvas.width;
    }

    actx.beginPath();
    actx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    actx.fillStyle = `rgba(255, 204, 0, ${e.alpha})`;
    actx.fill();
  });
  requestAnimationFrame(animateEmbers);
}
animateEmbers();

let synth = window.speechSynthesis;
let audioCtx;
let masterGain;
let deepVoice = null;

function initializeAudioSystem() {
  if (audioUnlocked) return;

  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);
  masterGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 3);

  const osc = audioCtx.createOscillator();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = 108;
  lfo.type = "sine";
  lfo.frequency.value = 0.03;
  lfoGain.gain.value = 2;

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(masterGain);

  osc.start();
  lfo.start();

  let unlockSpeech = new SpeechSynthesisUtterance("");
  unlockSpeech.volume = 0;
  synth.speak(unlockSpeech);

  const voices = synth.getVoices();
  deepVoice =
    voices.find(
      (v) =>
        v.name.includes("Male") &&
        (v.name.includes("UK") || v.name.includes("India")),
    ) || voices[0];
  audioUnlocked = true;
}

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => {
    const voices = synth.getVoices();
    deepVoice =
      voices.find(
        (v) =>
          v.name.includes("Male") &&
          (v.name.includes("UK") || v.name.includes("India")),
      ) || voices[0];
  };
}

document.getElementById("btn-enter").addEventListener("click", () => {
  initializeAudioSystem();
  const gate = document.getElementById("entry-gate");
  const mainApp = document.getElementById("main-app");

  gate.style.opacity = "0";
  setTimeout(() => {
    gate.style.display = "none";
    mainApp.classList.remove("opacity-0");
  }, 1200);
});

const btnWater = document.getElementById("btn-water");
const btnMilk = document.getElementById("btn-milk");

btnWater.addEventListener("click", () => {
  currentLiquid = "water";
  btnWater.className = "liquid-btn active water";
  btnMilk.className = "liquid-btn";
});

btnMilk.addEventListener("click", () => {
  currentLiquid = "milk";
  btnMilk.className = "liquid-btn active milk";
  btnWater.className = "liquid-btn";
});

function executeRitual() {
  if (!audioUnlocked) return;

  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
  const count = currentLiquid === "milk" ? 12 : 20;
  for (let i = 0; i < count; i++) {
    drops.push(new Drop(currentLiquid === "milk"));
  }

  if (synth.speaking) synth.cancel();
  const utterance = new SpeechSynthesisUtterance("Om Piplaadaya Namah");
  if (deepVoice) utterance.voice = deepVoice;
  utterance.rate = 0.65;
  utterance.pitch = 0.1;
  synth.speak(utterance);

  currentBead++;
  totalLifetimeJap++;

  if (currentBead > TOTAL_BEADS) {
    currentBead = 1;
    malaCount++;
    localStorage.setItem("piplaad_mala_count", malaCount);
    document.getElementById("mala-cycle-display").innerText = malaCount;
  }

  localStorage.setItem("piplaad_total_jap", totalLifetimeJap);

  beads.forEach((b) => b.classList.remove("active"));
  beads[currentBead - 1].classList.add("active");
  document.getElementById("bead-count").innerText = currentBead;
}

document.getElementById("btn-chant").addEventListener("click", executeRitual);
document
  .getElementById("idol-trigger")
  .addEventListener("click", executeRitual);
