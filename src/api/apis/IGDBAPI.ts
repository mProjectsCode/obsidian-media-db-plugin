import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { ApiSecretID, getApiSecretValue } from '../../settings/apiSecretsHelper';
import { MediaType } from '../../utils/MediaType';
import { coerceYear } from '../../utils/Utils';
import { APIModel } from '../APIModel';

interface IGDBCover { url: string; }
interface IGDBGenre { name: string; }
interface IGDBCompany { name: string; }
interface IGDBInvolvedCompany { company: IGDBCompany; developer: boolean; publisher: boolean; }
interface IGDBPlatform { name: string; }
interface IGDBGameMode { name: string; }
interface IGDBCollection { name: string; }
interface IGDBGame {
	id: number; name: string; cover?: IGDBCover; first_release_date?: number;
	summary?: string; total_rating?: number; url?: string;
	genres?: IGDBGenre[]; involved_companies?: IGDBInvolvedCompany[];
	platforms?: IGDBPlatform[]; game_modes?: IGDBGameMode[];
	collection?: IGDBCollection; collections?: IGDBCollection[]; franchises?: IGDBCollection[];
}
interface TwitchAuthResponse { access_token: string; expires_in: number; }

export class IGDBAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';
	private accessToken: string = '';
	private tokenExpiry: number = 0;

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'IGDBAPI';
		this.apiDescription = 'A free API for games (Requires Twitch Client ID & Secret).';
		this.apiUrl = 'https://api.igdb.com/v4';
		this.types = [MediaType.Game];
	}

	private async getAuthToken(): Promise<string> {
		const currentTime = Date.now();
		if (this.accessToken && currentTime < this.tokenExpiry) return this.accessToken;

		const clientId = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.igdbClientId);
		const clientSecret = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.igdbClientSecret);
		if (!clientId || !clientSecret) {
			throw Error(`MDB | Client ID or Client Secret for ${this.apiName} missing.`);
		}
		console.log(`MDB | Refreshing Twitch Auth Token for ${this.apiName}`);
		const response = await requestUrl({
			url: `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
			method: 'POST',
		});
		if (response.status !== 200) throw Error(`MDB | Auth failed for ${this.apiName}. Check Credentials.`);
		const data = response.json as TwitchAuthResponse;
		this.accessToken = data.access_token;
		this.tokenExpiry = currentTime + (data.expires_in * 1000) - 60000; 
		return this.accessToken;
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);
		const token = await this.getAuthToken();
		const clientId = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.igdbClientId);
		const queryBody = `search "${title}"; fields name, cover.url, first_release_date, summary, total_rating; limit 20;`;
		const response = await requestUrl({
			url: `${this.apiUrl}/games`, method: 'POST',
			headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
			body: queryBody,
		});
		if (response.status !== 200) throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		
		const data = response.json as IGDBGame[];
		return data.map(result => {
			const year = result.first_release_date ? new Date(result.first_release_date * 1000).getFullYear() : 0;
			const image = result.cover?.url ? 'https:' + result.cover.url.replace('t_thumb', 't_1080p').replace(/\.jpg$/, '.webp') : '';
			return new GameModel({
				type: MediaType.Game, title: result.name, englishTitle: result.name, year: coerceYear(year),
				dataSource: this.apiName, id: result.id.toString(), image: image
			});
		});
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);
		const token = await this.getAuthToken();
		const clientId = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.igdbClientId);
		const queryBody = `fields name, cover.url, first_release_date, summary, total_rating, url, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, platforms.name, game_modes.name, collection.name, collections.name, franchises.name; where id = ${id};`;
		const response = await requestUrl({
			url: `${this.apiUrl}/games`, method: 'POST',
			headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
			body: queryBody,
		});
		if (response.status !== 200) throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		
		const data = response.json as IGDBGame[];
		if (!data || data.length === 0) throw Error(`MDB | No result found for ID ${id}`);
		const result = data[0];
		
		const developers: string[] = [];
		const publishers: string[] = [];
		result.involved_companies?.forEach(c => {
			if (c.developer) developers.push(c.company.name);
			if (c.publisher) publishers.push(c.company.name);
		});
		const dateStr = result.first_release_date ? new Date(result.first_release_date * 1000).toISOString().split('T')[0] : '';
		const image = result.cover?.url ? 'https:' + result.cover.url.replace('t_thumb', 't_1080p').replace(/\.jpg$/, '.webp') : '';

		let combinedSeries: string[] = [];
		// Öncelik 1: Franchise (Ana marka)
		result.franchises?.forEach(f => { if (f.name && !combinedSeries.includes(f.name)) combinedSeries.push(f.name); });
		
		// Öncelik 2: Franchise yoksa Collection (Seri) fallback'i
		if (combinedSeries.length === 0) {
			if (result.collection?.name) combinedSeries.push(result.collection.name);
			result.collections?.forEach(c => { if (c.name && !combinedSeries.includes(c.name)) combinedSeries.push(c.name); });
		}

		return new GameModel({
			type: MediaType.Game, title: result.name, englishTitle: result.name,
			year: coerceYear(
				result.first_release_date ? new Date(result.first_release_date * 1000).getFullYear() : 0,
			),
			dataSource: this.apiName, url: result.url, id: result.id.toString(),
			summary: result.summary ?? '', series: combinedSeries,
			gameModes: result.game_modes?.map(g => g.name) || [], platforms: result.platforms?.map(p => p.name) || [],
			developers: developers, publishers: publishers, genres: result.genres?.map(g => g.name) || [],
			onlineRating: result.total_rating ? Math.round(result.total_rating * 10) / 10 : 0, image: image, 
			released: result.first_release_date ? (result.first_release_date * 1000) <= Date.now() : false,
			releaseDate: dateStr ? this.plugin.dateFormatter.format(dateStr, this.apiDateFormat) : '',
			userData: { played: false, personalRating: 0 },
		});
	}

	getDisabledMediaTypes(): MediaType[] { return this.plugin.settings.IGDBAPI_disabledMediaTypes || []; }
}