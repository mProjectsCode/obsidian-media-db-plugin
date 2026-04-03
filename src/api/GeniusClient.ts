import { requestUrl } from 'obsidian';
import { contactEmail, mediaDbVersion, pluginName } from '../utils/Utils';
import { extractLyricsFromGeniusHtml } from './geniusLyricsExtract';

interface GeniusSearchHit {
	result: {
		id: number;
		title: string;
		url: string;
		primary_artist: { name: string };
	};
}

interface GeniusSearchResponse {
	response: {
		hits: GeniusSearchHit[];
	};
}

export { extractLyricsFromGeniusHtml };

export class GeniusClient {
	private readonly accessToken: string | undefined;
	private readonly userAgent: string;

	constructor(accessToken: string | undefined) {
		this.accessToken = accessToken;
		this.userAgent = `${pluginName}/${mediaDbVersion} (${contactEmail})`;
	}

	isConfigured(): boolean {
		return Boolean(this.accessToken?.trim());
	}

	async searchFirstSongHit(query: string): Promise<{ url: string; title: string } | null> {
		if (!this.accessToken?.trim()) {
			return null;
		}

		const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
		const res = await requestUrl({
			url,
			throw: false,
			headers: {
				'User-Agent': this.userAgent,
				Authorization: `Bearer ${this.accessToken.trim()}`,
			},
		});

		if (res.status !== 200) {
			if (res.status === 401) {
				console.warn('MDB | Genius search returned 401 — access token missing, invalid, or expired. Update it in Media DB settings or clear it to skip lyrics.');
			} else {
				console.warn(`MDB | Genius search returned ${res.status}`);
			}
			return null;
		}

		const data = res.json as GeniusSearchResponse;
		const hit = data.response?.hits?.[0]?.result;
		if (!hit?.url) {
			return null;
		}

		return { url: hit.url, title: hit.title };
	}

	async fetchLyricsFromSongPage(songPageUrl: string): Promise<string> {
		const res = await requestUrl({
			url: songPageUrl,
			throw: false,
			headers: {
				'User-Agent': this.userAgent,
			},
		});

		if (res.status !== 200) {
			console.warn(`MDB | Genius song page returned ${res.status}`);
			return '';
		}

		return extractLyricsFromGeniusHtml(res.text);
	}
}
