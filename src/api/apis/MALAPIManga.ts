import createClient from 'openapi-fetch';
import { isTruthy, obsidianFetch } from 'src/utils/Utils';
import type MediaDbPlugin from '../../main';
import { ComicMangaModel } from '../../models/ComicMangaModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/MALAPI';

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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

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
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
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

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

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
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const result = response.data?.data;

		if (!result) {
			throw Error(`MDB | No data found for ID ${id} in ${this.apiName}.`);
		}

		const resType = result.type?.toLowerCase();
		const type = resType ? this.typeMappings.get(resType) : undefined;
		const year = result.published?.prop?.from?.year?.toString() ?? '';
		const new_id = result.mal_id?.toString();

		return new ComicMangaModel({
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
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.MALAPIManga_disabledMediaTypes;
	}
}
