import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import { requestUrl } from 'obsidian';
import { MediaType } from '../../utils/MediaType';

export class MobyGamesAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-DD-MM';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MobyGamesAPI';
		this.apiDescription = 'A free API for games.';
		this.apiUrl = 'https://api.mobygames.com/v1';
		this.types = [MediaType.Game];
	}
	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/games?title=${encodeURIComponent(title)}&api_key=${this.plugin.settings.MobyGamesKey}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		console.debug(fetchData);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status === 429) {
			throw Error(`MDB | Too many requests for ${this.apiName}, you've exceeded your API quota.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json;
		console.debug(data);
		const ret: MediaTypeModel[] = [];
		for (const result of data.games) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.title,
					englishTitle: result.title,
					year: new Date(result.platforms[0].first_release_date).getFullYear().toString(),
					dataSource: this.apiName,
					id: result.game_id,
				} as GameModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/games?id=${encodeURIComponent(id)}&api_key=${this.plugin.settings.MobyGamesKey}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});
		console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json;
		console.debug(data);
		const result = data.games[0];

		const model = new GameModel({
			type: MediaType.Game,
			title: result.title,
			englishTitle: result.title,
			year: new Date(result.platforms[0].first_release_date).getFullYear().toString(),
			dataSource: this.apiName,
			url: `https://www.mobygames.com/game/${result.game_id}`,
			id: result.game_id,
			developers: [],
			publishers: [],
			genres: result.genres?.map((x: any) => x.genre_name) ?? [],
			onlineRating: result.moby_score,
			image: this.plugin.settings.embedPosters ? `![](${result.sample_cover.image ?? ''})` ?? '' : result.sample_cover.image ?? '',

			released: true,
			releaseDate: result.platforms[0].first_release_date ?? 'unknown',

			userData: {
				played: false,

				personalRating: 0,
			},
		} as GameModel);

		return model;
	}
}
