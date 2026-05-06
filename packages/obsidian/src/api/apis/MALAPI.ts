import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MovieModel } from 'packages/obsidian/src/models/MovieModel';
import { SeriesModel } from 'packages/obsidian/src/models/SeriesModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind } from 'packages/obsidian/src/utils/AppError';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';
import { isTruthy, obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/MALAPI';

export class MALAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI';
		this.apiDescription = 'A free API for Anime. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = [MediaType.Movie, MediaType.Series];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('movie', 'movie');
		this.typeMappings.set('special', 'special');
		this.typeMappings.set('tv', 'series');
		this.typeMappings.set('ova', 'ova');
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const client = createClient<paths>({ baseUrl: 'https://api.jikan.moe/v4/' });

		const response = await client.GET('/anime', {
			params: {
				query: {
					q: title,
					limit: 20,
					sfw: this.plugin.settings.sfwFilter ? true : false,
				},
			},
			fetch: obsidianFetch,
		});

		if (response.error !== undefined) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status },
			});
		}

		const data = response.data?.data;

		const ret: MediaTypeModel[] = [];

		for (const result of data ?? []) {
			const resType = result.type?.toLowerCase();
			const type = resType ? this.typeMappings.get(resType) : undefined;
			const year = result.year?.toString() ?? result.aired?.prop?.from?.year?.toString() ?? '';
			const id = result.mal_id?.toString();

			if (type === undefined) {
				ret.push(
					new MovieModel({
						subType: '',
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year,
						dataSource: this.apiName,
						id,
					}),
				);
			}
			if (type === 'movie' || type === 'special') {
				ret.push(
					new MovieModel({
						subType: type,
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year,
						dataSource: this.apiName,
						id,
					}),
				);
			} else if (type === 'series' || type === 'ova') {
				ret.push(
					new SeriesModel({
						subType: type,
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year,
						dataSource: this.apiName,
						id,
					}),
				);
			}
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		const client = createClient<paths>({ baseUrl: 'https://api.jikan.moe/v4/' });

		const response = await client.GET('/anime/{id}/full', {
			params: {
				path: {
					id: id as unknown as number, // This is fine
				},
			},
			fetch: obsidianFetch,
		});

		if (response.error !== undefined) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, id },
			});
		}

		const result = response.data?.data;

		if (result === undefined) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | No data found for ID ${id} in ${this.apiName}.`,
				userMessage: `No data found for ID ${id} in ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}

		const resType = result.type?.toLowerCase();
		const type = resType ? this.typeMappings.get(resType) : undefined;
		const year = result.year?.toString() ?? result.aired?.prop?.from?.year?.toString();
		const new_id = result.mal_id?.toString();

		if (type === undefined) {
			return ok(
				new MovieModel({
					subType: undefined,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					japaneseTitle: result.title_japanese,
					year: year,
					dataSource: this.apiName,
					url: result.url,
					id: new_id,

					plot: result.synopsis,
					genres: result.genres?.map(x => x.name).filter(isTruthy),
					studio: result.studios?.map(x => x.name).filter(isTruthy),
					duration: result.duration,
					onlineRating: result.score,
					image: result.images?.jpg?.image_url,

					released: true,
					ageRating: result.rating,
					premiere: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat),
					streamingServices: result.streaming?.map(x => x.name).filter(isTruthy),

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				}),
			);
		}

		if (type === 'movie' || type === 'special') {
			return ok(
				new MovieModel({
					subType: type,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					japaneseTitle: result.title_japanese,
					year: year,
					dataSource: this.apiName,
					url: result.url,
					id: new_id,

					plot: result.synopsis,
					genres: result.genres?.map(x => x.name).filter(isTruthy),
					studio: result.studios?.map(x => x.name).filter(isTruthy),
					duration: result.duration,
					onlineRating: result.score,
					image: result.images?.jpg?.image_url,

					released: true,
					ageRating: result.rating,
					premiere: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat),
					streamingServices: result.streaming?.map(x => x.name).filter(isTruthy),

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				}),
			);
		} else if (type === 'series' || type === 'ova') {
			return ok(
				new SeriesModel({
					subType: type,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					japaneseTitle: result.title_japanese,
					year: year,
					dataSource: this.apiName,
					url: result.url,
					id: new_id,

					plot: result.synopsis,
					genres: result.genres?.map(x => x.name).filter(isTruthy),
					studio: result.studios?.map(x => x.name).filter(isTruthy),
					episodes: result.episodes,
					duration: result.duration,
					onlineRating: result.score,
					streamingServices: result.streaming?.map(x => x.name).filter(isTruthy),
					image: result.images?.jpg?.image_url,

					released: true,
					ageRating: result.rating,
					airedFrom: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat),
					airedTo: this.plugin.dateFormatter.format(result.aired?.to, this.apiDateFormat),
					airing: result.airing,

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				}),
			);
		}

		return err({
			kind: AppErrorKind.Unexpected,
			message: `MDB | Unknown media type for id ${id}`,
			userMessage: `Unknown media type for id ${id}`,
			context: { apiName: this.apiName, id },
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MALAPI_disabledMediaTypes;
	}
}
