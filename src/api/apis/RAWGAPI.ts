import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

export class RAWGAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'RAWGAPI';
		this.apiDescription = 'A large open video game database.';
		this.apiUrl = 'https://api.rawg.io/api';
		this.types = [MediaType.Game];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		if (!this.plugin.settings.RAWGAPIKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const response = await requestUrl({
			url: `${this.apiUrl}/games?key=${this.plugin.settings.RAWGAPIKey}&search=${encodeURIComponent(title)}&page_size=20`,
			method: 'GET',
		});

		if (response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.status !== 200) {
			throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		}

		const data = response.json;
		const ret: MediaTypeModel[] = [];

		for (const result of data.results) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: result.released ? new Date(result.released).getFullYear().toString() : '',
					dataSource: this.apiName,
					id: result.id.toString(),
					image: result.background_image // RAWG arama sonucunda resim verir
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.RAWGAPIKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const response = await requestUrl({
			url: `${this.apiUrl}/games/${id}?key=${this.plugin.settings.RAWGAPIKey}`,
			method: 'GET',
		});

		if (response.status !== 200) {
			throw Error(`MDB | Received status code ${response.status} from ${this.apiName}.`);
		}

		const result = response.json;

		const developers = result.developers?.map((d: any) => d.name) || [];
		const publishers = result.publishers?.map((p: any) => p.name) || [];
		const genres = result.genres?.map((g: any) => g.name) || [];

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name_original || result.name,
			year: result.released ? new Date(result.released).getFullYear().toString() : '',
			dataSource: this.apiName,
			url: result.website || `https://rawg.io/games/${result.slug}`,
			id: result.id.toString(),
			developers: developers,
			publishers: publishers,
			genres: genres,
			onlineRating: result.metacritic,
			image: result.background_image, // RAWG yüksek kaliteli görseli default verir

			released: result.released != null,
			releaseDate: result.released && this.plugin.dateFormatter.format(result.released, this.apiDateFormat) || '',

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.RAWGAPI_disabledMediaTypes || [];
	}
}