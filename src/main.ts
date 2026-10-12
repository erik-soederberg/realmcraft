import "./ui/style.css";
import { Game } from "./game/game";
import { $ } from "./ui/hud";

const VERSION = "0.8";

const game = new Game($("view"));
$("version").textContent = `Prototyp ${VERSION}`;
$("loading").hidden = true;

new ResizeObserver(() => game.resize()).observe($("view"));
game.resize();

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { last = t; loop(t); });

// Exposed for debugging in the browser console.
(window as unknown as { ekdal: Game }).ekdal = game;
