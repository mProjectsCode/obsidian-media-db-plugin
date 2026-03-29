import { requestUrl } from 'obsidian';
import { contactEmail, mediaDbVersion, pluginName } from '../utils/Utils';

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

const LYRICS_DIV_RE = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
const LYRICS_CLASS_FALLBACK_RE = /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

function stripHtmlToPlainLyrics(fragment: string): string {
	return fragment
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.trim();
}

function extractLyricsFromGeniusHtml(html: string): string {
	const chunks: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = LYRICS_DIV_RE.exec(html)) !== null) {
		chunks.push(stripHtmlToPlainLyrics(m[1]));
	}
	LYRICS_DIV_RE.lastIndex = 0;
	if (chunks.length > 0) {
		return chunks.filter(Boolean).join('\n\n').trim();
	}
	while ((m = LYRICS_CLASS_FALLBACK_RE.exec(html)) !== null) {
		chunks.push(stripHtmlToPlainLyrics(m[1]));
	}
	LYRICS_CLASS_FALLBACK_RE.lastIndex = 0;
	return chunks.filter(Boolean).join('\n\n').trim();
}

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
