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

const sectionColors = ["#2563eb", "#0f766e", "#9333ea", "#d97706", "#dc2626", "#0891b2"];

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
  const detailsHost = host.closest("details");

  if (!dataNode || !graphRoot || !infoNode || !searchInput || !tagsInput) return;

  const rawGraph = JSON.parse(dataNode.textContent || '{"nodes":[],"links":[]}') as GraphData;
  const mode = host.dataset.mode || "global";
  const focusPath = host.dataset.focusPath || "";
  const defaultDepth = Number(host.dataset.initialDepth || "2");
  const defaultShowTags = host.dataset.showTags === "true";
  const stateKey = `knowledge-graph:${host.dataset.graphId || "default"}`;

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
  let resizeFrame = 0;

  graphRoot.style.height = mode === "global" ? "30rem" : "24rem";
  graphRoot.style.maxHeight = mode === "global" ? "30rem" : "24rem";

  const persistState = () => {
    const nextState: StoredGraphState = {
      search: searchInput.value,
      showTags: tagsInput.checked,
      depth: Number(depthInput?.value || defaultDepth),
      section: sectionInput?.value || "all",
    };

    window.localStorage.setItem(stateKey, JSON.stringify(nextState));
  };

  const destroyGraph = () => {
    if (network) {
      network.destroy();
      network = undefined;
    }
  };

  const render = () => {
    if (!graphRoot.isConnected) return;
    if (detailsHost && !detailsHost.open) {
      destroyGraph();
      return;
    }

    const width = graphRoot.clientWidth;
    if (!width) {
      window.requestAnimationFrame(render);
      return;
    }

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

    destroyGraph();
    graphRoot.innerHTML = "";

    if (!graph.nodes.length) {
      graphRoot.innerHTML = `<div class="flex h-full items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-6 text-sm text-base-content/60">No nodes match the current graph filter.</div>`;
      infoNode.innerHTML = "<strong>Graph filtered</strong><p>Try clearing search or relaxing the current filters.</p>";
      persistState();
      return;
    }

    const sections = [...new Set(graph.nodes.map((node) => node.section).filter(Boolean))];
    const colorLookup = new Map(sections.map((section, index) => [section!, sectionColors[index % sectionColors.length]]));

    const nodes = new DataSet(
      graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        title: node.path || node.label,
        shape: "dot",
        size: node.kind === "tag" ? 13 : Math.max(16, node.radius * 1.8),
        url: node.url,
        kind: node.kind,
        section: node.section,
        font: {
          color: node.kind === "tag" ? "#dbeafe" : "#f8fafc",
          size: node.kind === "tag" ? 14 : 17,
          face: "Space Grotesk",
          strokeWidth: 0,
        },
        color:
          node.kind === "tag"
            ? {
                background: "#122033",
                border: "#38bdf8",
                highlight: { background: "#1d4ed8", border: "#e2e8f0" },
              }
            : {
                background: colorLookup.get(node.section || "") ?? "#2563eb",
                border: "#dbeafe",
                highlight: { background: "#0f172a", border: "#f8fafc" },
              },
      })),
    );

    const edges = new DataSet(
      graph.links.map((link, index) => ({
        id: `${link.source}:${link.target}:${index}`,
        from: link.source,
        to: link.target,
        color: link.kind === "tag-link" ? "#29506c" : "#4b5f7a",
        width: link.kind === "tag-link" ? 1 : 1.8,
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
          stabilization: { iterations: 160, fit: true },
          barnesHut: {
            gravitationalConstant: -5200,
            springLength: 145,
            springConstant: 0.032,
            avoidOverlap: 0.35,
          },
        },
        interaction: {
          hover: true,
          dragView: true,
          zoomView: true,
        },
        nodes: {
          borderWidth: 1.4,
        },
      },
    );

    network.once("stabilized", () => {
      network?.fit({ animation: { duration: 260 } });
    });

    network.on("hoverNode", ({ node }) => highlightNeighbors(node, graph, nodes, edges, infoNode));
    network.on("blurNode", () => clearHighlight(graph, nodes, edges, infoNode));
    network.on("click", ({ nodes: clicked }) => {
      if (!clicked.length) return;
      const target = nodeLookup.get(String(clicked[0]));
      if (target?.url) {
        window.location.href = target.url;
      }
    });

    clearHighlight(graph, nodes, edges, infoNode);
    persistState();
  };

  const rerender = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(render);
  };

  searchInput.addEventListener("input", rerender);
  tagsInput.addEventListener("change", rerender);
  depthInput?.addEventListener("input", rerender);
  sectionInput?.addEventListener("change", rerender);

  if (fitButton) {
    fitButton.onclick = () => network?.fit({ animation: { duration: 240 } });
  }

  if (resetButton) {
    resetButton.onclick = () => {
      searchInput.value = "";
      tagsInput.checked = defaultShowTags;
      if (depthInput) depthInput.value = String(defaultDepth);
      if (sectionInput) sectionInput.value = "all";
      rerender();
    };
  }

  detailsHost?.addEventListener("toggle", () => {
    if (detailsHost.open) {
      rerender();
    } else {
      destroyGraph();
    }
  });

  window.addEventListener("resize", rerender, { passive: true });

  if (!detailsHost || detailsHost.open) {
    render();
  }

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
  const focusId = resolveFocusId(rawGraph.nodes, focusPath);
  let baseNodes = rawGraph.nodes;
  let baseLinks = rawGraph.links;

  if (mode === "local" && focusId) {
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
      const tagLinks = rawGraph.links.filter((link) => link.kind === "tag-link" && nodeIds.has(link.source));
      const tagIds = new Set(tagLinks.map((link) => link.target));
      baseNodes = [...baseNodes, ...rawGraph.nodes.filter((node) => tagIds.has(node.id))];
      baseLinks = [...baseLinks, ...tagLinks];
    }
  } else if (!includeTags) {
    baseNodes = rawGraph.nodes.filter((node) => node.kind !== "tag");
    const nodeIds = new Set(baseNodes.map((node) => node.id));
    baseLinks = rawGraph.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  }

  if (sectionFilter !== "all") {
    const allowedIds = new Set(
      baseNodes.filter((node) => node.kind === "tag" || node.section === sectionFilter).map((node) => node.id),
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

function highlightNeighbors(nodeId: string, graph: GraphData, nodes: DataSet<any>, edges: DataSet<any>, infoNode: HTMLElement) {
  const relatedIds = new Set<string>([nodeId]);

  graph.links.forEach((link) => {
    if (link.source === nodeId || link.target === nodeId) {
      relatedIds.add(link.source);
      relatedIds.add(link.target);
    }
  });

  nodes.forEach((node) => {
    nodes.update({
      id: node.id,
      hidden: !relatedIds.has(String(node.id)) && String(node.id) !== nodeId,
    });
  });

  window.setTimeout(() => {
    nodes.forEach((node) => nodes.update({ id: node.id, hidden: false }));
  }, 140);

  const active = graph.nodes.find((node) => node.id === nodeId);
  infoNode.innerHTML = active
    ? `<strong>${escapeHtml(active.label)}</strong><p>${escapeHtml(active.path || active.sectionLabel || "Connected node")}</p>`
    : "<strong>Start exploring</strong><p>Hover for context, click to open, drag to reposition, and scroll to zoom.</p>";

  edges.forEach((edge) => {
    edges.update({
      id: edge.id,
      color: String(edge.id).includes(nodeId) ? "#e2e8f0" : edge.dashes ? "#29506c" : "#4b5f7a",
      width: String(edge.id).includes(nodeId) ? 2.6 : edge.dashes ? 1 : 1.8,
    });
  });
}

function clearHighlight(graph: GraphData, nodes: DataSet<any>, edges: DataSet<any>, infoNode: HTMLElement) {
  nodes.forEach((node) => {
    nodes.update({ id: node.id, hidden: false });
  });

  edges.forEach((edge) => {
    edges.update({
      id: edge.id,
      color: edge.dashes ? "#29506c" : "#4b5f7a",
      width: edge.dashes ? 1 : 1.8,
    });
  });

  infoNode.innerHTML =
    "<strong>Start exploring</strong><p>Hover for context, click to open, drag to reposition, and scroll to zoom.</p>";
}

function resolveFocusId(nodes: GraphNode[], focusPath: string) {
  if (!focusPath) return "";

  const direct = `note:${focusPath}`;
  if (nodes.some((node) => node.id === direct)) return direct;

  const normalized = normalizeGraphValue(focusPath);
  const fallback = nodes.find(
    (node) => node.kind === "note" && normalizeGraphValue(node.path || "") === normalized,
  );

  return fallback?.id ?? direct;
}

function normalizeGraphValue(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function readState(key: string, fallback: StoredGraphState) {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    return { ...fallback, ...(JSON.parse(stored) as Partial<StoredGraphState>) };
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
