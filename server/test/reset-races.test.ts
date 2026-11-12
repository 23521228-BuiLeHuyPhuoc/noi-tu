import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Auth, hashPassword } from '../src/auth';
import { MemoryStore, MongoStore, type ResetRecord, type UserRecord } from '../src/store';

async function setup() {
  const store = new MemoryStore();
  const user = await store.createUser({ username: 'anna', email: 'an@example.com', displayName: 'An', avatar: 0, ...await hashPassword('secret1') }) as UserRecord;
  const record = { userId: user.id, generation: 'old-generation', codeHash: createHash('sha256').update(user.id + ':123456').digest('hex'), expiresAt: new Date(Date.now() + 600000), attempts: 0, sentAt: [new Date()] };
  await store.saveReset(record);
  return { store, user, record, auth: new Auth(store) };
}

it('a correct snapshot cannot consume a resend even if the six-digit code repeats', async () => {
  const { store, record, auth } = await setup();
  const get = store.getReset.bind(store);
  vi.spyOn(store, 'getReset').mockImplementationOnce(async id => {
    const observed = await get(id);
    await store.saveReset({ ...record, generation: 'replacement' } as ResetRecord);
    return observed;
  });
  expect((await auth.reset({ who: 'anna', code: '123456', password: 'secret2' })).ack).toEqual({ ok: false, error: 'code_expired' });
  expect(await get(record.userId)).toMatchObject({ generation: 'replacement' });
});

it('a correct snapshot cannot consume after the fifth failure increment before cleanup', async () => {
  const { store, record, auth } = await setup();
  await store.saveReset({ ...record, attempts: 4 });
  const get = store.getReset.bind(store);
  vi.spyOn(store, 'getReset').mockImplementationOnce(async id => {
    const observed = await get(id);
    await store.bumpResetAttempts(id, record.generation, new Date());
    return observed;
  });
  expect((await auth.reset({ who: 'anna', code: '123456', password: 'secret2' })).ack).toEqual({ ok: false, error: 'code_expired' });
  expect((await get(record.userId))?.attempts).toBe(5);
});

it('an expired snapshot cannot delete a replacement generation', async () => {
  const { store, record, auth } = await setup();
  await store.saveReset({ ...record, expiresAt: new Date(0) });
  const get = store.getReset.bind(store);
  vi.spyOn(store, 'getReset').mockImplementationOnce(async id => {
    const observed = await get(id);
    await store.saveReset({ ...record, generation: 'replacement' } as ResetRecord);
    return observed;
  });
  expect((await auth.reset({ who: 'anna', code: '123456', password: 'secret2' })).ack).toEqual({ ok: false, error: 'code_expired' });
  expect(await get(record.userId)).toMatchObject({ generation: 'replacement' });
});

it('Mongo initializes send history with equality-only upsert, then conditionally reserves without upsert', async () => {
  const history = { updateOne: vi.fn().mockResolvedValue({}), findOneAndUpdate: vi.fn().mockResolvedValue({ sentAt: [new Date()] }) };
  const store = Reflect.construct(MongoStore, [{}, {}, {}, {}, {}, history]) as MongoStore;
  expect(await store.reserveResetSend('user', new Date())).toHaveLength(1);
  expect(history.updateOne).toHaveBeenCalledWith({ userId: 'user' }, { $setOnInsert: { userId: 'user', sentAt: [] } }, { upsert: true });
  expect(history.findOneAndUpdate.mock.calls[0][0]).toHaveProperty('$expr');
  expect(history.findOneAndUpdate.mock.calls[0][2]).toEqual({ returnDocument: 'after' });
});
it('a wrong snapshot cannot increment or delete a replacement generation', async () => {
  const { store, record, auth } = await setup();
  const get = store.getReset.bind(store);
  vi.spyOn(store, 'getReset').mockImplementationOnce(async id => {
    const observed = await get(id);
    await store.saveReset({ ...record, generation: 'replacement' } as ResetRecord);
    return observed;
  });
  expect((await auth.reset({ who: 'anna', code: '000000', password: 'secret2' })).ack).toEqual({ ok: false, error: 'code_expired' });
  expect(await get(record.userId)).toMatchObject({ generation: 'replacement', attempts: 0 });
});

it('Mongo conditions attempt increments and consumption on generation, expiry and budget', async () => {
  const resets = { findOneAndUpdate: vi.fn().mockResolvedValue({ attempts: 5 }), deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }) };
  const store = Reflect.construct(MongoStore, [{}, {}, {}, {}, resets, {}]) as MongoStore;
  const now = new Date();
  const condition = { userId: 'user', generation: 'generation', expiresAt: { $gt: now }, attempts: { $lt: 5 } };
  expect(await store.bumpResetAttempts('user', 'generation', now)).toBe(5);
  expect(resets.findOneAndUpdate).toHaveBeenCalledWith(condition, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
  expect(await store.consumeReset('user', 'generation', now)).toBe(true);
  expect(resets.deleteOne).toHaveBeenLastCalledWith(condition);
  await store.deleteReset('user', 'generation');
  expect(resets.deleteOne).toHaveBeenLastCalledWith({ userId: 'user', generation: 'generation' });
});

it('Mongo tolerates a concurrent history initializer and returns null when reservation loses', async () => {
  const history = { updateOne: vi.fn().mockRejectedValue({ code: 11000 }), findOneAndUpdate: vi.fn().mockResolvedValue(null) };
  const store = Reflect.construct(MongoStore, [{}, {}, {}, {}, {}, history]) as MongoStore;
  expect(await store.reserveResetSend('user', new Date())).toBeNull();
  expect(history.findOneAndUpdate).toHaveBeenCalledOnce();
});
it('legacy resets without a generation expire safely without deleting a replacement', async () => {
  const { store, record, auth } = await setup();
  const { generation: _generation, ...legacy } = record;
  await store.saveReset(legacy as ResetRecord);
  const get = store.getReset.bind(store);
  vi.spyOn(store, 'getReset').mockImplementationOnce(async id => {
    const observed = await get(id);
    await store.saveReset({ ...record, generation: 'replacement' });
    return observed;
  });
  expect((await auth.reset({ who: 'anna', code: '123456', password: 'secret2' })).ack).toEqual({ ok: false, error: 'code_expired' });
  expect(await get(record.userId)).toMatchObject({ generation: 'replacement' });
});
