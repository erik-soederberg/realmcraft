import "./ui/style.css";
import { Game } from "./game/game";
import { $ } from "./ui/hud";

const VERSION = "0.13";

const game = new Game($("view"));
const versionEl = $("version");
versionEl.textContent = `Prototyp ${VERSION}`;
$("loading").hidden = true;

new ResizeObserver(() => game.resize()).observe($("view"));
game.resize();

let last = performance.now(), fpsAt = last, frames = 0;
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.frame(dt);
  frames++;
  if (now - fpsAt >= 1000) {
    versionEl.textContent = `Prototyp ${VERSION} · ${Math.round(frames * 1000 / (now - fpsAt))} fps`;
    frames = 0; fpsAt = now;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { last = t; loop(t); });

// Exposed for debugging in the browser console.
(window as unknown as { ekdal: Game }).ekdal = game;
