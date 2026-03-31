export const siteConfig = {
  siteName: "Yash Tripathi",
  moniker: "Kakku",
  siteDescription:
    "Portfolio, experiments, and a writing subsite powered by an Obsidian-inspired knowledge system.",
  recentLimit: 6,
  featuredWritingLimit: 3,
  githubUrl: "https://github.com/DrKakku",
  profile: {
    name: "Yash Tripathi",
    title: "Engineer building atmospheric reading tools, knowledge systems, and experimental web experiences.",
    location: "Hyderabad, India",
    availability:
      "Open to collaborations across product engineering, creative tooling, and note-driven systems.",
    intro:
      "I design and build systems that make ideas feel alive on the web, from reading products and note engines to weird prototypes that start as journal entries and turn into software.",
    about: [
      "This site is meant to feel like both a portfolio and a living workshop.",
      "Projects show what I build. Writing shows how I think. Together they form one evolving system.",
    ],
  },
  navigation: [
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Writing", href: "/writing" },
    { label: "Resume", href: "/resume" },
  ],
  socialLinks: [
    { label: "GitHub", href: "https://github.com/DrKakku", kind: "external" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/yashtripathi19/", kind: "external" },
    { label: "Email", href: "mailto:yashtripathi10@gmail.com", kind: "external" },
  ],
  quickLinks: [
    { label: "Projects", href: "/projects", kind: "internal" },
    { label: "Writing", href: "/writing", kind: "internal" },
    { label: "Resume", href: "/resume", kind: "internal" },
  ],
  hero: {
    eyebrow: "Portfolio + Living Knowledge Base",
    headline: "Building reading experiences, experimental tools, and idea systems that keep evolving after launch.",
    lead:
      "A cinematic portfolio in front, an Obsidian-inspired writing system underneath, and projects that connect both worlds.",
    primaryCta: { label: "See Projects", href: "/projects" },
    secondaryCta: { label: "Enter Writing Space", href: "/writing" },
  },
  featuredProjectSlugs: ["almost-reader", "kakkus-diary"],
  featuredWritingPaths: [
    "ideas/ideas-for-this-website",
    "random-ideas/population-vaccume",
    "notes/rain-in-hyd-and-what-happens-after-that",
  ],
  writing: {
    showRelatedNotes: false,
    globalGraphDepth: 4,
    localGraphDepth: 2,
    showTagsInGraph: true,
  },
  sectionOverrides: {
    ideas: {
      description:
        "Raw sparks, future directions, and architecture notes that may later turn into products.",
      featured: true,
      order: 2,
    },
    notes: {
      description:
        "Observed moments, grounded reflections, and lived texture captured before it gets abstracted away.",
      featured: true,
      order: 1,
    },
    "random-ideas": {
      description:
        "Speculative writing, theorycrafting, and mental prototypes that sit between essays and invention.",
      featured: true,
      order: 3,
    },
  },
  footer: {
    manifesto:
      "I use this space as both a public portfolio and a connected note system. Projects show the polished surface. Writing reveals the experiments, false starts, and hidden links underneath.",
    caption:
      "Designed as a portfolio shell with an Obsidian-inspired writing engine nested inside it.",
  },
  resume: {
    href: "/resume",
    summary:
      "Product-minded engineer focused on immersive interfaces, content systems, and turning note-heavy workflows into polished experiences.",
    highlights: [
      "Builds static and dynamic web systems with strong information architecture.",
      "Explores the overlap between creative tooling, reading products, and knowledge design.",
      "Uses writing as part of the product surface rather than treating it as documentation afterthought.",
    ],
    skills: [
      "TypeScript",
      "Astro",
      "React",
      "Content Systems",
      "Creative Tooling",
      "Product Prototyping",
    ],
  },
} as const;
