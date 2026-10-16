import { afterEach, expect, spyOn, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as obsidian from 'obsidian';
import { HardcoverOAuth, HARDCOVER_REDIRECT_URI } from 'packages/obsidian/src/api/HardcoverOAuth';
import type MediaDbPlugin from 'packages/obsidian/src/main';

if (typeof window === 'undefined') GlobalRegistrator.register();
const request = spyOn(obsidian, 'requestUrl');
afterEach(() => request.mockReset());

function setup() {
	const secrets = new Map<string, string>();
	const settings = { HardcoverClientId: 'test-client', HardcoverOAuthSecretId: '' };
	const plugin = {
		settings,
		app: { secretStorage: { getSecret: (id: string) => secrets.get(id) ?? null, setSecret: (id: string, value: string) => secrets.set(id, value) } },
		saveSettings: async () => {},
	} as unknown as MediaDbPlugin;
	return { oauth: new HardcoverOAuth(plugin), settings, secrets };
}

function respond(json: unknown, status = 200) {
	request.mockResolvedValueOnce({ status, json } as obsidian.RequestUrlResponse);
}

const tokens = { access_token: 'access-secret', refresh_token: 'refresh-secret', expires_in: 3600, token_type: 'Bearer' };

async function callback(oauth: HardcoverOAuth) {
	const start = await oauth.beginAuthorization();
	if (!start.ok) throw new Error('start failed');
	return { state: new URL(start.value).searchParams.get('state')!, code: 'authorization-code', iss: 'https://api.hardcover.app' };
}

test('OAuth uses a public client, S256 PKCE and only catalog scope', async () => {
	const { oauth } = setup();
	const params = await callback(oauth);
	respond(tokens);
	expect((await oauth.completeAuthorization(params)).ok).toBe(true);
	const body = new URLSearchParams((request.mock.calls[0][0] as obsidian.RequestUrlParam).body as string);
	expect(body.get('client_secret')).toBeNull();
	expect(body.get('redirect_uri')).toBe(HARDCOVER_REDIRECT_URI);
	const verifier = body.get('code_verifier')!;
	expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
	const next = await oauth.beginAuthorization();
	if (!next.ok) throw new Error('start failed');
	const url = new URL(next.value);
	expect(url.searchParams.get('scope')).toBe('read:catalog');
	expect(url.searchParams.get('code_challenge_method')).toBe('S256');
	expect(url.searchParams.get('code_challenge')).toHaveLength(43);
	expect(next.value).not.toContain(verifier);
});

test('state and issuer mismatches cannot exchange a code', async () => {
	const { oauth } = setup();
	const params = await callback(oauth);
	expect((await oauth.completeAuthorization({ ...params, state: 'wrong' })).ok).toBe(false);
	expect((await oauth.completeAuthorization({ ...params, iss: 'https://attacker.test' })).ok).toBe(false);
	expect(request).not.toHaveBeenCalled();
});

test('denial is handled without contacting the token endpoint', async () => {
	const { oauth } = setup();
	const params = await callback(oauth);
	expect((await oauth.completeAuthorization({ ...params, error: 'access_denied' })).ok).toBe(false);
	expect(request).not.toHaveBeenCalled();
});

test('successful connection stores tokens only in SecretStorage and rejects callback replay', async () => {
	const { oauth, settings, secrets } = setup();
	const params = await callback(oauth);
	respond(tokens);
	expect((await oauth.completeAuthorization(params)).ok).toBe(true);
	expect(oauth.isConnected()).toBe(true);
	expect(JSON.stringify(settings)).not.toContain('secret');
	expect(secrets.size).toBe(1);
	expect(await oauth.getAccessToken()).toEqual({ ok: true, value: 'access-secret' });
	expect((await oauth.completeAuthorization(params)).ok).toBe(false);
	expect(request).toHaveBeenCalledTimes(1);
});

test('expired access tokens rotate once for concurrent requests', async () => {
	const { oauth, settings, secrets } = setup();
	const params = await callback(oauth);
	respond(tokens);
	await oauth.completeAuthorization(params);
	const stored = JSON.parse(secrets.get(settings.HardcoverOAuthSecretId)!);
	secrets.set(settings.HardcoverOAuthSecretId, JSON.stringify({ ...stored, expiresAt: 0 }));
	respond({ ...tokens, access_token: 'new-access', refresh_token: 'new-refresh' });
	const results = await Promise.all([oauth.getAccessToken(), oauth.getAccessToken()]);
	expect(results).toEqual([
		{ ok: true, value: 'new-access' },
		{ ok: true, value: 'new-access' },
	]);
	expect(request).toHaveBeenCalledTimes(2);
	expect(JSON.parse(secrets.get(settings.HardcoverOAuthSecretId)!).refreshToken).toBe('new-refresh');
});

test('disconnect revokes refresh credentials before clearing local storage', async () => {
	const { oauth, secrets } = setup();
	const params = await callback(oauth);
	respond(tokens);
	await oauth.completeAuthorization(params);
	respond({});
	expect((await oauth.disconnect()).ok).toBe(true);
	expect(oauth.isConnected()).toBe(false);
	expect([...secrets.values()]).toEqual(['']);
	const options = request.mock.calls[1][0] as obsidian.RequestUrlParam;
	expect(options.url).toBe('https://api.hardcover.app/oauth2/revoke');
	expect(new URLSearchParams(options.body as string).get('token_type_hint')).toBe('refresh_token');
});

test('failed revocation preserves credentials so the user can retry', async () => {
	const { oauth } = setup();
	const params = await callback(oauth);
	respond(tokens);
	await oauth.completeAuthorization(params);
	respond({}, 503);
	expect((await oauth.disconnect()).ok).toBe(false);
	expect(oauth.isConnected()).toBe(true);
});

test('failed and malformed exchanges do not store credentials or leak transport secrets', async () => {
	for (const value of [{ ...tokens, token_type: 'unknown' }, { access_token: 'secret' }, null]) {
		const { oauth, secrets } = setup();
		const params = await callback(oauth);
		respond(value);
		expect((await oauth.completeAuthorization(params)).ok).toBe(false);
		expect(secrets.size).toBe(0);
	}
	const { oauth } = setup();
	const params = await callback(oauth);
	request.mockRejectedValueOnce(new Error('authorization-code refresh-secret'));
	const result = await oauth.completeAuthorization(params);
	expect(JSON.stringify(result)).not.toContain('authorization-code');
	expect(JSON.stringify(result)).not.toContain('refresh-secret');
});

test('changing the client or unloading cancels pending sign-in', async () => {
	const { oauth, settings } = setup();
	const params = await callback(oauth);
	settings.HardcoverClientId = 'other';
	expect((await oauth.completeAuthorization(params)).ok).toBe(false);
	settings.HardcoverClientId = 'test-client';
	oauth.cancelPendingAuthorization();
	expect((await oauth.completeAuthorization(params)).ok).toBe(false);
	expect(request).not.toHaveBeenCalled();
});

async function connectedWithExpiredTokens() {
	const context = setup();
	const params = await callback(context.oauth);
	respond(tokens);
	await context.oauth.completeAuthorization(params);
	const read = () => JSON.parse(context.secrets.get(context.settings.HardcoverOAuthSecretId)!);
	context.secrets.set(context.settings.HardcoverOAuthSecretId, JSON.stringify({ ...read(), expiresAt: 0 }));
	return { ...context, read };
}

function delayedRefresh() {
	let finish!: (value: obsidian.RequestUrlResponse) => void;
	request.mockImplementationOnce(
		() =>
			new Promise<obsidian.RequestUrlResponse>(resolve => {
				finish = resolve;
			}) as obsidian.RequestUrlResponsePromise,
	);
	return () => finish({ status: 200, json: { ...tokens, access_token: 'rotated-access', refresh_token: 'rotated-refresh' } } as obsidian.RequestUrlResponse);
}

test('canceling sign-in or starting a new sign-in does not discard an in-flight rotation', async () => {
	for (const startAgain of [false, true]) {
		const { oauth, read } = await connectedWithExpiredTokens();
		const finish = delayedRefresh();
		const refresh = oauth.getAccessToken();
		oauth.cancelPendingAuthorization();
		if (startAgain) await oauth.beginAuthorization();
		finish();
		expect((await refresh).ok).toBe(true);
		expect(read().refreshToken).toBe('rotated-refresh');
	}
});

test('client edits preserve rotated credentials without returning a token for the wrong client', async () => {
	const { oauth, settings, read } = await connectedWithExpiredTokens();
	const finish = delayedRefresh();
	const refresh = oauth.getAccessToken();
	oauth.cancelPendingAuthorization();
	settings.HardcoverClientId = 'other-client';
	finish();
	expect((await refresh).ok).toBe(false);
	expect(read().refreshToken).toBe('rotated-refresh');
	expect(oauth.isConnected()).toBe(false);
	settings.HardcoverClientId = 'test-client';
	expect(await oauth.getAccessToken()).toEqual({ ok: true, value: 'rotated-access' });
});

test('an old refresh cannot overwrite a newly authorized connection', async () => {
	const { oauth, read } = await connectedWithExpiredTokens();
	const finish = delayedRefresh();
	const refresh = oauth.getAccessToken();
	const params = await callback(oauth);
	respond({ ...tokens, access_token: 'new-connection-access', refresh_token: 'new-connection-refresh' });
	expect((await oauth.completeAuthorization(params)).ok).toBe(true);
	finish();
	expect((await refresh).ok).toBe(false);
	expect(read().refreshToken).toBe('new-connection-refresh');
});

test('disconnect waits for rotation, revokes the rotated token and blocks new connections', async () => {
	const { oauth, secrets } = await connectedWithExpiredTokens();
	const finish = delayedRefresh();
	const refresh = oauth.getAccessToken();
	const params = await callback(oauth);
	const disconnect = oauth.disconnect();
	expect((await oauth.beginAuthorization()).ok).toBe(false);
	expect((await oauth.completeAuthorization(params)).ok).toBe(false);
	expect((await oauth.getAccessToken()).ok).toBe(false);
	respond({});
	finish();
	await refresh;
	expect((await disconnect).ok).toBe(true);
	const revoke = request.mock.calls.at(-1)![0] as obsidian.RequestUrlParam;
	expect(new URLSearchParams(revoke.body as string).get('token')).toBe('rotated-refresh');
	expect(oauth.isConnected()).toBe(false);
	expect([...secrets.values()]).toEqual(['']);
});

test('canceling authorization during its exchange prevents credentials from being stored', async () => {
	const { oauth, secrets } = setup();
	const params = await callback(oauth);
	const finish = delayedRefresh();
	const connection = oauth.completeAuthorization(params);
	oauth.cancelPendingAuthorization();
	finish();
	expect((await connection).ok).toBe(false);
	expect(secrets.size).toBe(0);
});

test('failed disconnect after rotation retains the current credentials for retry', async () => {
	const { oauth, read } = await connectedWithExpiredTokens();
	const finish = delayedRefresh();
	const refresh = oauth.getAccessToken();
	const disconnect = oauth.disconnect();
	respond({}, 503);
	finish();
	await refresh;
	expect((await disconnect).ok).toBe(false);
	expect(read().refreshToken).toBe('rotated-refresh');
	expect(oauth.isConnected()).toBe(true);
	respond({});
	expect((await oauth.disconnect()).ok).toBe(true);
	const retry = request.mock.calls.at(-1)![0] as obsidian.RequestUrlParam;
	expect(new URLSearchParams(retry.body as string).get('token')).toBe('rotated-refresh');
});

test('disconnect prevents an authorization exchange already in flight from restoring credentials', async () => {
	const { oauth, secrets } = setup();
	const params = await callback(oauth);
	const finish = delayedRefresh();
	const connection = oauth.completeAuthorization(params);
	expect((await oauth.disconnect()).ok).toBe(true);
	finish();
	expect((await connection).ok).toBe(false);
	expect(secrets.size).toBe(0);
});
