import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import { requestUrl } from 'obsidian';
import { MediaType } from '../../utils/MediaType';

export class GiantBombAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'GiantBombAPI';
		this.apiDescription = 'A free API for games.';
		this.apiUrl = 'https://www.giantbomb.com/api';
		this.types = [MediaType.Game];
	}
	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		if (!this.plugin.settings.GiantBombKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `${this.apiUrl}/games?api_key=${this.plugin.settings.GiantBombKey}&filter=name:${encodeURIComponent(title)}&format=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		// console.debug(fetchData);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status === 429) {
			throw Error(`MDB | Too many requests for ${this.apiName}, you've exceeded your API quota.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		// console.debug(data);
		const ret: MediaTypeModel[] = [];
		for (const result of data.results) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: new Date(result.original_release_date).getFullYear().toString(),
					dataSource: this.apiName,
					id: result.guid,
				} as GameModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.GiantBombKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `${this.apiUrl}/game/${encodeURIComponent(id)}/?api_key=${this.plugin.settings.GiantBombKey}&format=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});
		console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		// console.debug(data);
		const result = data.results;

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: new Date(result.original_release_date).getFullYear().toString(),
			dataSource: this.apiName,
			url: result.site_detail_url,
			id: result.guid,
			developers: result.developers?.map((x: any) => x.name) ?? [],
			publishers: result.publishers?.map((x: any) => x.name) ?? [],
			genres: result.genres?.map((x: any) => x.name) ?? [],
			onlineRating: 0,
			image: result.image?.super_url ?? '',

			released: true,
			releaseDate: result.original_release_date ?? 'unknown',

			userData: {
				played: false,

				personalRating: 0,
			},
		} as GameModel);
	}
}
