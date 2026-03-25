# Parsers

This directory contains extensible metadata parsers.

## How Parsers Work

Each parser handles a specific metadata field and decides how to validate and render it.

### Parser Interface

```typescript
interface MetadataParser {
  key: string; // Metadata field name
  render: (value: any) => string | Promise<string>; // Render function
  validate?: (value: any) => boolean; // Optional validation
  priority?: number; // Execution order (higher = first)
}
```

### How to Add a New Parser

1. Create a new file (e.g., `src/parsers/newfield.ts`)
2. Implement the `MetadataParser` interface
3. Export as default
4. Register in `src/parsers/index.ts`

**No other code changes required.**

## Current Parsers

### Rating Parser (`rating.ts`)
- **Field**: `rating`
- **Valid values**: 1-5 (integer)
- **Renders as**: Star symbols (★/☆)

Example:
```yaml
rating: 4
```
Renders as: ★★★★☆

### Score Parser (`score.ts`)
- **Field**: `score`
- **Valid values**: 0-10 (number)
- **Renders as**: `{value}/10`

Example:
```yaml
score: 8.5
```
Renders as: `8.5/10`

### Status Parser (`status.ts`)
- **Field**: `status`
- **Valid values**: `draft`, `final`, `idea`
- **Renders as**: `[STATUS]` (uppercase)

Example:
```yaml
status: draft
```
Renders as: `[DRAFT]`

## Registry

All parsers are registered in `src/parsers/index.ts` and automatically sorted by priority.

To add a new parser:

```typescript
// In index.ts
import newParser from "./newfield";

export const parserRegistry: MetadataParser[] = [
  ratingParser,
  scoreParser,
  statusParser,
  newParser, // Add here
].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
```
