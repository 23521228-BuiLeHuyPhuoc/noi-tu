import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { io, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { createGameServer, type GameServer } from "../src/app";
import { MemoryStore } from "../src/store";
import type { Mailer } from "../src/mailer";
import { hashPassword } from "../src/auth";
import { smallDict } from "./helpers";
let server: GameServer, store: MemoryStore, url: string;
let sent: {
    to: string;
    subject: string;
    text: string;
}[];
const clients: Socket[] = [];
async function client() {
    const s = io(url, { transports: ["websocket"], forceNew: true });
    clients.push(s);
    await new Promise<void>(r => s.on("connect", r));
    return s;
}
const call = (s: Socket, event: string, p: unknown) => s.timeout(5000).emitWithAck(event, p);
const register = (s: Socket, username = "anna") => call(s, "auth:register", { username, email: `${username === "anna" ? "an" : username}@gmail.com`, password: "secret1", displayName: "An" });
const forgot = (s: Socket, who = "anna") => call(s, "auth:forgot", { who });
const code = () => sent.at(-1)!.subject.match(/(\d{6})/)![1];
async function start(mailer: Mailer | null = { async send(to: string, subject: string, text: string) {
        sent.push({ to, subject, text });
    } }) {
    server = createGameServer(smallDict(), { store, mailer });
    await new Promise<void>(r => server.http.listen(0, r));
    url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
}
beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    store = new MemoryStore();
    sent = [];
    await start();
});
afterEach(async () => {
    clients.splice(0).forEach(s => s.disconnect());
    await server.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
});
it.each(["anna", "AN@gmail.com"])("forgot sends one six-digit mail via %s", async (who) => {
    const s = await client();
    await register(s);
    expect(await forgot(s, who)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("an@gmail.com");
    expect(code()).toMatch(/^\d{6}$/);
});
it("unknown and email-less accounts return ok without mail", async () => {
    const s = await client();
    await store.createUser({ username: "legacy", displayName: "Legacy", avatar: 0, ...await hashPassword("secret1") });
    for (const who of ["unknown", "legacy"])
        expect(await forgot(s, who)).toEqual({ ok: true });
    expect(sent).toHaveLength(0);
    expect(await forgot(s, "@")).toEqual({ ok: false, error: "invalid_username" });
});
it("concurrent forgot and cooldown send only once", async () => {
    const s = await client();
    await register(s);
    await Promise.all([forgot(s), forgot(await client())]);
    expect(sent).toHaveLength(1);
    expect(await forgot(s)).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
});
it("five wrong codes expire code", async () => {
    const s = await client();
    await register(s);
    await forgot(s);
    const correct = code();
    for (let i = 0; i < 5; i++)
        expect(await call(await client(), "auth:reset", { who: "anna", code: correct === "000000" ? "111111" : "000000", password: "secret2" })).toEqual({ ok: false, error: i === 4 ? "code_expired" : "bad_code" });
    expect(await call(await client(), "auth:reset", { who: "anna", code: correct, password: "secret2" })).toEqual({ ok: false, error: "code_expired" });
});
it("reset after ten minutes expires", async () => {
    const s = await client();
    await register(s);
    await forgot(s);
    vi.setSystemTime(Date.now() + 600000);
    expect(await call(await client(), "auth:reset", { who: "anna", code: code(), password: "secret2" })).toEqual({ ok: false, error: "code_expired" });
});
it("concurrent correct reset succeeds once, changes password and expires session mutation access", async () => {
    const s = await client();
    const reg = await register(s);
    await forgot(s);
    const p = { who: "anna", code: code(), password: "secret2" };
    const results = await Promise.all([call(await client(), "auth:reset", p), call(await client(), "auth:reset", p)]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(await call(await client(), "auth:reset", p)).toEqual({ ok: false, error: "code_expired" });
    for (const event of ["auth:update", "auth:setEmail"])
        expect(await call(s, event, { displayName: "stale", email: "stale@gmail.com" })).toEqual({ ok: false, error: "session_expired" });
    expect(await call(s, "auth:resume", { token: reg.token })).toEqual({ ok: false, error: "session_expired" });
    expect(await call(await client(), "auth:login", { username: "anna", password: "secret1" })).toEqual({ ok: false, error: "wrong_credentials" });
    expect((await call(await client(), "auth:login", { username: "anna", password: "secret2" })).ok).toBe(true);
});
it("mailer throwing still returns ok", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
    });
    await server.close();
    await start({ async send() {
            throw Error("offline");
        } });
    const s = await client();
    await register(s);
    expect(await forgot(s)).toEqual({ ok: true });
});
it("disabled mail returns mail_disabled", async () => {
    await server.close();
    await start(null);
    expect(await forgot(await client())).toEqual({ ok: false, error: "mail_disabled" });
});
it("setEmail validates, enforces uniqueness and updates public user", async () => {
    const s = await client();
    await register(s);
    await register(await client(), "other");
    expect(await call(s, "auth:setEmail", { email: "bad" })).toEqual({ ok: false, error: "invalid_email" });
    // đã có email: phải kèm mật khẩu hiện tại (sửa sau review)
    expect(await call(s, "auth:setEmail", { email: "NEW@gmail.com" })).toEqual({ ok: false, error: "wrong_credentials" });
    expect(await call(s, "auth:setEmail", { email: "OTHER@gmail.com", password: "secret1" })).toEqual({ ok: false, error: "email_taken" });
    expect((await call(s, "auth:setEmail", { email: " NEW@gmail.com ", password: "secret1" })).user.email).toBe("new@gmail.com");
});
it("changePassword checks old password, keeps current session, expires others", async () => {
    const s = await client();
    const reg = await register(s);
    const t = await client();
    const login = await call(t, "auth:login", { username: "anna", password: "secret1" });
    expect(await call(s, "auth:changePassword", { oldPassword: "wrong", password: "secret2" })).toEqual({ ok: false, error: "wrong_credentials" });
    expect((await call(s, "auth:changePassword", { oldPassword: "secret1", password: "secret2" })).token).toBe(reg.token);
    expect(await call(t, "auth:update", { displayName: "stale" })).toEqual({ ok: false, error: "session_expired" });
    expect(await call(t, "auth:resume", { token: login.token })).toEqual({ ok: false, error: "session_expired" });
    expect((await call(s, "auth:resume", { token: reg.token })).ok).toBe(true);
});
it("hourly history survives reset deletion and expiry", async () => {
    const s = await client();
    await register(s);
    for (let i = 0; i < 5; i++) {
        await forgot(await client());
        await store.deleteReset((await store.userByName("anna"))!.id);
        vi.setSystemTime(Date.now() + 61000);
    }
    expect(sent).toHaveLength(5);
    vi.setSystemTime(Date.now() + 600000);
    expect(await forgot(await client())).toEqual({ ok: true });
    expect(sent).toHaveLength(5);
    vi.setSystemTime(Date.now() + 3600000);
    await forgot(await client());
    expect(sent).toHaveLength(6);
});
it("runtime invalid payloads return validation errors", async () => {
    const s = await client();
    expect(await call(s, "auth:reset", null)).toEqual({ ok: false, error: "invalid_password" });
    await register(s);
    expect(await call(s, "auth:changePassword", null)).toEqual({ ok: false, error: "invalid_password" });
});
it("successful resets do not erase the hourly send budget across Auth instances", async () => {
    const s = await client();
    await register(s);
    for (let i = 0; i < 5; i++) {
        await forgot(await client());
        expect((await call(await client(), "auth:reset", { who: "anna", code: code(), password: "secret2" })).ok).toBe(true);
        vi.setSystemTime(Date.now() + 61000);
    }
    await server.close();
    await start();
    expect(await forgot(await client())).toEqual({ ok: true });
    expect(sent).toHaveLength(5);
});

it("forgot socket limiter is independent of account existence", async () => {
    const s = await client();
    for (let i = 0; i < 6; i++) expect(await forgot(s, "unknown")).toEqual({ ok: true });
    expect(await forgot(s, "anna")).toEqual({ ok: false, error: "rate_limited" });
    expect(await forgot(await client(), "anna")).toEqual({ ok: true });
});
it("forgot acknowledges without waiting for mail delivery", async () => {
    await server.close();
    await start({ send: () => new Promise<void>(() => {}) });
    const s = await client();
    await register(s);
    expect(await forgot(s)).toEqual({ ok: true });
});
