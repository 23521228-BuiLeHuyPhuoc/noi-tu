import { describe, it, expect, afterEach } from 'vitest';
import { createGameServer, type GameServer } from '../src/app';
import { Dictionary } from '../src/dictionary';
import { MemoryStore } from '../src/store';
import { Auth } from '../src/auth';
import { Room } from '../src/room';
import { fileURLToPath } from 'node:url';

const servers: GameServer[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => s.close())); });
async function setup(uploader?: { upload: (data: Buffer, userId: string) => Promise<{secure_url:string;public_id:string}>; destroy?: (publicId: string) => Promise<void> }) {
  const store = new MemoryStore();
  const auth = new Auth(store);
  const registration = await auth.register({ username:'tester', password:'secret123', displayName:'Tester' });
  if (!registration.ack.ok) throw new Error('register');
  const server = createGameServer(new Dictionary([]), { store, avatarUploader:uploader });
  servers.push(server);
  await new Promise<void>(resolve => server.http.listen(0, '127.0.0.1', resolve));
  const address = server.http.address() as {port:number};
  return {store, auth, user:registration.ack.user, token:registration.ack.token, url:`http://127.0.0.1:${address.port}/api/avatar`};
}
function image(data: Uint8Array, type='image/png') { const form = new FormData(); form.append('avatar', new Blob([new Uint8Array(data)], {type}), 'avatar.png'); return form; }
const png = new Uint8Array([137,80,78,71,13,10,26,10,1]);

describe('avatar upload', () => {
  it('requires a valid existing bearer session', async () => {
    const {url} = await setup();
    expect((await fetch(url,{method:'POST'})).status).toBe(401);
  });
  it('returns 503 without optional Cloudinary configuration', async () => {
    const {url,token} = await setup();
    expect((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`}})).status).toBe(503);
  });
  it('/health báo avatarUploads theo cấu hình uploader', async () => {
    const off = await setup();
    expect((await (await fetch(off.url.replace('/api/avatar', '/health'))).json()).avatarUploads).toBe(false);
    const on = await setup({upload:async () => ({secure_url:'https://example.test/a.png',public_id:'x'})});
    expect((await (await fetch(on.url.replace('/api/avatar', '/health'))).json()).avatarUploads).toBe(true);
  });
  it('persists uploaded profile and retains numeric fallback across resume', async () => {
    let calls=0;
    let uploadedFor = '';
    const {url,token,store,auth,user} = await setup({upload:async (_data, userId) => { calls++; uploadedFor = userId; return {secure_url:'https://example.test/avatar.png',public_id:`xomlay/avatars/${userId}`}; }});
    const response = await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:image(png)});
    expect(response.status).toBe(200);
    expect(calls).toBe(1);
    expect(uploadedFor).toBe(user.id);
    expect((await store.userById(user.id))?.avatarPublicId).toBe(`xomlay/avatars/${user.id}`);
    const resumed = await auth.resume(token);
    expect(resumed.ack.ok && resumed.ack.user.avatarUrl).toBe('https://example.test/avatar.png');
    expect(resumed.ack.ok && resumed.ack.user.avatar).toBe(user.avatar);
  });
  it('rejects forged MIME and oversized bodies before contacting uploader', async () => {
    for (const [bytes,status] of [[new Uint8Array([1,2,3]),415],[new Uint8Array(5*1024*1024+1),413]] as const) {
      let calls=0;
      const {url,token} = await setup({upload:async () => {calls++; throw Error();}});
      expect((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:image(bytes)})).status).toBe(status);
      expect(calls).toBe(0);
    }
  });
  it('rate-limits repeat uploads and can return to the built-in avatar', async () => {
    const destroyed: string[] = [];
    const {url,token,store,user} = await setup({
      upload: async (_data, userId) => ({secure_url:'https://example.test/avatar.png',public_id:`xomlay/avatars/${userId}`}),
      destroy: async (publicId) => { destroyed.push(publicId); },
    });
    const headers = {Authorization:`Bearer ${token}`};
    expect((await fetch(url,{method:'POST',headers,body:image(png)})).status).toBe(200);
    expect((await fetch(url,{method:'POST',headers,body:image(png)})).status).toBe(429);
    expect((await fetch(url,{method:'DELETE',headers})).status).toBe(200);
    expect((await store.userById(user.id))?.avatarUrl).toBeUndefined();
    expect(destroyed).toEqual([`xomlay/avatars/${user.id}`]);
  });
  it('serializes removal with uploads so a destroy cannot erase a replacement', async () => {
    let releaseDestroy!: () => void;
    let markDestroyStarted!: () => void;
    const destroyStarted = new Promise<void>((resolve) => { markDestroyStarted = resolve; });
    const destroyGate = new Promise<void>((resolve) => { releaseDestroy = resolve; });
    const {url,token,store,user} = await setup({
      upload: async (_data, userId) => ({secure_url:'https://example.test/new.png',public_id:`xomlay/avatars/${userId}`}),
      destroy: async () => { markDestroyStarted(); await destroyGate; },
    });
    await store.updateUser(user.id,{avatarUrl:'https://example.test/old.png',avatarPublicId:`xomlay/avatars/${user.id}`});
    const headers = {Authorization:`Bearer ${token}`};
    const removing = fetch(url,{method:'DELETE',headers});
    await destroyStarted;
    expect((await fetch(url,{method:'POST',headers,body:image(png)})).status).toBe(429);
    releaseDestroy();
    expect((await removing).status).toBe(200);
  });
});

it('keeps sticker and legacy text chat together while rejecting unknown IDs', () => {
  const room = new Room('TEST',new Dictionary([]));
  const result = room.addPlayer('Tester'); if (!result.ok) throw Error();
  expect(room.addChat(result.playerId,{kind:'sticker',stickerId:'quynh-09'})?.kind).toBe('sticker');
  expect(room.addChat(result.playerId,{kind:'sticker',stickerId:'unknown'})).toBeNull();
  expect(room.addChat(result.playerId,' hello ')?.text).toBe('hello');
  expect(room.chatLog).toHaveLength(2);
  room.dispose();
});
it('clears a removed uploaded avatar from the live room profile', () => {
  const room = new Room('TEST',new Dictionary([]));
  const result = room.addPlayer('Tester','u-000000000000000000000001',{avatar:2,avatarUrl:'https://example.test/old.png',account:true});
  if (!result.ok) throw Error();
  room.updateProfile(result.playerId,'Tester',2,undefined);
  expect(room.toPublic().players[0].avatarUrl).toBeUndefined();
  room.dispose();
});
it('normalizes definition lookup and explicitly marks missing definitions', () => {
  const dictionary = new Dictionary(['học sinh'],new Set(),{'học sinh':{text:'Source text',source:'local fixture'}});
  expect(dictionary.definition(' HỌC  SINH ')).toEqual({text:'Source text',source:'local fixture'});
  expect(dictionary.definition('không có')).toBeUndefined();
});


it('loads the attributed offline seed alongside the full dictionary', () => {
  const dictionary = Dictionary.load(fileURLToPath(new URL('../data/', import.meta.url)));
  expect(dictionary.definition('HỌC SINH')?.source).toContain('CC BY-SA 4.0');
  expect(dictionary.definition('học sinh')?.text).toBe('Trẻ em học tập ở nhà trường.');
}, 20_000);
