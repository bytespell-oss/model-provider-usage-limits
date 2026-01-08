# Picocolors Style Guide

Lightweight CLI coloring with zero fancy UI - just colored text output.

## Installation

```bash
npm install picocolors
```

## Basic Usage

```typescript
import pc from 'picocolors';

// Colors
console.log(pc.red('Error!'));
console.log(pc.green('Success!'));
console.log(pc.yellow('Warning'));
console.log(pc.cyan('Info'));

// Modifiers
console.log(pc.bold('Important'));
console.log(pc.dim('Secondary'));

// Combinations
console.log(pc.bold(pc.red('Critical Error')));
```

## CLI Pattern

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import pc from 'picocolors';

function colorByUsage(percent: number, text: string): string {
  if (percent >= 80) return pc.red(text);
  if (percent >= 50) return pc.yellow(text);
  return pc.green(text);
}

function main() {
  const { values } = parseArgs({
    options: {
      demo: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(`
${pc.bold('my-cli')} - Description

${pc.dim('Options:')}
  --demo    Show demo with sample data
  --help    Show this help
`);
    return;
  }

  // Demo mode with sample data
  if (values.demo) {
    console.log(pc.bold('provider-name') + ':');
    console.log(`  ${pc.dim('usage:')} ${colorByUsage(45, '45%')}`);
    return;
  }

  // Real implementation...
}

main();
```

## Sample Output Format

```
provider-name:
  usage: 45%
  limit: 100 requests

another-provider:
  usage: 85%
  limit: 50 requests
```

## When to Use

- Small libraries where bundle size matters
- Simple CLI tools with straightforward output
- When you don't need spinners, progress bars, or boxes
- Scripts and utilities

## Pros & Cons

**Pros:**
- ~3KB, zero dependencies
- Fast, simple API
- Works everywhere

**Cons:**
- No spinners or progress indicators
- No box drawing or structured layouts
- Manual formatting required
