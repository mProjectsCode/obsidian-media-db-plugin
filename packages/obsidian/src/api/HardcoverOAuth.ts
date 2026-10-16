import { requestUrl } from 'obsidian';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';

export const HARDCOVER_REDIRECT_URI = 'obsidian://media-db-hardcover';
export const HARDCOVER_SCOPE = 'read:catalog';
const ISSUER = 'https://api.hardcover.app';

interface Tokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	clientId: string;
}

interface PendingAuthorization {
	state: string;
	verifier: string;
	clientId: string;
	expiresAt: number;
}

function base64url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function randomString(): string {
	return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export class HardcoverOAuth {
	private pending?: PendingAuthorization;
	private refreshing?: Promise<Result<string, MDBError>>;
	private generation = 0;
	private authGeneration = 0;
	private disconnecting = false;

	constructor(private plugin: MediaDbPlugin) {}

	private failure(message: string): Result<never, MDBError> {
		return err({ kind: MDBErrorKind.Validation, message, userMessage: message });
	}

	private readTokens(requireMatchingClient = true): Tokens | undefined {
		const id = this.plugin.settings.HardcoverOAuthSecretId;
		if (!id) return undefined;
		try {
			const tokens = JSON.parse(this.plugin.app.secretStorage.getSecret(id) ?? 'null') as Tokens | null;
			return tokens &&
				typeof tokens.accessToken === 'string' &&
				typeof tokens.refreshToken === 'string' &&
				Number.isFinite(tokens.expiresAt) &&
				typeof tokens.clientId === 'string' &&
				(!requireMatchingClient || tokens.clientId === this.plugin.settings.HardcoverClientId.trim())
				? tokens
				: undefined;
		} catch {
			return undefined;
		}
	}

	isConnected(): boolean {
		return !!this.readTokens();
	}

	async beginAuthorization(): Promise<Result<string, MDBError>> {
		if (this.disconnecting) return this.failure('Hardcover is disconnecting. Please try again.');
		const clientId = this.plugin.settings.HardcoverClientId.trim();
		if (!clientId) return this.failure('Configure the public Hardcover OAuth client ID first.');
		const generation = ++this.authGeneration;
		const verifier = randomString();
		const state = randomString();
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
		if (generation !== this.authGeneration) return this.failure('Hardcover connection was cancelled.');
		this.pending = { state, verifier, clientId, expiresAt: Date.now() + 10 * 60 * 1000 };
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: clientId,
			redirect_uri: HARDCOVER_REDIRECT_URI,
			state,
			code_challenge: base64url(new Uint8Array(digest)),
			code_challenge_method: 'S256',
			scope: HARDCOVER_SCOPE,
		});
		return ok(`https://hardcover.app/oauth2/authorize?${params}`);
	}

	async completeAuthorization(params: Record<string, string>): Promise<Result<void, MDBError>> {
		if (this.disconnecting) return this.failure('Hardcover is disconnecting. Please try again.');
		const pending = this.pending;
		if (
			!pending ||
			pending.expiresAt <= Date.now() ||
			params.state !== pending.state ||
			params.iss !== ISSUER ||
			pending.clientId !== this.plugin.settings.HardcoverClientId.trim()
		) {
			return this.failure('Hardcover sign-in could not be verified. Start Connect again in the originating vault.');
		}
		this.pending = undefined;
		if (params.error || !params.code) return this.failure('Hardcover sign-in was cancelled or denied.');
		const generation = this.authGeneration;
		const response = await this.exchange({
			grant_type: 'authorization_code',
			code: params.code,
			code_verifier: pending.verifier,
			redirect_uri: HARDCOVER_REDIRECT_URI,
			client_id: pending.clientId,
		});
		if (!response.ok) return response;
		if (generation !== this.authGeneration) return this.failure('Hardcover connection was cancelled.');
		this.generation++;
		await this.storeTokens(response.value);
		return ok(undefined);
	}

	private async exchange(form: Record<string, string>): Promise<Result<Tokens, MDBError>> {
		try {
			const response = await requestUrl({
				url: `${ISSUER}/oauth2/token`,
				method: 'POST',
				contentType: 'application/x-www-form-urlencoded',
				body: new URLSearchParams(form).toString(),
				throw: false,
			});
			if (response.status !== 200) return this.failure('Hardcover authorization expired or was rejected. Connect again.');
			const data = response.json as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; token_type?: unknown; scope?: unknown };
			if (
				typeof data.access_token !== 'string' ||
				!data.access_token ||
				typeof data.refresh_token !== 'string' ||
				!data.refresh_token ||
				typeof data.expires_in !== 'number' ||
				data.expires_in <= 0 ||
				!Number.isFinite(data.expires_in) ||
				typeof data.token_type !== 'string' ||
				data.token_type.toLowerCase() !== 'bearer'
			) {
				return this.failure('Hardcover returned an invalid OAuth response. Connect again.');
			}
			return ok({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000, clientId: form.client_id });
		} catch {
			return this.failure('Could not contact Hardcover for authorization. Please try again.');
		}
	}

	private async storeTokens(tokens: Tokens): Promise<void> {
		if (!this.plugin.settings.HardcoverOAuthSecretId) this.plugin.settings.HardcoverOAuthSecretId = `media-db-hardcover-${crypto.randomUUID()}`;
		this.plugin.app.secretStorage.setSecret(this.plugin.settings.HardcoverOAuthSecretId, JSON.stringify(tokens));
		await this.plugin.saveSettings();
	}

	async getAccessToken(): Promise<Result<string, MDBError>> {
		if (this.disconnecting) return this.failure('Hardcover is disconnecting. Please try again.');
		const tokens = this.readTokens();
		if (!tokens) return this.failure('Connect to Hardcover in Media DB settings first.');
		if (tokens.expiresAt > Date.now() + 60_000) return ok(tokens.accessToken);
		if (!this.refreshing) {
			const generation = this.generation;
			this.refreshing = this.refreshTokens(tokens, generation).finally(() => {
				this.refreshing = undefined;
			});
		}
		return this.refreshing;
	}

	private async refreshTokens(tokens: Tokens, generation: number): Promise<Result<string, MDBError>> {
		const result = await this.exchange({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: tokens.clientId });
		if (!result.ok) return result;
		if (generation !== this.generation || this.readTokens(false)?.refreshToken !== tokens.refreshToken) return this.failure('Hardcover connection changed. Connect again.');
		// Preserve rotated credentials even if settings currently select another client.
		await this.storeTokens(result.value);
		if (tokens.clientId !== this.plugin.settings.HardcoverClientId.trim()) return this.failure('Hardcover connection changed.');
		return ok(result.value.accessToken);
	}

	async disconnect(): Promise<Result<void, MDBError>> {
		if (this.disconnecting) return this.failure('Hardcover is already disconnecting.');
		this.disconnecting = true;
		try {
			this.cancelPendingAuthorization();
			// Finish rotation before revoking, so Disconnect uses the current refresh token.
			await this.refreshing;
			this.generation++;
			const tokens = this.readTokens(false);
			if (tokens) {
				try {
					const response = await requestUrl({
						url: `${ISSUER}/oauth2/revoke`,
						method: 'POST',
						contentType: 'application/x-www-form-urlencoded',
						body: new URLSearchParams({ token: tokens.refreshToken, token_type_hint: 'refresh_token', client_id: tokens.clientId }).toString(),
						throw: false,
					});
					if (response.status !== 200) return this.failure('Hardcover could not revoke the connection. Please try Disconnect again.');
				} catch {
					return this.failure('Hardcover could not revoke the connection. Please try Disconnect again.');
				}
			}
			const id = this.plugin.settings.HardcoverOAuthSecretId;
			if (id) this.plugin.app.secretStorage.setSecret(id, '');
			this.plugin.settings.HardcoverOAuthSecretId = '';
			await this.plugin.saveSettings();
			return ok(undefined);
		} finally {
			this.disconnecting = false;
		}
	}

	cancelPendingAuthorization(): void {
		this.pending = undefined;
		this.authGeneration++;
	}
}
