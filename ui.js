// ui.js — DES Step-by-Step Demo (Giao diện Dashboard v2)

// ====== State ======
let blocks = [];
let currentRoundIndex = 0;
let mode = null;
let lastResult = "";
let lastMode = "";
let lastHistoryRound = 0; // Biến mới để theo dõi đường kẻ bảng

// ====== DOM elements (ĐÃ CẬP NHẬT) ======
const plaintextInput = document.getElementById("plaintext");
const keyInput = document.getElementById("key");
const navResultBox = document.getElementById("navResultBox"); // MỚI
const log = document.getElementById("log");
const historyTbody = document.querySelector("#roundHistory tbody");
const historyContainer = document.querySelector(".round-history-container");
const toast = document.getElementById("toast");
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");
const fillBtn = document.getElementById("fillCipher");

// --- DOM Elements MỚI cho Sơ đồ Feistel ---
const livePanel = document.querySelector(".live-panel");
const detailRoundNum = document.getElementById("detailRoundNum");
const f_L_in = document.getElementById("f_L_in");
const f_R_in = document.getElementById("f_R_in");
const f_E_out = document.getElementById("f_E_out");
const f_K_in = document.getElementById("f_K_in");
const f_XOR_out = document.getElementById("f_XOR_out");
const f_S_in_out = document.getElementById("f_S_in_out");
const f_P_out = document.getElementById("f_P_out");
const f_L_out = document.getElementById("f_L_out");
const f_R_out = document.getElementById("f_R_out");

// --- DOM Elements ĐÃ BỊ XÓA ---
// blockListBox, resultBox, live_L_in (cũ), ...

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

// ====== Canvas fireworks (Giữ nguyên) ======
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

// ===================================
// ====== UI helpers (ĐÃ CẬP NHẬT) ======
// ===================================

/**
 * Cập nhật Sơ đồ Feistel (thay thế updateLiveRoundPanel)
 */
function updateFeistelDiagram(roundData) {
  if (!roundData || !roundData.feistel) {
    console.error("Missing data for Feistel diagram", roundData);
    return;
  }
  const f = roundData.feistel;
  detailRoundNum.textContent = roundData.round;

  // Cập nhật Input
  f_L_in.textContent = roundData.L_in;
  f_R_in.textContent = roundData.R_in;

  // Cập nhật Khối Feistel
  f_E_out.textContent = f.E_out_hex;
  f_K_in.textContent = f.Subkey_hex;
  f_XOR_out.textContent = f.XOR_out_hex;
  f_P_out.textContent = f.P_out_hex;

  // Xây dựng 8 ô S-Box
  f_S_in_out.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const in_hex = f.S_in_chunks_hex[i];
    const out_char = f.S_out_hex.charAt(i);
    f_S_in_out.innerHTML += `
      <div class="sbox-item">
        <div class="s-label">S${i + 1}</div>
        <div class="s-in">${in_hex}</div>
        <div class="s-out">${out_char}</div>
      </div>
    `;
  }

  // Cập nhật Output
  f_L_out.textContent = roundData.L_out;
  f_R_out.textContent = roundData.R_out;

  // Hiệu ứng flash
  if (livePanel) {
    livePanel.style.transition = "none";
    livePanel.style.backgroundColor = "rgba(90, 180, 255, 0.2)";
    setTimeout(() => {
      livePanel.style.transition = "background-color 0.5s ease";
      livePanel.style.backgroundColor = "";
    }, 100);
  }
}

function clearTables() {
  historyTbody.innerHTML = "";
  lastHistoryRound = 0; // Reset bộ đếm vòng
}
function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => (toast.style.opacity = "0"), 2500);
}
// HÀM showBlocks() ĐÃ BỊ XÓA

