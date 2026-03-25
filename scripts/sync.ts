/**
 * Local Sync Script (Optional)
 * Syncs content from local Obsidian vault to src/content/imported/
 * 
 * Usage: npx ts-node scripts/sync.ts <path-to-obsidian-vault>
 */

import * as fs from "fs";
import * as path from "path";

const PUBLISH_FOLDER = "publish";
const IMPORTED_FOLDER = "src/content/imported";

interface SyncOptions {
  obsidianVaultPath: string;
  verbose?: boolean;
}

async function syncContent(options: SyncOptions) {
  const { obsidianVaultPath, verbose = false } = options;

  const publishPath = path.join(obsidianVaultPath, PUBLISH_FOLDER);

  if (!fs.existsSync(publishPath)) {
    console.error(
      `Error: publish folder not found at ${publishPath}`
    );
    process.exit(1);
  }

  if (verbose) {
    console.log(`📂 Syncing from: ${publishPath}`);
    console.log(`📂 Syncing to: ${IMPORTED_FOLDER}`);
  }

  // TODO: Implement sync logic
  // 1. Walk the publish folder
  // 2. Copy markdown files preserving structure
  // 3. Copy referenced images
  // 4. Validate frontmatter
  // 5. Report statistics

  console.log("✅ Sync complete");
}

// Parse CLI arguments
const vaultPath = process.argv[2];

if (!vaultPath) {
  console.error(
    "Usage: npx ts-node scripts/sync.ts <path-to-obsidian-vault>"
  );
  process.exit(1);
}

syncContent({ obsidianVaultPath: vaultPath, verbose: true }).catch(
  (error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  }
);
