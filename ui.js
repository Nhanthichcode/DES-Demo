// ui.js — Parallel multi-block DES: mỗi "step" thực hiện 1 round cho tất cả block

let blocks = []; // mỗi phần: { bytes: Uint8Array(8), cipherHex, rounds: [ {round,L,R,subkey} ] }
let currentRoundIndex = 0; // 0..15
let mode = null; // "encrypt" hoặc "decrypt"
let lastCipherHex = "";
let lastPlain = "";

const stepBox = document.getElementById("stepBox");
const resultBox = document.getElementById("resultBox");
const log = document.getElementById("log");
const currentRoundTbody = document.querySelector("#currentRound tbody");
const historyTbody = document.querySelector("#roundHistory tbody");
const toast = document.getElementById("toast");
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resizeCanvas);
resizeCanvas();

// helpers
const enc = new TextEncoder();
const dec = new TextDecoder();
function utf8ToBytes(s) {
  return enc.encode(s);
}
function bytesToUtf8(a) {
  return dec.decode(a);
}
function bytesToLatin1(bytes) {
  return String.fromCharCode(...bytes);
}
function latin1ToBytes(str) {
  return new Uint8Array([...str].map((c) => c.charCodeAt(0)));
}
function padPKCS5(bytes) {
  const pad = 8 - (bytes.length % 8 || 8);
  const out = new Uint8Array(bytes.length + pad);
  out.set(bytes);
  out.fill(pad, bytes.length);
  return out;
}
function unpad(bytes) {
  const p = bytes[bytes.length - 1];
  if (p > 0 && p <= 8) return bytes.slice(0, -p);
  return bytes;
}

