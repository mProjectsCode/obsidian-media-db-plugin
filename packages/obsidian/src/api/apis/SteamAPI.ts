import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { GameModel } from 'packages/obsidian/src/models/GameModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind, toAppError } from 'packages/obsidian/src/utils/AppError';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { imageUrlExists } from 'packages/obsidian/src/utils/Utils';

interface SearchResponse {
	appid: string;
	name: string;
	icon: string;
	logo: string;
}

type IdResponse = Record<
	string,
	{
		success: boolean;
		data: GameDetails;
	}
>;

interface GameDetails {
	type: string;
	name: string;
	steam_appid: number;
	required_age: string;
	is_free: boolean;
	controller_support: string;
	dlc: number[];
	detailed_description: string;
	about_the_game: string;
	short_description: string;
	supported_languages: string;
	reviews: string;
	header_image: string;
	capsule_image: string;
	capsule_imagev5: string;
	website: string;
	pc_requirements: Requirements;
	mac_requirements: Requirements;
	linux_requirements: Requirements;
	legal_notice: string;
	drm_notice: string;
	developers: string[];
	publishers: string[];
	price_overview: PriceOverview;
	packages: number[];
	platforms: Platforms;
	metacritic?: {
		score: number;
		url: string;
	};
	categories: Category[];
	genres: Genre[];
	recommendations: {
		total: number;
	};
	achievements: {
		total: number;
		highlighted: Achievement[];
	};
	release_date: {
		coming_soon: boolean;
		date: string;
	};
	support_info: {
		url: string;
		email: string;
	};
	background: string;
	background_raw: string;
	content_descriptors: {
		ids: number[];
		notes: string;
	};
	ratings: Ratings;
}

interface Requirements {
	minimum: string;
	recommended: string;
}

interface PriceOverview {
	currency: string;
	initial: number;
	final: number;
	discount_percent: number;
	initial_formatted: string;
	final_formatted: string;
}

interface Platforms {
	windows: boolean;
	mac: boolean;
	linux: boolean;
}

interface Category {
	id: number;
	description: string;
}

interface Genre {
	id: string;
	description: string;
}

interface Achievement {
	name: string;
	path: string;
}

type Ratings = Record<
	string,
	{
		rating: string;
		descriptors: string;
		use_age_gate: string;
		required_age: string;
		rating_id?: string;
		banned?: string;
		rating_generated?: string;
	}
>;

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

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(title)}`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);
		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;

		if (fetchData.status !== 200) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status },
			});
		}

		const data = (await fetchData.json) as SearchResponse[];

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

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(id)}&l=en`;
		const fetchDataResult = await fromPromise(
			requestUrl({
				url: searchUrl,
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);
		if (!fetchDataResult.ok) {
			return err(fetchDataResult.error);
		}
		const fetchData = fetchDataResult.value;

		if (fetchData.status !== 200) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status, id },
			});
		}

		// console.debug(await fetchData.json);
		const data = (await fetchData.json) as IdResponse;

		let result: GameDetails | undefined = undefined;
		for (const [key, value] of Object.entries(data)) {
			// after some testing I found out that id is somehow a number despite that it's defined as string...
			if (key === String(id)) {
				result = value.data;
			}
		}
		if (!result) {
			return err({
				kind: AppErrorKind.Api,
				message: 'MDB | API returned invalid data.',
				userMessage: 'Steam returned invalid data.',
				context: { apiName: this.apiName, id },
			});
		}

		// console.debug(result);

		// Check if a poster version of the image exists, else use the header image
		const imageUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${result.steam_appid}/library_600x900_2x.jpg`;
		const existsResult = await fromPromise(imageUrlExists(imageUrl), cause =>
			toAppError(cause, {
				kind: AppErrorKind.Network,
				message: `MDB | Failed to validate image URL for ${this.apiName}`,
				userMessage: `Failed to validate image URL for ${this.apiName}`,
				context: { apiName: this.apiName, id, imageUrl },
			}),
		);
		const exists = existsResult.ok ? existsResult.value : false;
		let finalimageurl;
		if (exists) {
			finalimageurl = imageUrl;
		} else {
			finalimageurl = result.header_image ?? '';
		}

		return ok(
			new GameModel({
				type: MediaType.Game,
				title: result.name,
				englishTitle: result.name,
				year: new Date(result.release_date.date).getFullYear().toString(),
				dataSource: this.apiName,
				url: `https://store.steampowered.com/app/${result.steam_appid}`,
				id: result.steam_appid.toString(),

				developers: result.developers,
				publishers: result.publishers,
				genres: result.genres?.map(x => x.description),
				onlineRating: result.metacritic?.score,
				image: finalimageurl,

				released: !result.release_date?.coming_soon,
				releaseDate: this.plugin.dateFormatter.format(result.release_date?.date, this.apiDateFormat),

				userData: {
					played: false,
					personalRating: 0,
				},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.SteamAPI_disabledMediaTypes;
	}
}
