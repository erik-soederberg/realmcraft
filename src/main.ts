import "./ui/style.css";
import { Game } from "./game/game";
import { $ } from "./ui/hud";

const VERSION = "0.5";

const game = new Game($("view"));
$("version").textContent = `Prototyp ${VERSION}`;
game.hud.message("Välkommen till Ekdal.", "sys");
game.hud.message("Leta efter gula utropstecken. Där finns det folk som behöver hjälp.");
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
