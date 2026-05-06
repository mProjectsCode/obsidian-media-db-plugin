import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { ComicMangaModel } from 'packages/obsidian/src/models/ComicMangaModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';
import { isTruthy, obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/MALAPI';

export class MALAPIManga extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI Manga';
		this.apiDescription = 'A free API for Manga. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = [MediaType.ComicManga];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('manga', 'manga');
		this.typeMappings.set('manhwa', 'manhwa');
		this.typeMappings.set('doujinshi', 'doujin');
		this.typeMappings.set('one-shot', 'oneshot');
		this.typeMappings.set('manhua', 'manhua');
		this.typeMappings.set('light novel', 'light-novel');
		this.typeMappings.set('novel', 'novel');
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const client = createClient<paths>({ baseUrl: 'https://api.jikan.moe/v4/' });

		const response = await client.GET('/manga', {
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
				kind: MDBErrorKind.Api,
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
			const year = result.published?.prop?.from?.year?.toString() ?? '';
			const id = result.mal_id?.toString();

			ret.push(
				new ComicMangaModel({
					subType: type,
					title: result.title,
					plot: result.synopsis ?? undefined,
					englishTitle: result.title_english ?? result.title,
					alternateTitles: result.titles?.map(x => x.title).filter(isTruthy),
					year: year,
					dataSource: this.apiName,
					url: result.url,
					id: id,

					genres: result.genres?.map(x => x.name).filter(isTruthy),
					authors: result.authors?.map(x => x.name).filter(isTruthy),
					chapters: result.chapters,
					volumes: result.volumes,
					onlineRating: result.score,
					image: result.images?.jpg?.image_url,

					released: true,
					publishedFrom: this.plugin.dateFormatter.format(result.published?.from, this.apiDateFormat),
					publishedTo: this.plugin.dateFormatter.format(result.published?.to, this.apiDateFormat),
					status: result.status,

					userData: {
						read: false,
						lastRead: '',
						personalRating: 0,
					},
				}),
			);
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		const client = createClient<paths>({ baseUrl: 'https://api.jikan.moe/v4/' });

		const response = await client.GET('/manga/{id}/full', {
			params: {
				path: {
					id: id as unknown as number, // This is fine
				},
			},
			fetch: obsidianFetch,
		});

		if (response.error !== undefined) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, id },
			});
		}

		const result = response.data?.data;

		if (!result) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data found for ID ${id} in ${this.apiName}.`,
				userMessage: `No data found for ID ${id} in ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}

		const resType = result.type?.toLowerCase();
		const type = resType ? this.typeMappings.get(resType) : undefined;
		const year = result.published?.prop?.from?.year?.toString() ?? '';
		const new_id = result.mal_id?.toString();

		return ok(
			new ComicMangaModel({
				subType: type,
				title: result.title,
				plot: result.synopsis ?? undefined,
				englishTitle: result.title_english ?? result.title,
				alternateTitles: result.titles?.map(x => x.title).filter(isTruthy),
				year: year,
				dataSource: this.apiName,
				url: result.url,
				id: new_id,

				genres: result.genres?.map(x => x.name).filter(isTruthy),
				authors: result.authors?.map(x => x.name).filter(isTruthy),
				chapters: result.chapters,
				volumes: result.volumes,
				onlineRating: result.score,
				image: result.images?.jpg?.image_url,

				released: true,
				publishedFrom: this.plugin.dateFormatter.format(result.published?.from, this.apiDateFormat),
				publishedTo: this.plugin.dateFormatter.format(result.published?.to, this.apiDateFormat),
				status: result.status,

				userData: {
					read: false,
					lastRead: '',
					personalRating: 0,
				},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MALAPIManga_disabledMediaTypes;
	}
}