// ====== History (CẬP NHẬT) ======
function addHistoryRow(_, roundObj, blockIndex) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${roundObj.round}</td>
    <td>${roundObj.L_in}</td>
    <td>${roundObj.R_in}</td>
    <td>${roundObj.subkey}</td>
  `;

  // === LOGIC THÊM ĐƯỜNG KẺ PHÂN CHIA ===
  if (roundObj.round !== lastHistoryRound) {
    tr.classList.add("round-start");
    lastHistoryRound = roundObj.round;
  }
  // Xóa logic màu cũ (nếu có)
  // tr.style.backgroundColor = ... (ĐÃ BỊ XÓA)

  tr.classList.add("new");
  setTimeout(() => tr.classList.remove("new"), 1000);
  historyTbody.appendChild(tr);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

// ====== Encrypt/Decrypt (CẬP NHẬT) ======
function startEncrypt() {
  const text = plaintextInput.value || "";
  const key = keyInput.value || "";
  if (key.length < 8) return alert("Key phải >= 8 ký tự.");
  const bytes = utf8ToBytes(text);
  const padded = padPKCS5(bytes);
  blocks = [];
  for (let i = 0; i < padded.length; i += 8) {
    const blockBytes = padded.slice(i, i + 8);
    const blockStr = bytesToLatin1(blockBytes);
    const res = DES.encryptBlockFromText(blockStr, key);
    blocks.push({
      bytes: blockBytes,
      cipherHex: res.cipherHex,
      rounds: res.steps,
    });
  }
  lastResult = blocks.map((b) => b.cipherHex).join("");
  lastMode = "encrypt";
  mode = "encrypt";
  currentRoundIndex = 0;
  clearTables();
  log.textContent = `Chuẩn bị mã hóa ${blocks.length} block(s). Nhấn "Vòng tiếp".`;
  fillBtn.disabled = false;
  resetFeistelDiagram(); // Reset sơ đồ
}

function startDecrypt() {
  const key = keyInput.value || "";
  if (key.length < 8) return alert("Key phải >= 8 ký tự.");
  const input = plaintextInput.value.trim();
  if (!/^[0-9a-fA-F\s]+$/.test(input.replace(/\s/g, "")))
    return alert("Nhập ciphertext hex hợp lệ.");
  const hexInput = input.replace(/\s/g, "");
  blocks = [];
  let bytesAll = [];
  for (let i = 0; i < hexInput.length; i += 16) {
    const hex = hexInput.substr(i, 16);
    if (hex.length < 16) {
      log.textContent = `Block cuối (${hex}) không đủ 16 ký tự. Bỏ qua.`;
      continue;
    }
    const res = DES.decryptBlockFromHex(hex, key);
    blocks.push({
      bytes: latin1ToBytes(res.plaintext),
      cipherHex: hex,
      rounds: res.steps,
    });
    bytesAll.push(...latin1ToBytes(res.plaintext));
  }
  if (blocks.length === 0) {
    log.textContent = "Không tìm thấy block hex 64-bit hợp lệ.";
    return;
  }
  const unp = unpad(new Uint8Array(bytesAll));
  lastResult = bytesToUtf8(unp);
  lastMode = "decrypt";
  mode = "decrypt";
  currentRoundIndex = 0;
  clearTables();
  log.textContent = `Chuẩn bị giải mã ${blocks.length} block(s). Nhấn "Vòng tiếp".`;
  fillBtn.disabled = false;
  resetFeistelDiagram();
}

// ====== Step round (CẬP NHẬT) ======
function stepAll() {
  if (!blocks.length) {
    log.textContent = "Chưa có block. Hãy nhấn Mã hóa hoặc Giải mã trước.";
    return;
  }
  if (currentRoundIndex >= 16) {
    log.textContent = "Đã hoàn tất 16 vòng.";
    return;
  }

  for (let b = 0; b < blocks.length; b++) {
    const roundObj = blocks[b].rounds[currentRoundIndex];
    addHistoryRow(null, roundObj, b);
  }

  // Cập nhật Sơ đồ Feistel (luôn hiển thị cho block 1)
  const detailData = blocks[0].rounds[currentRoundIndex];
  updateFeistelDiagram(detailData);

  log.textContent = `Hiển thị chi tiết vòng ${
    currentRoundIndex + 1
  } cho Block 1.`;

  currentRoundIndex++;

  if (currentRoundIndex === 16) {
    // Cập nhật kết quả lên Navbar
    navResultBox.textContent =
      mode === "encrypt" ? `Hex: ${lastResult}` : `Text: ${lastResult}`;
    showToast(`✅ Hoàn thành ${blocks.length} block(s) — 16 vòng`);
    triggerFireworks();
    log.textContent = "Hoàn thành 16 vòng. Xem kết quả trên thanh điều hướng.";
  }
}

// ====== Fill Cipher (CẬP NHẬT) ======
fillBtn.addEventListener("click", () => {
  if (!lastResult) {
    log.textContent = "Chưa có kết quả để chèn.";
    return;
  }
  plaintextInput.value = lastResult;
  fillBtn.disabled = true;
  if (lastMode === "encrypt") {
    lastMode = "decrypt";
    fillBtn.title = "Dùng kết quả này để Giải mã";
  } else {
    lastMode = "encrypt";
    fillBtn.title = "Dùng kết quả này để Mã hóa";
  }
});

// ====== Reset (CẬP NHẬT) ======
function resetFeistelDiagram() {
  detailRoundNum.textContent = "0";
  f_L_in.textContent = "...";
  f_R_in.textContent = "...";
  f_E_out.textContent = "...";
  f_K_in.textContent = "...";
  f_XOR_out.textContent = "...";
  f_S_in_out.innerHTML = "";
  f_P_out.textContent = "...";
  f_L_out.textContent = "...";
  f_R_out.textContent = "...";
}

document.getElementById("reset").addEventListener("click", () => {
  plaintextInput.value = "";
  keyInput.value = "";
  blocks = [];
  currentRoundIndex = 0;
  mode = null;
  lastResult = "";
  lastMode = "";
  clearTables();
  navResultBox.textContent = "—"; // Reset kết quả trên navbar
  log.textContent = "Reset hoàn tất.";
  fillBtn.disabled = false;
  fillBtn.title = "Chèn kết quả";
  resetFeistelDiagram(); // Reset sơ đồ
});

// ====== Nút chính ======
document.getElementById("encrypt").addEventListener("click", startEncrypt);
document.getElementById("decrypt").addEventListener("click", startDecrypt);
document.getElementById("step").addEventListener("click", stepAll);
