# @clack/prompts Style Guide

Polished CLI UI with spinners, boxes, and structured output.

## Installation

```bash
npm install @clack/prompts picocolors
```

## Basic Usage

```typescript
import * as p from '@clack/prompts';
import pc from 'picocolors';

// Intro/outro banners
p.intro(pc.bgCyan(pc.black(' my-cli ')));
p.outro(pc.green('Done!'));

// Spinners
const s = p.spinner();
s.start('Loading data');
// ... do work
s.stop('Data loaded');

// Notes (boxes)
p.note('Content here', 'Title');

// Log messages
p.log.info('Information');
p.log.warn('Warning');
p.log.error('Error');
p.log.success('Success');
```

## Output Structure

```
┌  my-cli 
│
◇  Data loaded
│
◇  Results ──────────────╮
│                        │
│  Content line 1        │
│  Content line 2        │
│                        │
├────────────────────────╯
│
└  Done!
```

## CLI Pattern

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as p from '@clack/prompts';
import pc from 'picocolors';

function colorByUsage(percent: number, text: string): string {
  if (percent >= 80) return pc.red(text);
  if (percent >= 50) return pc.yellow(text);
  return pc.green(text);
}

async function main() {
  const { values } = parseArgs({
    options: {
      demo: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(`
${pc.bold('my-cli')} - Description

${pc.dim('Options:')}
  --demo    Show demo with sample data
  --json    Output JSON (no fancy UI)
  --help    Show this help
`);
    return;
  }

  // JSON mode - skip fancy output
  if (values.json) {
    const data = values.demo ? getDemoData() : await fetchRealData();
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Interactive mode with clack
  p.intro(pc.bgCyan(pc.black(' my-cli ')));

  const s = p.spinner();
  s.start(values.demo ? 'Loading demo data' : 'Fetching data');

  // Simulate delay in demo mode
  if (values.demo) {
    await new Promise(r => setTimeout(r, 800));
  }

  const data = values.demo ? getDemoData() : await fetchRealData();
  s.stop('Data retrieved');

  // Format output
  const lines = data.map(item => 
    `${pc.cyan(item.name)}\n  ${pc.dim('usage:')} ${colorByUsage(item.usage, `${item.usage}%`)}`
  );

  p.note(lines.join('\n\n'), 'Results');

  p.outro(pc.green('Done!'));
}

main().catch(error => {
  p.outro(pc.red(`Error: ${error.message}`));
  process.exit(1);
});
```

## Demo Data Pattern

```typescript
interface DemoItem {
  name: string;
  usage: number;
}

function getDemoData(): DemoItem[] {
  return [
    { name: 'provider-a', usage: 45 },
    { name: 'provider-b', usage: 60 },
    { name: 'provider-c', usage: 85 },
  ];
}
```

## When to Use

- User-facing CLI tools
- Tools that benefit from visual feedback (spinners)
- When you want polished, professional output
- Interactive CLIs with multiple steps

## Pros & Cons

**Pros:**
- Beautiful, consistent output
- Built-in spinners, progress, prompts
- Box drawing for structured data
- Professional appearance

**Cons:**
- ~50KB bundle size
- Overkill for simple scripts
- Async patterns required for spinners

## Recording Tips

When recording demos with clack:

1. The spinner creates animation frames - these add noise to cast files
2. Create cast files showing the final output state, not spinner frames
3. Use appropriate delays to simulate spinner duration without actual frames

Example cast file entry (skip spinner, show result):
```json
[0.5, "o", "┌  my-cli \r\n"]
[0.6, "o", "│\r\n"]
[0.9, "o", "◇  Data loaded\r\n"]
```
