import path from "node:path";
import { readFile } from "node:fs/promises";
import { getSiteData } from "../../lib/site-data";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function getStaticPaths() {
  const siteData = await getSiteData();

  return siteData.assets.map((asset) => ({
    params: {
      path: asset.relativePath.split("/").map(encodeURIComponent).join("/"),
    },
    props: {
      sourcePath: asset.sourcePath,
    },
  }));
}

export async function GET({ props }: { props: { sourcePath: string } }) {
  const buffer = await readFile(props.sourcePath);
  const extension = path.extname(props.sourcePath).toLowerCase();

  return new Response(buffer, {
    headers: {
      "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
