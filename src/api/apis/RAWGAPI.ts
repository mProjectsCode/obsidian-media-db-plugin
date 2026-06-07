import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

interface RAWGGame {
	id: number; name: string; released?: string; background_image?: string;
	name_original?: string; website?: string; slug?: string; metacritic?: number;
	developers?: { name: string }[]; publishers?: { name: string }[]; genres?: { name: string }[];
}
interface RAWGSearchResponse { results: RAWGGame[]; }

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
		if (!this.plugin.settings.RAWGAPIKey) throw Error(`MDB | API key for ${this.apiName} missing.`);
		const response = await requestUrl({
			url: `${this.apiUrl}/games?key=${this.plugin.settings.RAWGAPIKey}&search=${encodeURIComponent(title)}&page_size=20`,
			method: 'GET',
		});
		if (response.status !== 200) throw Error(`MDB | Error ${response.status} from ${this.apiName}.`);

		const data = response.json as RAWGSearchResponse;
		return data.results.map(result => new GameModel({
			type: MediaType.Game, title: result.name, englishTitle: result.name,
			year: result.released ? new Date(result.released).getFullYear().toString() : '',
			dataSource: this.apiName, id: result.id.toString(), image: result.background_image
		}));
	}

	async getById(id: string): Promise<MediaTypeModel> {
		if (!this.plugin.settings.RAWGAPIKey) throw Error(`MDB | API key for ${this.apiName} missing.`);
		const response = await requestUrl({
			url: `${this.apiUrl}/games/${id}?key=${this.plugin.settings.RAWGAPIKey}`,
			method: 'GET',
		});
		if (response.status !== 200) throw Error(`MDB | Error ${response.status} from ${this.apiName}.`);

		const result = response.json as RAWGGame;
		return new GameModel({
			type: MediaType.Game, title: result.name, englishTitle: result.name_original || result.name,
			year: result.released ? new Date(result.released).getFullYear().toString() : '',
			dataSource: this.apiName, url: result.website || `https://rawg.io/games/${result.slug}`,
			id: result.id.toString(), developers: result.developers?.map(d => d.name) || [],
			publishers: result.publishers?.map(p => p.name) || [], genres: result.genres?.map(g => g.name) || [],
			onlineRating: result.metacritic, image: result.background_image,
			released: result.released != null, releaseDate: result.released,
			userData: { played: false, personalRating: 0 },
		});
	}
	getDisabledMediaTypes(): MediaType[] { return this.plugin.settings.RAWGAPI_disabledMediaTypes || []; }
}