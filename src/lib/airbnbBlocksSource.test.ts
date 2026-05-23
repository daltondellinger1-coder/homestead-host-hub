import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAirbnbBlocks.ts'), 'utf8');

describe('public channel block feed source', () => {
  it('uses the public sanitized blocked-ranges RPC instead of direct calendar_events SELECT', () => {
    expect(source).toContain('get_all_blocked_ranges');
    expect(source).not.toContain("from('calendar_events')");
    expect(source).not.toContain('source=eq.airbnb');
  });
});
