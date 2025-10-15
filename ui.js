// ui.js — DES Step-by-Step Demo

// ====== State ======
let blocks = []; // mỗi block: { bytes, cipherHex, rounds }
let currentRoundIndex = 0;
let mode = null; // "encrypt" hoặc "decrypt"
let lastResult = ""; // kết quả cuối cùng
let lastMode = ""; // luân phiên Fill Cipher

// ====== DOM elements ======
const stepBox = document.getElementById("stepBox");
const resultBox = document.getElementById("resultBox");
const log = document.getElementById("log");
const currentRoundTbody = document.querySelector("#currentRound tbody");
const historyTbody = document.querySelector("#roundHistory tbody");
const toast = document.getElementById("toast");
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");
const fillBtn = document.getElementById("fillCipher");

// ====== Helpers ======
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
  return p > 0 && p <= 8 ? bytes.slice(0, -p) : bytes;
}

// ====== Canvas fireworks ======
function resizeCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resizeCanvas);
resizeCanvas();

let particles = [];
let animating = false;
function spawnBurst(cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * 2 * Math.PI;
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
    else animating = false;
  })();
}
function triggerFireworks() {
  for (let i = 0; i < 6; i++)
    spawnBurst(
      Math.random() * canvas.width,
      Math.random() * canvas.height * 0.4 + 50,
      50
    );
  animateFireworks();
}

// ====== UI helpers ======
function clearTables() {
  currentRoundTbody.innerHTML = "";
  historyTbody.innerHTML = "";
}
function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => (toast.style.opacity = "0"), 2500);
}
function showBlocks(blocks) {
  const box = document.getElementById("blockListBox");
  if (!box) return;
  if (!blocks || blocks.length === 0) {
    box.textContent = "Chưa có dữ liệu.";
    return;
  }
  box.innerHTML = blocks
    .map(
      (b, i) =>
        `<div>Block ${i + 1}: <span style="color:#80d8ff">${b}</span></div>`
    )
    .join("");
}

// ====== History colors ======
function getBlockColor(index) {
  const hue = (index * 55) % 360; // màu gradient
  return `hsla(${hue}, 80%, 60%, 0.15)`;
}
function addHistoryRow(_, roundObj, blockIndex) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${roundObj.round}</td>
    <td>${roundObj.L}</td>
    <td>${roundObj.R}</td>
    <td>${roundObj.subkey}</td>
  `;
  tr.style.backgroundColor = getBlockColor(blockIndex);
  tr.classList.add("new");
  setTimeout(() => tr.classList.remove("new"), 1000);
  historyTbody.appendChild(tr);
  tr.scrollIntoView({ behavior: "smooth", block: "end" });
}
function renderCurrentRound(rows) {
  currentRoundTbody.innerHTML = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.roundObj.round}</td><td>${r.roundObj.L}</td><td>${r.roundObj.R}</td><td>${r.roundObj.subkey}</td>`;
    currentRoundTbody.appendChild(tr);
  }
}

// ====== Encrypt/Decrypt ======
function startEncrypt() {
  const text = document.getElementById("plaintext").value || "";
  const key = document.getElementById("key").value || "";
  if (key.length < 8) return alert("Key phải >= 8 ký tự.");
  const bytes = utf8ToBytes(text);
  const padded = padPKCS5(bytes);

  blocks = [];
  const blockStrList = [];
  for (let i = 0; i < padded.length; i += 8) {
    const blockBytes = padded.slice(i, i + 8);
    const blockStr = bytesToLatin1(blockBytes);
    const res = DES.encryptBlockFromText(blockStr, key);
    blocks.push({
      bytes: blockBytes,
      cipherHex: res.cipherHex,
      rounds: res.steps,
    });
    blockStrList.push(blockStr);
  }

  lastResult = blocks.map((b) => b.cipherHex).join("");
  lastMode = "encrypt";
  mode = "encrypt";
  currentRoundIndex = 0;

  clearTables();
  showBlocks(blockStrList);
  stepBox.textContent = `Encrypt prepared — ${blocks.length} block(s). Click "Tiếp tục".`;
  log.textContent =
    'Chuẩn bị xong. Mỗi lần "Tiếp tục" chạy 1 round cho tất cả block.';
  fillBtn.disabled = false;
}

