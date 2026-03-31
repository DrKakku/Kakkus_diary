import { DataSet, Network } from "vis-network/standalone";

type GraphNode = {
  id: string;
  label: string;
  kind: "note" | "tag";
  url: string;
  path?: string;
  section?: string;
  sectionLabel?: string;
  tags?: string[];
  radius: number;
  degree: number;
};

type GraphLink = {
  source: string;
  target: string;
  kind: "note-link" | "tag-link";
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type StoredGraphState = {
  search: string;
  showTags: boolean;
  depth: number;
  section: string;
};

const sectionColors = [
  "#38bdf8",
  "#f59e0b",
  "#22c55e",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#14b8a6",
];

function initKnowledgeGraph(host: HTMLElement) {
  if (host.dataset.graphReady === "true") return;

  const dataNode = host.querySelector<HTMLElement>(".graph-data");
  const graphRoot = host.querySelector<HTMLElement>("[data-role='graph']");
  const infoNode = host.querySelector<HTMLElement>("[data-role='graph-info']");
  const searchInput = host.querySelector<HTMLInputElement>("input[type='search']");
  const depthInput = host.querySelector<HTMLInputElement>("[data-role='depth']");
  const tagsInput = host.querySelector<HTMLInputElement>("[data-role='show-tags']");
  const sectionInput = host.querySelector<HTMLSelectElement>("[data-role='section-filter']");
  const fitButton = host.querySelector<HTMLButtonElement>("[data-role='fit']");
  const resetButton = host.querySelector<HTMLButtonElement>("[data-role='reset']");

  if (!dataNode || !graphRoot || !infoNode || !searchInput || !tagsInput) return;

  const rawGraph = JSON.parse(dataNode.textContent || '{"nodes":[],"links":[]}') as GraphData;
  const mode = host.dataset.mode || "global";
  const focusPath = host.dataset.focusPath || "";
  const graphId = host.dataset.graphId || host.dataset.graphid || host.getAttribute("data-graph-id") || "default";
  const stateKey = `knowledge-graph:${graphId}`;
  const defaultDepth = Number(host.dataset.initialDepth || "2");
  const defaultShowTags = host.dataset.showTags === "true";

  const state = readState(stateKey, {
    search: "",
    showTags: defaultShowTags,
    depth: defaultDepth,
    section: "all",
  });

  searchInput.value = state.search;
  tagsInput.checked = state.showTags;
  if (depthInput) depthInput.value = String(state.depth);
  if (sectionInput) sectionInput.value = state.section;

  const adjacency = buildAdjacency(rawGraph.links);
  const nodeLookup = new Map(rawGraph.nodes.map((node) => [node.id, node]));
  let network: Network | undefined;

  const render = () => {
    const graph = buildFilteredGraph({
      rawGraph,
      adjacency,
      mode,
      focusPath,
      query: searchInput.value.trim().toLowerCase(),
      depth: Number(depthInput?.value || defaultDepth),
      includeTags: tagsInput.checked,
      sectionFilter: sectionInput?.value || "all",
    });

    if (network) {
      network.destroy();
      network = undefined;
    }

    graphRoot.innerHTML = "";

    if (!graph.nodes.length) {
      graphRoot.innerHTML = `<div class="empty-state"><p>No nodes match the current graph filter.</p></div>`;
      infoNode.innerHTML = "<strong>Graph filtered</strong><p>Try clearing search or relaxing the current filters.</p>";
      persistState();
      return;
    }

    const sections = [...new Set(graph.nodes.map((node) => node.section).filter(Boolean))];
    const colorLookup = new Map(sections.map((section, index) => [section!, sectionColors[index % sectionColors.length]]));

    const nodes = new DataSet(
      graph.nodes.map((node) => ({
        id: node.id,
        label: node.kind === "tag" && node.degree < 2 && graph.nodes.length > 16 ? "" : node.label,
        title: node.path || node.label,
        shape: "dot",
        size: node.radius * (node.kind === "tag" ? 1.15 : 1.65),
        url: node.url,
        path: node.path,
        kind: node.kind,
        section: node.section,
        font: {
          color: node.kind === "tag" ? "#bfd7ff" : "#f8fafc",
          size: node.kind === "tag" ? 16 : 18,
          face: "Space Grotesk",
        },
        color: node.kind === "tag"
          ? {
              background: "#1e293b",
              border: "#7dd3fc",
              highlight: { background: "#0f172a", border: "#f8fafc" },
            }
          : {
              background: colorLookup.get(node.section || "") ?? "#2563eb",
              border: "#f8fafc",
              highlight: { background: "#111827", border: "#f8fafc" },
            },
      })),
    );

    const edges = new DataSet(
      graph.links.map((link, index) => ({
        id: `${link.source}:${link.target}:${index}`,
        from: link.source,
        to: link.target,
        color: link.kind === "tag-link" ? "#26445a" : "#425b76",
        width: link.kind === "tag-link" ? 1 : 1.6,
        dashes: link.kind === "tag-link",
        smooth: false,
      })),
    );

    network = new Network(
      graphRoot,
      { nodes, edges },
      {
        autoResize: true,
        physics: {
          enabled: true,
          stabilization: { iterations: 180, fit: true },
          barnesHut: {
            gravitationalConstant: -5200,
            springLength: 150,
            springConstant: 0.035,
            avoidOverlap: 0.2,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 120,
          navigationButtons: false,
        },
        nodes: {
          borderWidth: 1.4,
        },
      },
    );

    network.once("stabilized", () => {
      network?.fit({ animation: { duration: 300 } });
    });

    network.on("hoverNode", ({ node }) => highlightNeighbors(node, graph, nodes, edges, infoNode));
    network.on("blurNode", () => clearHighlight(graph, nodes, edges, infoNode));
    network.on("click", ({ nodes: clickedNodes }) => {
      if (!clickedNodes.length) return;
      const target = nodeLookup.get(String(clickedNodes[0]));
      if (target?.url) {
        window.location.href = target.url;
      }
    });

    if (fitButton) {
      fitButton.onclick = () => network?.fit({ animation: { duration: 280 } });
    }

    if (resetButton) {
      resetButton.onclick = () => {
        searchInput.value = "";
        if (depthInput) depthInput.value = String(defaultDepth);
        if (sectionInput) sectionInput.value = "all";
        tagsInput.checked = defaultShowTags;
        persistState();
        render();
      };
    }

    clearHighlight(graph, nodes, edges, infoNode);
    persistState();
  };

  const persistState = () => {
    const nextState: StoredGraphState = {
      search: searchInput.value,
      showTags: tagsInput.checked,
      depth: Number(depthInput?.value || defaultDepth),
      section: sectionInput?.value || "all",
    };

    window.localStorage.setItem(stateKey, JSON.stringify(nextState));
  };

  searchInput.addEventListener("input", render);
  tagsInput.addEventListener("change", render);
  depthInput?.addEventListener("input", render);
  sectionInput?.addEventListener("change", render);

  render();
  host.dataset.graphReady = "true";
}

function buildFilteredGraph({
  rawGraph,
  adjacency,
  mode,
  focusPath,
  query,
  depth,
  includeTags,
  sectionFilter,
}: {
  rawGraph: GraphData;
  adjacency: Map<string, Set<string>>;
  mode: string;
  focusPath: string;
  query: string;
  depth: number;
  includeTags: boolean;
  sectionFilter: string;
}) {
  const focusId = `note:${focusPath}`;
  let baseNodes = rawGraph.nodes;
  let baseLinks = rawGraph.links;

  if (mode === "local" && focusPath) {
    const included = new Set([focusId]);
    let frontier = new Set([focusId]);

    for (let currentDepth = 0; currentDepth < depth; currentDepth += 1) {
      const next = new Set<string>();

      frontier.forEach((nodeId) => {
        (adjacency.get(nodeId) || []).forEach((neighborId) => {
          if (!included.has(neighborId)) {
            included.add(neighborId);
            next.add(neighborId);
          }
        });
      });

      frontier = next;
    }

    baseNodes = rawGraph.nodes.filter((node) => included.has(node.id));
    const nodeIds = new Set(baseNodes.map((node) => node.id));
    baseLinks = rawGraph.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));

    if (includeTags) {
      const tagLinks = rawGraph.links.filter(
        (link) => link.kind === "tag-link" && nodeIds.has(link.source),
      );
      const tagIds = new Set(tagLinks.map((link) => link.target));
      baseNodes = [
        ...baseNodes,
        ...rawGraph.nodes.filter((node) => tagIds.has(node.id)),
      ];
      baseLinks = [...baseLinks, ...tagLinks];
    }
  } else if (!includeTags) {
    baseNodes = rawGraph.nodes.filter((node) => node.kind !== "tag");
    const nodeIds = new Set(baseNodes.map((node) => node.id));
    baseLinks = rawGraph.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  }

  if (sectionFilter !== "all") {
    const allowedIds = new Set(
      baseNodes
        .filter((node) => node.kind === "tag" || node.section === sectionFilter)
        .map((node) => node.id),
    );

    baseNodes = baseNodes.filter((node) => allowedIds.has(node.id));
    baseLinks = baseLinks.filter((link) => allowedIds.has(link.source) && allowedIds.has(link.target));
  }

  if (!query) {
    return { nodes: baseNodes, links: baseLinks };
  }

  const matchingIds = new Set(
    baseNodes
      .filter((node) =>
        [node.label, node.path || "", node.sectionLabel || "", (node.tags || []).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .map((node) => node.id),
  );

  baseLinks.forEach((link) => {
    if (matchingIds.has(link.source) || matchingIds.has(link.target)) {
      matchingIds.add(link.source);
      matchingIds.add(link.target);
    }
  });

  return {
    nodes: baseNodes.filter((node) => matchingIds.has(node.id)),
    links: baseLinks.filter((link) => matchingIds.has(link.source) && matchingIds.has(link.target)),
  };
}

function buildAdjacency(links: GraphLink[]) {
  const adjacency = new Map<string, Set<string>>();

  const connect = (source: string, target: string) => {
    const list = adjacency.get(source) || new Set<string>();
    list.add(target);
    adjacency.set(source, list);
  };

  links.forEach((link) => {
    connect(link.source, link.target);
    connect(link.target, link.source);
  });

  return adjacency;
}

function highlightNeighbors(
  nodeId: string,
  graph: GraphData,
  nodes: DataSet<any>,
  edges: DataSet<any>,
  infoNode: HTMLElement,
) {
  const activeIds = new Set<string>([nodeId]);
  const activeEdges = new Set<string>();

  graph.links.forEach((link, index) => {
    if (link.source === nodeId || link.target === nodeId) {
      activeIds.add(link.source);
      activeIds.add(link.target);
      activeEdges.add(`${link.source}:${link.target}:${index}`);
    }
  });

  nodes.forEach((node) => {
    nodes.update({
      id: node.id,
      opacity: activeIds.has(String(node.id)) ? 1 : 0.18,
      font: {
        ...(node.font || {}),
        color: activeIds.has(String(node.id)) ? "#f8fafc" : "#6b7280",
      },
    });
  });

  edges.forEach((edge) => {
    edges.update({
      id: edge.id,
      color: activeEdges.has(String(edge.id)) ? "#f8fafc" : "#243042",
      width: activeEdges.has(String(edge.id)) ? 2.8 : edge.width,
    });
  });

  const target = graph.nodes.find((node) => node.id === nodeId);
  infoNode.innerHTML = target
    ? `<strong>${escapeHtml(target.label)}</strong><p>${escapeHtml(target.path || target.sectionLabel || "Connected node")}</p>`
    : "<strong>Hover a node</strong><p>Click a note or tag node to open it. Drag to reposition and scroll to zoom.</p>";
}

function clearHighlight(
  graph: GraphData,
  nodes: DataSet<any>,
  edges: DataSet<any>,
  infoNode: HTMLElement,
) {
  nodes.forEach((node) => {
    nodes.update({
      id: node.id,
      opacity: 1,
      font: {
        ...(node.font || {}),
        color: node.kind === "tag" ? "#bfd7ff" : "#f8fafc",
      },
    });
  });

  edges.forEach((edge) => {
    edges.update({
      id: edge.id,
      color: edge.dashes ? "#26445a" : "#425b76",
      width: edge.dashes ? 1 : 1.6,
    });
  });

  infoNode.innerHTML =
    "<strong>Hover a node</strong><p>Click a note or tag node to open it. Drag to reposition and scroll to zoom.</p>";
}

function readState(key: string, fallback: StoredGraphState) {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;

    return {
      ...fallback,
      ...(JSON.parse(stored) as Partial<StoredGraphState>),
    };
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function initKnowledgeGraphs() {
  document.querySelectorAll<HTMLElement>(".graph-shell").forEach((host) => initKnowledgeGraph(host));
}

initKnowledgeGraphs();