// UI helpers
function clearTables() {
  currentRoundTbody.innerHTML = "";
  historyTbody.innerHTML = "";
}
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
function addHistoryRow(blockIndex, roundObj) {
  const tr = document.createElement("tr");
  tr.classList.add("new");
  tr.innerHTML = `<td>${roundObj.round}</td><td>${roundObj.L}</td><td>${roundObj.R}</td><td>${roundObj.subkey}</td>`;
  historyTbody.appendChild(tr);
  tr.scrollIntoView({ behavior: "smooth", block: "end" });
  setTimeout(() => tr.classList.remove("new"), 900);
}
function renderCurrentRound(rows) {
  // rows: array of {blockIndex, roundObj}
  currentRoundTbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.roundObj.round}</td><td>${r.roundObj.L}</td><td>${r.roundObj.R}</td><td>${r.roundObj.subkey}</td>`;
    currentRoundTbody.appendChild(tr);
  }
}

// fireworks (same as before)
let particles = [];
function spawnBurst(cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      dx: Math.cos(a) * s,
      dy: Math.sin(a) * s,
      life: 60 + Math.random() * 60,
      color: `hsl(${Math.floor(Math.random() * 360)},100%,${
        50 + Math.random() * 20
      }%)`,
      size: 2 + Math.random() * 3,
    });
  }
}
let animating = false;
function animateFireworks() {
  if (animating) return;
  animating = true;
  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.06;
      p.dx *= 0.995;
      p.dy *= 0.995;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (particles.length > 0) requestAnimationFrame(loop);
    else {
      animating = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  })();
}
function triggerFireworks() {
  for (let b = 0; b < 6; b++)
    spawnBurst(
      Math.random() * canvas.width,
      Math.random() * canvas.height * 0.4 + 50,
      50
    );
  animateFireworks();
}

// prepare blocks for encrypt (parallel)
function startEncrypt() {
  const text = document.getElementById("plaintext").value || "";
  const key = document.getElementById("key").value || "";
  if (key.length < 8) return alert("Key phải có ít nhất 8 ký tự.");
  const bytes = utf8ToBytes(text);
  const padded = padPKCS5(bytes);
  blocks = [];
  for (let i = 0; i < padded.length; i += 8) {
    const blockBytes = padded.slice(i, i + 8);
    const blockStr = bytesToLatin1(blockBytes);
    const res = DES.encryptBlockFromText(blockStr, key);
    // res.steps: array 16 rounds with round,L,R,subkey
    blocks.push({
      bytes: blockBytes,
      cipherHex: res.cipherHex,
      rounds: res.steps,
    });
  }
  lastCipherHex = blocks.map((b) => b.cipherHex).join("");
  lastPlain = text;
  mode = "encrypt";
  currentRoundIndex = 0;
  clearTables();
  stepBox.textContent = `Encrypt prepared — ${blocks.length} block(s). Click "Tiếp tục" (16 rounds total).`;
  log.textContent =
    'Chuẩn bị xong. Mỗi lần "Tiếp tục" sẽ chạy 1 round cho tất cả block.';
}

// prepare blocks for decrypt (parallel)
function startDecrypt() {
  const key = document.getElementById("key").value || "";
  if (key.length < 8) return alert("Key phải có ít nhất 8 ký tự.");
  const input = document.getElementById("plaintext").value.trim();
  if (!/^[0-9a-fA-F]+$/.test(input))
    return alert("Nhập ciphertext hex hợp lệ để giải mã.");
  blocks = [];
  let bytesAll = [];
  for (let i = 0; i < input.length; i += 16) {
    const hex = input.substr(i, 16);
    const res = DES.decryptBlockFromHex(hex, key);
    blocks.push({
      bytes: latin1ToBytes(res.plaintext),
      cipherHex: hex,
      rounds: res.steps,
    });
    bytesAll.push(...latin1ToBytes(res.plaintext));
  }
  const unp = unpad(new Uint8Array(bytesAll));
  lastPlain = bytesToUtf8(unp);
  mode = "decrypt";
  currentRoundIndex = 0;
  clearTables();
  stepBox.textContent = `Decrypt prepared — ${blocks.length} block(s). Click "Tiếp tục".`;
  log.textContent =
    'Chuẩn bị xong. Mỗi lần "Tiếp tục" sẽ chạy 1 round cho tất cả block.';
}

// single step: execute currentRoundIndex for all blocks, render currentRound rows, move previous current to history
function stepAll() {
  if (!blocks.length) {
    log.textContent = "Chưa có block. Nhấn Encrypt/Decrypt trước.";
    return;
  }
  if (currentRoundIndex >= 16) {
    log.textContent = "Đã hoàn tất 16 vòng cho tất cả block.";
    return;
  }
  // move any existing current rows to history (previous round)
  const prevRows = Array.from(currentRoundTbody.querySelectorAll("tr"));
  prevRows.forEach((r) => {
    const cols = r.querySelectorAll("td");
    const obj = {
      round: cols[0].innerText,
      L: cols[1].innerText,
      R: cols[2].innerText,
      subkey: cols[3].innerText,
    };
    addHistoryRow(null, obj);
  });
  // prepare rows for this round for each block
  const rows = [];
  for (let b = 0; b < blocks.length; b++) {
    const roundObj = blocks[b].rounds[currentRoundIndex];
    rows.push({ blockIndex: b, roundObj });
  }
  renderCurrentRound(rows);
  stepBox.textContent = `Đang hiển thị vòng ${
    currentRoundIndex + 1
  } / 16 cho tất cả block(s).`;
  log.textContent = `Round ${currentRoundIndex + 1} của ${
    blocks.length
  } block(s).`;

  currentRoundIndex++;
  if (currentRoundIndex === 16) {
    // finished all rounds
    if (mode === "encrypt") {
      resultBox.textContent = `Ciphertext: ${lastCipherHex}`;
      showToast(`✅ Hoàn thành: ${blocks.length} block(s) — 16 vòng`);
      triggerFireworks();
    } else {
      resultBox.textContent = `Plaintext: ${lastPlain}`;
      showToast(`✅ Giải mã xong ${blocks.length} block(s)`);
      triggerFireworks();
    }
  }
}

// FIX: fillCipher button
function fillCipher() {
  if (!lastCipherHex) {
    alert("Chưa có ciphertext. Hãy mã hóa trước.");
    return;
  }
  document.getElementById("plaintext").value = lastCipherHex;
  log.textContent = "Đã điền ciphertext vừa tạo vào ô Plaintext.";
}

// wire buttons
document.getElementById("encrypt").addEventListener("click", startEncrypt);
document.getElementById("decrypt").addEventListener("click", startDecrypt);
document.getElementById("step").addEventListener("click", stepAll);
const fillBtn = document.getElementById("fillCipher");
if (fillBtn) fillBtn.addEventListener("click", fillCipher);
document.getElementById("reset").addEventListener("click", () => {
  blocks = [];
  currentRoundIndex = 0;
  mode = null;
  lastCipherHex = "";
  lastPlain = "";
  clearTables();
  resultBox.textContent = "";
  stepBox.textContent = "Chưa khởi chạy";
  log.textContent = "Reset hoàn tất.";
});