function startDecrypt() {
  const key = document.getElementById("key").value || "";
  if (key.length < 8) return alert("Key phải >= 8 ký tự.");
  const input = document.getElementById("plaintext").value.trim();
  if (!/^[0-9a-fA-F]+$/.test(input))
    return alert("Nhập ciphertext hex hợp lệ.");

  blocks = [];
  let bytesAll = [];
  const blockStrList = [];
  for (let i = 0; i < input.length; i += 16) {
    const hex = input.substr(i, 16);
    const res = DES.decryptBlockFromHex(hex, key);
    blocks.push({
      bytes: latin1ToBytes(res.plaintext),
      cipherHex: hex,
      rounds: res.steps,
    });
    bytesAll.push(...latin1ToBytes(res.plaintext));
    blockStrList.push(hex);
  }

  const unp = unpad(new Uint8Array(bytesAll));
  lastResult = bytesToUtf8(unp);
  lastMode = "decrypt";
  mode = "decrypt";
  currentRoundIndex = 0;

  clearTables();
  showBlocks(blockStrList);
  stepBox.textContent = `Decrypt prepared — ${blocks.length} block(s). Click "Tiếp tục".`;
  log.textContent =
    'Chuẩn bị xong. Mỗi lần "Tiếp tục" chạy 1 round cho tất cả block.';
  fillBtn.disabled = false;
}

// ====== Step round ======
function stepAll() {
  if (!blocks.length) {
    log.textContent = "Chưa có block.";
    return;
  }
  if (currentRoundIndex >= 16) {
    log.textContent = "Đã hoàn tất 16 vòng.";
    return;
  }

  // Lưu vòng hiện tại vào lịch sử
  const rows = [];
  for (let b = 0; b < blocks.length; b++) {
    const roundObj = blocks[b].rounds[currentRoundIndex];
    addHistoryRow(null, roundObj, b);
    rows.push({ blockIndex: b, roundObj });
  }

  renderCurrentRound(rows);
  stepBox.textContent = `Vòng ${currentRoundIndex + 1}/16 cho ${
    blocks.length
  } block(s)`;
  log.textContent = `Round ${currentRoundIndex + 1} của ${
    blocks.length
  } block(s).`;

  currentRoundIndex++;
  if (currentRoundIndex === 16) {
    resultBox.textContent =
      mode === "encrypt"
        ? `Ciphertext: ${lastResult}`
        : `Plaintext: ${lastResult}`;
    showToast(`✅ Hoàn thành ${blocks.length} block(s) — 16 vòng`);
    triggerFireworks();
  }
}

// ====== Fill Cipher ======
fillBtn.addEventListener("click", () => {
  const inputBox = document.getElementById("plaintext");
  if (currentRoundIndex < 16) {
    alert("Chưa hoàn thành.");
    return;
  }
  if (!lastResult) {
    alert("Chưa có dữ liệu!");
    return;
  }
  inputBox.value = lastResult;
  fillBtn.disabled = true;
  if (lastMode === "encrypt") {
    lastMode = "decrypt";
    fillBtn.textContent = "🔁 Dùng cho Giải mã";
  } else {
    lastMode = "encrypt";
    fillBtn.textContent = "🔁 Dùng cho Mã hóa";
  }
});

// ====== Reset ======
document.getElementById("reset").addEventListener("click", () => {
  document.getElementById("plaintext").value = "";
  document.getElementById("key").value = "";
  document.getElementById("blockListBox").textContent = "Chưa có dữ liệu";
  blocks = [];
  currentRoundIndex = 0;
  mode = null;
  lastResult = "";
  lastMode = "";
  clearTables();
  resultBox.textContent = "";
  stepBox.textContent = "Chưa khởi chạy";
  log.textContent = "Reset hoàn tất.";
  fillBtn.disabled = false;
  fillBtn.textContent = "Chèn kết quả";
});

// ====== Nút chính ======
document.getElementById("encrypt").addEventListener("click", startEncrypt);
document.getElementById("decrypt").addEventListener("click", startDecrypt);
document.getElementById("step").addEventListener("click", stepAll);
