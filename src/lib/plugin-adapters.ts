type PluginAdapterContext = {
  code: string;
};

export type PluginAdapter = {
  name: string;
  matches: (language?: string | null) => boolean;
  render: (context: PluginAdapterContext) => string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const pluginAdapters: PluginAdapter[] = [
  {
    name: "mermaid",
    matches: (language) => language?.toLowerCase() === "mermaid",
    render: ({ code }) =>
      `<figure class="plugin-card mermaid-card"><figcaption>Mermaid Diagram</figcaption><div class="mermaid-graph">${escapeHtml(
        code.trim(),
      )}</div></figure>`,
  },
  {
    name: "diceroll",
    matches: (language) => ["dice", "diceroll", "dice-roller"].includes(language?.toLowerCase() ?? ""),
    render: ({ code }) =>
      `<div class="plugin-card dice-card" data-dice-expression="${escapeHtml(
        code.trim(),
      )}"><div class="dice-card-header"><span>DiceRoll</span><button type="button" class="dice-roll-trigger">Reroll</button></div><code>${escapeHtml(
        code.trim(),
      )}</code><p class="dice-roll-result">Waiting for first roll...</p></div>`,
  },
];
