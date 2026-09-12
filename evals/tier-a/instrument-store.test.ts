/**
 * The exact commands the instrument sends to Redis, and the exact keys it sends them to.
 *
 * A separate file from `instrument.test.ts` because it mocks `lib/redis`, and a module
 * mock is hoisted over the whole file — the rest of the instrument's tests want the real
 * "there is no store, do nothing" path and must not be run under a fake one.
 *
 * WHY THIS IS WORTH TESTING AT ALL. Nobody is going to open a Redis on a Coolify host to
 * check that a key is named what the report thinks it is named. If the writer and the
 * reader ever disagree about a key, the failure is silent and total: the report renders a
 * page of zeroes and reads as a site nobody visited. That exact confusion has already
 * happened once here, against an unreachable store, on the first live run of this code.
 * These tests are the only thing standing between that and a repeat.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Command = [string, ...unknown[]];

const commands: Command[] = [];
let execResult: [Error | null, unknown][] | null = [];

const pipeline = {
  hincrby: (...args: unknown[]) => push('hincrby', args),
  pfadd: (...args: unknown[]) => push('pfadd', args),
  expire: (...args: unknown[]) => push('expire', args),
  hgetall: (...args: unknown[]) => push('hgetall', args),
  pfcount: (...args: unknown[]) => push('pfcount', args),
  exec: async () => execResult,
};

function push(name: string, args: unknown[]) {
  commands.push([name, ...args]);
  return pipeline;
}

vi.mock('../../lib/redis', () => ({
  getRedisClient: () => ({ pipeline: () => pipeline }),
  resetRedisForTests: () => {},
}));

const { dayKey, read, recordAsk, recordOutcome, recordStop, recordView } = await import(
  '../../lib/instrument/counters'
);

/** Waits for the fire-and-forget `exec()` promise chain to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  commands.length = 0;
  execResult = [];
});

const day = dayKey();
const only = (name: string) => commands.filter(([c]) => c === name);

describe('what a view writes', () => {
  it('increments the day\'s view count and adds the address hash to the sketch', async () => {
    recordView({ ipHash: 'deadbeefdeadbeef', bot: false });
    await settle();
    expect(only('hincrby')).toEqual([['hincrby', `mjk:i:${day}:n`, 'views', 1]]);
    expect(only('pfadd')).toEqual([['pfadd', `mjk:i:${day}:viewers`, 'deadbeefdeadbeef']]);
  });

  it('counts a crawler in its own bucket and keeps it out of the distinct count', async () => {
    recordView({ ipHash: 'deadbeefdeadbeef', bot: true });
    await settle();
    expect(only('hincrby')).toEqual([['hincrby', `mjk:i:${day}:n`, 'views_bot', 1]]);
    // A crawler in the sketch would inflate the denominator of the one ratio this whole
    // instrument exists to produce.
    expect(only('pfadd')).toEqual([]);
  });

  it('counts a view it cannot attribute, rather than dropping it', async () => {
    recordView({ ipHash: null, bot: false });
    await settle();
    expect(only('hincrby')).toHaveLength(1);
    expect(only('pfadd')).toEqual([]);
  });

  it('gives every key it touches the same ninety-day expiry, once each', async () => {
    recordView({ ipHash: 'deadbeefdeadbeef', bot: false });
    await settle();
    const ttl = 90 * 24 * 60 * 60;
    expect(only('expire')).toEqual([
      ['expire', `mjk:i:${day}:n`, ttl],
      ['expire', `mjk:i:${day}:viewers`, ttl],
    ]);
  });
});

describe('what an ask writes', () => {
  it('writes the count, the origin and the depth against one day', async () => {
    recordAsk({ ipHash: 'abcdef0123456789', origin: 'card', depth: 1 });
    await settle();
    expect(only('hincrby')).toEqual([
      ['hincrby', `mjk:i:${day}:n`, 'asks', 1],
      ['hincrby', `mjk:i:${day}:origin`, 'card', 1],
      ['hincrby', `mjk:i:${day}:depth`, '1', 1],
    ]);
    expect(only('pfadd')).toEqual([['pfadd', `mjk:i:${day}:askers`, 'abcdef0123456789']]);
  });

  it('buckets a long conversation at 4plus rather than growing a field per question', async () => {
    for (const depth of [4, 9, 400]) {
      commands.length = 0;
      recordAsk({ ipHash: null, origin: 'typed', depth });
      await settle();
      expect(commands).toContainEqual(['hincrby', `mjk:i:${day}:depth`, '4plus', 1]);
    }
  });

  it('never writes a field name a visitor could have chosen', async () => {
    // Every caller passes a closed union today. This is the guard for the day one does not:
    // a Redis hash whose field names are attacker-controlled strings would turn a counter
    // into a store of what somebody typed, which is the one thing this module promises it
    // is not.
    recordStop('work; FLUSHALL');
    recordStop('a'.repeat(64));
    recordStop('Work');
    await settle();
    expect(only('hincrby')).toEqual([]);

    commands.length = 0;
    recordStop('rd350');
    await settle();
    expect(only('hincrby')).toEqual([['hincrby', `mjk:i:${day}:stop`, 'rd350', 1]]);
  });

  it('writes an outcome to its own hash', async () => {
    recordOutcome('salvaged');
    await settle();
    expect(only('hincrby')).toEqual([['hincrby', `mjk:i:${day}:outcome`, 'salvaged', 1]]);
  });
});

describe('what the reader asks for, against what the writer wrote', () => {
  it('reads back the same seven keys per day that the writers touch', async () => {
    execResult = [];
    await read(1).catch(() => null);
    const keys = commands.filter(([c]) => c === 'hgetall' || c === 'pfcount').map(([, key]) => key);
    // The five hashes and the two sketches, by the names the writers above used.
    expect(keys.slice(0, 7)).toEqual([
      `mjk:i:${day}:n`,
      `mjk:i:${day}:origin`,
      `mjk:i:${day}:depth`,
      `mjk:i:${day}:stop`,
      `mjk:i:${day}:outcome`,
      `mjk:i:${day}:viewers`,
      `mjk:i:${day}:askers`,
    ]);
  });

  it('turns a stored day into the shape the report renders', async () => {
    execResult = [
      [null, { views: '412', views_bot: '133', asks: '21' }],
      [null, { card: '12', chip: '5', typed: '4' }],
      [null, { '1': '14', '2': '4' }],
      [null, { work: '9' }],
      [null, { verified: '18' }],
      [null, 210],
      [null, 12],
      [null, 255], // window union, viewers
      [null, 14], // window union, askers
    ];
    const reading = (await read(1))!;
    expect(reading.days[0]).toMatchObject({
      views: 412,
      viewsBot: 133,
      viewers: 210,
      asks: 21,
      askers: 12,
      origin: { card: 12, chip: 5, typed: 4 },
    });
    expect(reading.uniqueViewers).toBe(255);
    expect(reading.uniqueAskers).toBe(14);
    expect(reading.reads.failed).toBe(0);
  });

  it('counts a failed command as failed rather than as a zero', async () => {
    // `pipeline.exec()` resolves rather than rejecting when its commands fail, which is
    // how an unreachable store first came to render as a site nobody had visited.
    execResult = [
      [new Error('Stream isn\'t writeable'), undefined],
      [new Error('Stream isn\'t writeable'), undefined],
      [null, {}],
      [null, {}],
      [null, {}],
      [null, 0],
      [null, 0],
      [null, 0],
      [null, 0],
    ];
    const reading = (await read(1))!;
    expect(reading.reads).toEqual({ failed: 2, total: 9 });
    expect(reading.days[0].views).toBe(0);
  });
});
