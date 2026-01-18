import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

export class IGDBAPI extends APIModel {
	plugin: MediaDbPlugin;
	// DÜZELTME 1: Formatı ISO standartına (YYYY-MM-DD) çektik
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
		if (this.accessToken && currentTime < this.tokenExpiry) {
			return this.accessToken;
		}

		if (!this.plugin.settings.IGDBClientId || !this.plugin.settings.IGDBClientSecret) {
			throw Error(`MDB | Client ID or Client Secret for ${this.apiName} missing.`);
		}

		console.log(`MDB | Refreshing Twitch Auth Token for ${this.apiName}`);

		const response = await requestUrl({
			url: `https://id.twitch.tv/oauth2/token?client_id=${this.plugin.settings.IGDBClientId}&client_secret=${this.plugin.settings.IGDBClientSecret}&grant_type=client_credentials`,
			method: 'POST',
		});

		if (response.status !== 200) {
			throw Error(`MDB | Auth failed for ${this.apiName}. Check Credentials.`);
		}

		const data = response.json;
		this.accessToken = data.access_token;
		this.tokenExpiry = currentTime + (data.expires_in * 1000) - 60000;

		return this.accessToken;
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const token = await this.getAuthToken();

		const queryBody = `
			search "${title}";
			fields name, cover.url, first_release_date, summary, total_rating;
			limit 20;
		`;

		const response = await requestUrl({
			url: `${this.apiUrl}/games`,
			method: 'POST',
			headers: {
				'Client-ID': this.plugin.settings.IGDBClientId,
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json',
			},
			body: queryBody,
		});

		if (response.status !== 200) {
			throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		}

		const data = response.json;
		const ret: MediaTypeModel[] = [];

		for (const result of data) {
			let year = '';
			if (result.first_release_date) {
				year = new Date(result.first_release_date * 1000).getFullYear().toString();
			}

			let image = '';
			if (result.cover?.url) {
				image = 'https:' + result.cover.url.replace('t_thumb', 't_cover_big');
			}

			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: year,
					dataSource: this.apiName,
					id: result.id.toString(),
					image: image
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const token = await this.getAuthToken();

		const queryBody = `
			fields name, cover.url, first_release_date, summary, total_rating, url, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
			where id = ${id};
		`;

		const response = await requestUrl({
			url: `${this.apiUrl}/games`,
			method: 'POST',
			headers: {
				'Client-ID': this.plugin.settings.IGDBClientId,
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json',
			},
			body: queryBody,
		});

		if (response.status !== 200) {
			throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		}

		const data = response.json;
		if (!data || data.length === 0) {
			throw Error(`MDB | No result found for ID ${id}`);
		}

		const result = data[0];

		const developers: string[] = [];
		const publishers: string[] = [];

		if (result.involved_companies) {
			result.involved_companies.forEach((company: any) => {
				if (company.developer) developers.push(company.company.name);
				if (company.publisher) publishers.push(company.company.name);
			});
		}

		const genres = result.genres ? result.genres.map((g: any) => g.name) : [];

		let image = '';
		if (result.cover?.url) {
			image = 'https:' + result.cover.url.replace('t_thumb', 't_cover_big');
		}

		// DÜZELTME 2: Date objesi yerine String'e çevirip gönderiyoruz
		const dateStr = result.first_release_date
			? new Date(result.first_release_date * 1000).toISOString().split('T')[0]
			: '';

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: result.first_release_date ? new Date(result.first_release_date * 1000).getFullYear().toString() : '',
			dataSource: this.apiName,
			url: result.url,
			id: result.id.toString(),
			developers: developers,
			publishers: publishers,
			genres: genres,
			onlineRating: result.total_rating,
			image: image,

			released: true,
			// Hata veren satır düzeltildi:
			releaseDate: dateStr ? this.plugin.dateFormatter.format(dateStr, this.apiDateFormat) : '',

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.IGDBAPI_disabledMediaTypes || [];
	}
}