import mermaid from "mermaid";

function initMermaid() {
  const graphs = document.querySelectorAll<HTMLElement>(".mermaid-graph");
  if (!graphs.length) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      primaryColor: "#0f172a",
      primaryTextColor: "#e2e8f0",
      lineColor: "#38bdf8",
      fontFamily: "Space Grotesk",
      primaryBorderColor: "#475569",
      secondaryColor: "#101827",
      tertiaryColor: "#162033",
    },
  });

  mermaid.run({ querySelector: ".mermaid-graph" }).catch((error) => {
    console.warn("Mermaid enhancement failed", error);
  });
}

function rollExpression(expression: string) {
  const cleaned = expression.replace(/\s+/g, "");
  const parts = cleaned.match(/[+-]?[^+-]+/g) ?? [];

  let total = 0;
  const breakdown: string[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const sign = part.startsWith("-") ? -1 : 1;
    const token = part.replace(/^[+-]/, "");

    if (/^\d*d\d+$/i.test(token)) {
      const [countValue, sizeValue] = token.toLowerCase().split("d");
      const count = Number(countValue || 1);
      const size = Number(sizeValue);
      let subtotal = 0;
      const rolls: number[] = [];

      for (let index = 0; index < count; index += 1) {
        const roll = Math.floor(Math.random() * size) + 1;
        subtotal += roll;
        rolls.push(roll);
      }

      total += subtotal * sign;
      breakdown.push(`${sign < 0 ? "-" : ""}${count}d${size} [${rolls.join(", ")}]`);
      continue;
    }

    if (/^\d+$/.test(token)) {
      total += Number(token) * sign;
      breakdown.push(`${sign < 0 ? "-" : "+"}${token}`);
    }
  }

  return {
    total,
    breakdown: breakdown.join(" "),
  };
}

function initDice() {
  document.querySelectorAll<HTMLElement>("[data-dice-expression]").forEach((card) => {
    if (card.dataset.diceReady === "true") return;

    const button = card.querySelector<HTMLButtonElement>(".dice-roll-trigger");
    const result = card.querySelector<HTMLElement>(".dice-roll-result");
    if (!button || !result) return;

    const reroll = () => {
      const expression = card.getAttribute("data-dice-expression") || "";
      const roll = rollExpression(expression);
      result.textContent = `${roll.total} • ${roll.breakdown}`;
    };

    button.addEventListener("click", reroll);
    reroll();
    card.dataset.diceReady = "true";
  });
}

export function initWritingEnhancers() {
  initMermaid();
  initDice();
}

initWritingEnhancers();
