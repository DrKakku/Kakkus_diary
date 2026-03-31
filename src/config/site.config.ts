export const siteConfig = {
  siteName: "Yash Tripathi",
  moniker: "Kakku",
  siteDescription:
    "Portfolio, experiments, and a writing subsite powered by an Obsidian-inspired knowledge system.",
  recentLimit: 6,
  featuredWritingLimit: 3,
  homeProjectTimelineLimit: 4,
  writingTimelineLimit: 6,
  githubUrl: "https://github.com/DrKakku",
  appearance: {
    defaultMode: "dark",
    accent: "cyan",
    themes: {
      light: "corporate",
      dark: "business",
    },
  },
  profile: {
    name: "Yash Tripathi",
    title: "Machine Learning Engineer building reliable AI systems, knowledge tools, and experimental web experiences.",
    location: "Hyderabad, India",
    availability:
      "Open to collaborations across AI engineering, product systems, and creative tooling.",
    intro:
      "I build scalable AI systems across RAG, NLP, FastAPI services, and enterprise workflows, while also exploring how knowledge tools and public writing can become stronger product surfaces.",
    about: [
      "My core work sits at the intersection of Generative AI, retrieval systems, backend engineering, and product thinking.",
      "This site still acts as both a portfolio and a living workshop: projects show what I build, and writing shows how I think through systems and experiments.",
    ],
    phone: "+91 97111 44473",
    email: "yashtripathi10@gmail.com",
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
    eyebrow: "AI Engineer + Living Knowledge Base",
    headline: "Building reliable RAG systems, enterprise AI products, and idea-driven tools that keep evolving after launch.",
    lead:
      "My work spans FastAPI services, retrieval pipelines, validation frameworks, and note-driven experiments, all gathered into one portfolio and writing system.",
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
    showLandingGraphByDefault: false,
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
      "I use this space as both a public portfolio and a connected note system. My professional work centers on AI engineering, RAG systems, and scalable backend services, while the writing area captures the experiments and hidden links behind that work.",
    caption:
      "Designed as a portfolio shell with an Obsidian-inspired writing engine nested inside it.",
  },
  resume: {
    href: "/resume",
    summary:
      "Machine Learning Engineer with 2+ years of experience in Generative AI, NLP, RAG systems, and MLOps. Skilled in building and deploying scalable AI systems using Python, FastAPI, AWS, and GCP with a strong focus on reliability, secure data handling, and performance.",
    highlights: [
      "Built enterprise RAG systems, LLM validation flows, and secure knowledge platforms across healthcare and internal documentation use cases.",
      "Experienced in FastAPI, LangChain, AWS S3, MongoDB, vector search, Locust-based performance testing, and containerized deployment workflows.",
      "Brings both delivery rigor and experimentation, balancing AI reliability, retrieval quality, and product usability.",
    ],
    skills: [
      "Python",
      "FastAPI",
      "LangChain",
      "RAG",
      "LLMs",
      "GenAI",
      "AWS",
      "GCP",
      "MongoDB",
      "Docker",
      "CI/CD",
      "PyTorch",
      "Scikit-learn",
    ],
    education: [
      "B.Tech, Computer Science Engineering (AI/ML), Vellore Institute of Technology, Chennai, graduated 2023.",
    ],
    certifications: [
      "Google Associate Cloud Engineer",
    ],
    experience: [
      {
        company: "Deloitte",
        role: "Consulting Analyst",
        period: "Sept 2023 – Present",
        points: [
          "Built enterprise RAG systems using LangChain, FastAPI, AWS S3, and vector retrieval for secure real-time knowledge access.",
          "Developed AI guardrails, reliability metrics, and a structured validation pipeline for scalable SME review.",
          "Led performance and scalability work with asynchronous FastAPI patterns, Locust testing, and containerized deployment workflows.",
          "Contributed to API and MLOps delivery across multiple concurrent ML projects with a focus on modularity and maintainability.",
        ],
      },
      {
        company: "IBM",
        role: "Cognitive Computing Intern",
        period: "Mar 2022 – Sep 2022",
        points: [
          "Built an IBM Watson NLP classifier reaching 95% F1-score for text and sentiment categorization.",
          "Processed large datasets with Selenium, NLTK, and Scikit-learn to derive usable insights.",
        ],
      },
      {
        company: "Mental Health Foundation India",
        role: "Software Development Intern",
        period: "May 2021 – Jul 2021",
        points: [
          "Built a full-stack mental health assessment tool with Flutter, Flask, and MongoDB in collaboration with AIIMS Delhi.",
        ],
      },
    ],
    selectedProjects: [
      {
        name: "Resume Optimizer (LLM)",
        points: [
          "Created a resume optimization platform powered by Gemini and Ollama LLMs, improving ATS compliance by 10–15 points.",
          "Delivered personalized keyword and phrasing insights through FastAPI-based API orchestration.",
        ],
      },
    ],
  },
} as const;
