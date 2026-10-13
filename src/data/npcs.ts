import type { NpcDef } from "./types";

/**
 * NPC dialogue is a list of nodes. The first node whose `when` conditions all
 * hold is the one the NPC says, so put the most specific nodes first.
 */
export const NPCS: NpcDef[] = [
  {
    id: "arvid",
    name: "Smeden Arvid",
    look: { skin: "#b9876a", shirt: "#4a3a2e", trousers: "#2e2620", hair: "#6e6a64", apron: "#3a2a1e", beard: true },
    quests: ["smith_bars"],
    dialogue: [
      {
        when: [{ quest: "smith_bars", stage: "not_started" }],
        lines: ["Du där! Har du händerna fria?", "Byn behöver nya verktyg inför vintern, men jag har inte en enda bronstacka kvar."],
        options: [
          { text: "Jag kan smälta brons åt dig.", actions: [{ startQuest: "smith_bars" }], reply: ["Bra! Koppar och tenn finns i stenbrottet österut. Smält dem i ugnen här och kom tillbaka med tre tackor."] },
          { text: "Inte just nu.", reply: ["Som du vill. Ugnen går ingenstans."] },
        ],
      },
      {
        when: [{ quest: "smith_bars", stage: "bars" }, { hasItems: { bronze_bar: 3 } }],
        lines: ["Är det tackor jag ser i din packning?"],
        options: [
          { text: "Här är tre bronstackor.", actions: [{ take: { bronze_bar: 3 } }, { completeQuest: "smith_bars" }], reply: ["Fint arbete. Ta det här järnsvärdet, jag smidde det i våras. Det biter bättre än brons."] },
        ],
      },
      {
        when: [{ quest: "smith_bars", stage: "bars" }],
        lines: ["Tre bronstackor, det är allt jag ber om. Koppar och tenn bryter du i stenbrottet österut."],
      },
      {
        when: [{ quest: "smith_bars", stage: "done" }, { hasItems: { bronze_bar: 2 } }],
        lines: ["Du har brons med dig. Ska jag smida något åt dig?"],
        options: [
          { text: "Ett tvåhandssvärd (2 bronstackor).", actions: [{ take: { bronze_bar: 2 } }, { give: "bronze_greatsword" }], reply: ["Tungt och långsamt, men det klyver en varg på ett slag. Du behöver båda händerna, så skölden får vila."] },
          { text: "En dolk (1 bronstacka).", actions: [{ take: { bronze_bar: 1 } }, { give: "bronze_dagger" }], reply: ["Kort och snabb. Hugg ofta, så hinner de aldrig svara."] },
          { text: "Inte nu.", reply: ["Ugnen är varm när du ångrar dig."] },
        ],
      },
      {
        when: [{ quest: "smith_bars", stage: "done" }, { hasItems: { bronze_bar: 1 } }],
        lines: ["En bronstacka räcker till en dolk. Ska jag?"],
        options: [
          { text: "Ja, smid en dolk.", actions: [{ take: { bronze_bar: 1 } }, { give: "bronze_dagger" }], reply: ["Kort och snabb. Hugg ofta, så hinner de aldrig svara."] },
          { text: "Nej tack.", reply: ["Som du vill."] },
        ],
      },
      {
        when: [{ quest: "smith_bars", stage: "done" }],
        lines: ["Ge mig två bronstackor så smider jag ett tvåhandssvärd, eller en tacka för en dolk."],
      },
      { lines: ["Elden ska vara het nog att få järnet att sjunga. Kom tillbaka om du behöver låna städet."] },
    ],
  },
  {
    id: "tove",
    name: "Fiskaren Tove",
    look: { skin: "#d2a07e", shirt: "#3b5560", trousers: "#3a3328", hair: "#a0522d", hood: true },
    quests: ["fisher_supper"],
    dialogue: [
      {
        when: [{ quest: "fisher_supper", stage: "not_started" }],
        lines: ["Nätet gick sönder mot en sten i morse, och nu står jag här utan kvällsmat.", "Du skulle inte kunna fånga några räkor åt mig? Lagade, helst."],
        options: [
          { text: "Jag ordnar det.", actions: [{ startQuest: "fisher_supper" }], reply: ["Tack! Fiskeplatserna bubblar längs stranden. Spisen står vid bankkistan."] },
          { text: "Nej tack.", reply: ["Då får jag väl tugga på bark ikväll."] },
        ],
      },
      {
        when: [{ quest: "fisher_supper", stage: "cook" }, { hasItems: { c_shrimp: 4 } }],
        lines: ["Det luktar stekta räkor!"],
        options: [
          { text: "Varsågod, fyra lagade räkor.", actions: [{ take: { c_shrimp: 4 } }, { completeQuest: "fisher_supper" }], reply: ["Du har räddat min kväll. Här, låt mig visa hur man lägger ut nätet så att fisken inte smiter."] },
        ],
      },
      {
        when: [{ quest: "fisher_supper", stage: "cook" }],
        lines: ["Fyra lagade räkor räcker. Brända räkor äter inte ens måsarna."],
      },
      { lines: ["Vattnet är kallt men fisken är fet i år."] },
    ],
  },
  {
    id: "bo",
    name: "Jägaren Bo",
    look: { skin: "#c4946e", shirt: "#3d4a2c", trousers: "#2f2a22", hair: "#2a1e16", hood: true, beard: true },
    quests: ["wolf_trouble"],
    dialogue: [
      {
        when: [{ quest: "wolf_trouble", stage: "not_started" }],
        lines: ["Ser du skogen där borta? Vargarna har blivit fler än jag hinner med.", "De ger sig på allt som rör sig. Är du stark nog att hjälpa till?"],
        options: [
          { text: "Jag tar hand om dem.", actions: [{ startQuest: "wolf_trouble" }, { give: "shortbow" }], reply: ["Tre vargar räcker för att resten ska hålla sig undan ett tag. Ta min gamla kortbåge, så kan du skjuta på dem innan de hinner fram."] },
          { text: "Det låter farligt.", reply: ["Klokt. Kom tillbaka när du har ett svärd i handen."] },
        ],
      },
      {
        when: [{ quest: "wolf_trouble", stage: "hunt" }, { killsSinceStart: { quest: "wolf_trouble", mob: "wolf", count: 3 } }],
        lines: ["Det har varit tyst i skogen sedan i morse. Var det du?"],
        options: [
          { text: "Tre vargar färre nu.", actions: [{ completeQuest: "wolf_trouble" }], reply: ["Då är vi skyldiga dig en tjänst. Ta min gamla bronssköld, och låt mig visa hur man håller garden uppe."] },
        ],
      },
      {
        when: [{ quest: "wolf_trouble", stage: "hunt" }],
        lines: ["Vargarna håller till i skogen nordväst om byn. Tre stycken, sedan pratar vi."],
      },
      { lines: ["Skogen är lugnare nu. Men lugn varar aldrig länge."] },
    ],
  },
  {
    id: "stina",
    name: "Gruvfogden Stina",
    look: { skin: "#c99a78", shirt: "#5a4a32", trousers: "#2e2a24", hair: "#7a5a3a", hairStyle: "ponytail", apron: "#3a3026" },
    quests: ["spider_cave"],
    dialogue: [
      {
        when: [{ quest: "spider_cave", stage: "not_started" }],
        lines: ["Hör du dem? Det skrapar därinne om nätterna.", "Spindlar, stora som hundar, har tagit Svartgrottan. Ingen av mina gruvarbetare vågar gå in."],
        options: [
          { text: "Jag rensar grottan.", actions: [{ startQuest: "spider_cave" }], reply: ["Fem av dem borde räcka för att vi ska kunna börja bryta igen. Ta med mat, och gå inte för långt in. Längst in bor något större."] },
          { text: "Jag är inte redo än.", reply: ["Klokt. Kom tillbaka när du kan hålla en sköld uppe."] },
        ],
      },
      {
        when: [{ quest: "spider_cave", stage: "hunt" }, { killsSinceStart: { quest: "spider_cave", mob: "spider", count: 5 } }],
        lines: ["Det är tyst därinne nu. Var det du?"],
        options: [
          { text: "Fem spindlar färre.", actions: [{ completeQuest: "spider_cave" }], reply: ["Då öppnar vi gruvan i morgon. Ta den här järnskölden, den har räddat mig mer än en gång."] },
        ],
      },
      {
        when: [{ quest: "spider_cave", stage: "hunt" }],
        lines: ["Grottöppningen ligger vid stenbrottet, bara en bit österut. Fem spindlar, sedan pratar vi."],
      },
      { lines: ["Längst in i grottan bor ett troll. Om du någonsin vill pröva dig själv, så vet du var det finns."] },
    ],
  },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map(n => [n.id, n]));
