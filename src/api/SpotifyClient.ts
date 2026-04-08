import { contactEmail, mediaDbVersion, pluginName } from '../utils/Utils';
import { verboseLog } from '../utils/verboseLog';
import { requestUrlRateLimited } from './requestUrlRateLimited';

interface SpotifyTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: string;
}

interface SpotifySearchResponse {
	tracks?: {
		items: { external_urls?: { spotify?: string } }[];
	};
}

function spotifyTrackArtistQuery(trackTitle: string, artistName: string): string {
	const clean = (s: string): string => s.trim().replace(/"/g, ' ').replace(/\s+/g, ' ');
	const t = clean(trackTitle);
	const a = clean(artistName);
	if (!t) {
		return '';
	}
	if (!a) {
		return `track:"${t}"`;
	}
	return `track:"${t}" artist:"${a}"`;
}

export class SpotifyClient {
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly userAgent: string;
	private accessToken: string | null = null;
	private tokenExpiresAtMs = 0;

	constructor(clientId: string | undefined, clientSecret: string | undefined) {
		this.clientId = (clientId ?? '').trim();
		this.clientSecret = (clientSecret ?? '').trim();
		this.userAgent = `${pluginName}/${mediaDbVersion} (${contactEmail})`;
	}

	isConfigured(): boolean {
		return Boolean(this.clientId && this.clientSecret);
	}

	private async refreshAccessToken(): Promise<string | null> {
		if (!this.isConfigured()) {
			return null;
		}
		const basic = btoa(`${this.clientId}:${this.clientSecret}`);
		const res = await requestUrlRateLimited(
			{
				url: 'https://accounts.spotify.com/api/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${basic}`,
					'User-Agent': this.userAgent,
				},
				body: 'grant_type=client_credentials',
			},
			{ logLabel: 'Spotify (token)' },
		);
		if (res.status !== 200) {
			console.warn(`Spotify token request returned ${res.status}`);
			this.accessToken = null;
			this.tokenExpiresAtMs = 0;
			return null;
		}
		const data = res.json as SpotifyTokenResponse;
		if (!data.access_token) {
			return null;
		}
		this.accessToken = data.access_token;
		const ttlMs = (data.expires_in ?? 3600) * 1000;
		this.tokenExpiresAtMs = Date.now() + ttlMs - 60_000;
		return this.accessToken;
	}

	private async getAccessToken(): Promise<string | null> {
		if (!this.isConfigured()) {
			return null;
		}
		const now = Date.now();
		if (this.accessToken && now < this.tokenExpiresAtMs) {
			return this.accessToken;
		}
		return this.refreshAccessToken();
	}

	/**
	 * Search for a track and return the first result's open.spotify.com URL, or ''.
	 */
	async searchFirstTrackUrl(trackTitle: string, artistName: string): Promise<string> {
		const q = spotifyTrackArtistQuery(trackTitle, artistName);
		if (!q) {
			return '';
		}
		let token = await this.getAccessToken();
		if (!token) {
			console.warn('Spotify search fetch skipped: could not obtain access token');
			return '';
		}

		const params = new URLSearchParams({ q, type: 'track', limit: '1' });
		const url = `https://api.spotify.com/v1/search?${params.toString()}`;
		verboseLog(`Spotify search fetch: ${url}`);
		let res = await requestUrlRateLimited(
			{
				url,
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'User-Agent': this.userAgent,
				},
			},
			{ logLabel: 'Spotify (search)' },
		);

		if (res.status === 401) {
			this.accessToken = null;
			this.tokenExpiresAtMs = 0;
			token = await this.refreshAccessToken();
			if (!token) {
				return '';
			}
			verboseLog(`Spotify search fetch (retry after 401): ${url}`);
			res = await requestUrlRateLimited(
				{
					url,
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'User-Agent': this.userAgent,
					},
				},
				{ logLabel: 'Spotify (search)' },
			);
		}

		if (res.status !== 200) {
			console.warn(`Spotify search returned ${res.status}`);
			return '';
		}

		const data = res.json as SpotifySearchResponse;
		const link = data.tracks?.items?.[0]?.external_urls?.spotify;
		return typeof link === 'string' ? link : '';
	}
}
