import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import { imageUrlExists } from '../../utils/Utils';

export class SteamAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'DD MMM, YYYY';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'SteamAPI';
		this.apiDescription = 'A free API for all Steam games.';
		this.apiUrl = 'https://www.steampowered.com/';
		this.types = [MediaType.Game];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('game', 'game');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;

		// console.debug(data);

		const ret: MediaTypeModel[] = [];

		for (const result of data) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: result.name,
					englishTitle: result.name,
					year: '',
					dataSource: this.apiName,
					id: result.appid,
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&l=en`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		// console.debug(await fetchData.json);

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

		// console.debug(result);

		// Check if a poster version of the image exists, else use the header image
		const imageUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${result.steam_appid}/library_600x900_2x.jpg`;
		const exists = await imageUrlExists(imageUrl);
		let finalimageurl;
		if (exists) {
			finalimageurl = imageUrl;
		} else {
			finalimageurl = result.header_image ?? '';
		}

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: new Date(result.release_date.date).getFullYear().toString(),
			dataSource: this.apiName,
			url: `https://store.steampowered.com/app/${result.steam_appid}`,
			id: result.steam_appid,

			developers: result.developers,
			publishers: result.publishers,
			genres: result.genres?.map((x: any) => x.description) ?? [],
			onlineRating: Number.parseFloat(result.metacritic?.score ?? 0),
			image: finalimageurl ?? '',

			released: !result.release_date?.coming_soon,
			releaseDate: this.plugin.dateFormatter.format(result.release_date?.date, this.apiDateFormat) ?? 'unknown',

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.SteamAPI_disabledMediaTypes as MediaType[];
	}
}
