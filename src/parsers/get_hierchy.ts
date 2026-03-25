function getHierarchy(slug: string) {
  const parts = slug.split("/");
  return {
    slug,
    folderPath: parts.slice(0, -1),
    fileName: parts.at(-1),
    depth: parts.length,
  };
}