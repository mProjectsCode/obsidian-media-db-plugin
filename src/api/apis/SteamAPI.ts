import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import { requestUrl } from 'obsidian';
import { MediaType } from '../../utils/MediaType';

export class SteamAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'DD MMM, YYYY';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'SteamAPI';
		this.apiDescription = 'A free API for all Steam games.';
		this.apiUrl = 'http://www.steampowered.com/';
		this.types = [MediaType.Game];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('game', 'game');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `http://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json;

		console.debug(data);

		const filteredData = [];

		for (const app of data.applist.apps) {
			if (
				app.name
					.normalize('NFD')
					.replace(/\p{Diacritic}/gu, '')
					.toLowerCase()
					.includes(title.toLowerCase())
			) {
				filteredData.push(app);
			}
			if (filteredData.length > 20) {
				break;
			}
		}

		const ret: MediaTypeModel[] = [];

		for (const result of filteredData) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: '',
					dataSource: this.apiName,
					id: result.appid,
				} as GameModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `http://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&l=en`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		console.debug(await fetchData.json);

		let result: any;
		for (const [key, value] of Object.entries(await fetchData.json)) {
			// console.log(typeof key, key)
			// console.log(typeof id, id)
			// after some testing I found out that id is somehow a number despite that it's defined as string...
			if (key === String(id)) {
				result = (value as any).data;
			}
		}
		if (!result) {
			throw Error(`MDB | API returned invalid data.`);
		}

		console.debug(result);

		const model = new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: new Date(result.release_date.date).getFullYear().toString(),
			dataSource: this.apiName,
			url: `https://store.steampowered.com/app/${result.steam_appid}`,
			id: result.steam_appid,

			developers: result['developers'],
			publishers: result['publishers'],
			genres: result.genres?.map((x: any) => x.description) ?? [],
			onlineRating: Number.parseFloat(result.metacritic?.score ?? 0),
			image: this.plugin.settings.embedPosters ? `![](${result.header_image ?? ''})` : result.header_image ?? '',

			released: !result.release_date?.comming_soon,
			releaseDate: this.plugin.dateFormatter.format(result.release_date?.date, this.apiDateFormat) ?? 'unknown',

			userData: {
				played: false,
				personalRating: 0,
			},
		} as GameModel);

		return model;
	}
}
