import { requestUrl } from 'obsidian';
import { ComicBookModel } from 'src/models/ComicBookModel';
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
		this.types = [MediaType.ComicBook];
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
				new ComicBookModel({
					title: result.name,
					englishTitle: result.name,
					year: result.start_year,
					dataSource: this.apiName,
					id: result.id,
					publishers: result.publisher.name ?? [],
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `${this.apiUrl}/volume/4050-${encodeURIComponent(id)}/?api_key=${this.plugin.settings.ComicVineKey}&format=json`;
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

		return new ComicBookModel({
					type: MediaType.ComicBook,
					title: result.name,
					plot: result.deck,
					year: result.start_year ?? '',
					dataSource: this.apiName,
					url: result.site_detail_url,
					id: result.id,

					creators: result.people?.map((x: any) => x.name) ?? [],
					issues: result.count_of_issues,
					onlineRating: result.score ?? 0,
					image: result.image?.original_url ?? '',

					released: true,
					publishers: result.publisher.name ?? [],
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
