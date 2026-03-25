/**
 * Metadata Parser System
 * Extensible core for handling custom metadata fields
 */

export interface MetadataParser {
  key: string;
  render: (value: any) => string | Promise<string>;
  validate?: (value: any) => boolean;
  priority?: number;
}

// Import individual parsers
import ratingParser from "./rating";
import scoreParser from "./score";
import statusParser from "./status";

/**
 * Parser Registry
 * All registered parsers are applied in priority order
 */
export const parserRegistry: MetadataParser[] = [
  ratingParser,
  scoreParser,
  statusParser,
].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

/**
 * Parse metadata using registered parsers
 */
export function parseMetadata(
  key: string,
  value: any
): string | Promise<string> | null {
  const parser = parserRegistry.find((p) => p.key === key);

  if (!parser) {
    return null;
  }

  if (parser.validate && !parser.validate(value)) {
    console.warn(`Validation failed for metadata key: ${key}`);
    return null;
  }

  return parser.render(value);
}

export { ratingParser, scoreParser, statusParser };
