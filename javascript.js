const canvasRain = document.getElementById("charRain");
const ctxRain = canvasRain.getContext("2d");
let W, H;
function resizeRain() {
  W = canvasRain.width = window.innerWidth;
  H = canvasRain.height = window.innerHeight;
}
window.addEventListener("resize", resizeRain);
resizeRain();

const chars =
  "!@#$%^&*()_+=-~<>?/{}[]|\\abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const drops = [];

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 100%, 70%)`;
}

function newDrop() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    char: chars.charAt(Math.floor(Math.random() * chars.length)),
    speed: 2 + Math.random() * 4,
    alpha: 1,
    color: randomColor(),
    size: 14 + Math.random() * 10,
  };
}

// tạo vài trăm ký tự ban đầu
for (let i = 0; i < 250; i++) drops.push(newDrop());

function drawRain() {
  ctxRain.clearRect(0, 0, W, H);
  for (const d of drops) {
    ctxRain.fillStyle = `${d.color}`;
    ctxRain.globalAlpha = d.alpha;
    ctxRain.font = `${d.size}px monospace`;
    ctxRain.fillText(d.char, d.x, d.y);

    d.y += d.speed;
    d.alpha -= 0.0015; // biến mất dần
    if (d.alpha <= 0 || d.y > H) {
      // reset ký tự mới
      d.x = Math.random() * W;
      d.y = 10;
      d.alpha = 4;
      d.char = chars.charAt(Math.floor(Math.random() * chars.length));
      d.color = randomColor();
      d.size = 24 + Math.random() * 30;
      d.speed = 1 + Math.random();
    }
  }
  ctxRain.globalAlpha = 1;
  requestAnimationFrame(drawRain);
}
drawRain();
