import { $, esc } from "./hud";

export interface DialogueChoice { text: string; pick: () => void; }

/** The talk box: an NPC says one line at a time, then the player picks an answer. */
export class DialogueBox {
  private open = false;

  get isOpen(): boolean { return this.open; }

  show(name: string, lines: string[], choices: DialogueChoice[]): void {
    this.open = true;
    $("dialogue").hidden = false;
    $("dname").textContent = name;
    let i = 0;
    const step = () => {
      $("dline").textContent = lines[i] ?? "";
      const opts = $("dopts");
      const last = i >= lines.length - 1;
      const list: DialogueChoice[] = !last ? [{ text: "Fortsätt", pick: () => { i++; step(); } }] : choices.length ? choices : [{ text: "Hej då", pick: () => this.close() }];
      opts.innerHTML = list.map((c, k) => `<button data-k="${k}">${esc(c.text)}</button>`).join("");
      opts.onclick = e => {
        const b = (e.target as HTMLElement).closest("button");
        if (b) list[Number(b.dataset.k)].pick();
      };
      (opts.querySelector("button") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    };
    step();
  }

  close(): void {
    this.open = false;
    $("dialogue").hidden = true;
  }
}
