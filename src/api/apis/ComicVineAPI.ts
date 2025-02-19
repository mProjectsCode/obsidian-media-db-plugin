import { requestUrl } from 'obsidian';
import { ComicMangaModel } from 'src/models/ComicMangaModel';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

export class ComicVineAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'ComicVineAPI';
		this.apiDescription = 'A free API for comic books.';
		this.apiUrl = 'https://comicvine.gamespot.com/api';
		this.types = [MediaType.ComicManga];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `${this.apiUrl}/search/?api_key=${this.plugin.settings.ComicVineKey}&format=json&resources=volume&query=${encodeURIComponent(title)}`;
		const fetchData = await requestUrl({
			url: searchUrl,
		});
		// console.debug(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json;
		// console.debug(data);
		const ret: MediaTypeModel[] = [];
		for (const result of data.results) {
			ret.push(
				new ComicMangaModel({
					title: result.name,
					englishTitle: result.name,
					year: result.start_year,
					dataSource: this.apiName,
					id: `4050-${result.id}`,
					publishers: result.publisher?.name ?? [],
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/volume/${encodeURIComponent(id)}/?api_key=${this.plugin.settings.ComicVineKey}&format=json`;
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

		return new ComicMangaModel({
			type: MediaType.ComicManga,
			title: result.name,
			englishTitle: result.name,
			alternateTitles: result.aliases,
			plot: result.deck,
			year: result.start_year ?? '',
			dataSource: this.apiName,
			url: result.site_detail_url,
			id: `4050-${result.id}`,

			authors: result.people?.map((x: any) => x.name) ?? [],
			chapters: result.count_of_issues,
			image: result.image?.original_url ?? '',

			released: true,
			publishers: result.publisher?.name ?? [],
			publishedFrom: result.start_year ?? 'unknown',
			publishedTo: 'unknown',
			status: result.status,

			userData: {
				read: false,
				lastRead: '',
				personalRating: 0,
			},
		});
	}
}
