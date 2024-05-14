import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { BookModel } from 'src/models/BookModel';
import { MediaType } from '../../utils/MediaType';

export class OpenLibraryAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'OpenLibraryAPI';
		this.apiDescription = 'A free API for books';
		this.apiUrl = 'https://openlibrary.org/';
		this.types = [MediaType.Book];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`;

		const fetchData = await fetch(searchUrl);
		console.debug(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json();

		console.debug(data);

		const ret: MediaTypeModel[] = [];

		for (const result of data.docs) {
			ret.push(
				new BookModel({
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					year: result.first_publish_year,
					dataSource: this.apiName,
					id: result.key,
					author: result.author_name ?? 'unknown',
				} as BookModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://openlibrary.org/search.json?q=key:${encodeURIComponent(id)}`;
		const fetchData = await fetch(searchUrl);
		console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const result = data.docs[0];

		const model = new BookModel({
			title: result.title,
			year: result.first_publish_year,
			dataSource: this.apiName,
			url: `https://openlibrary.org` + result.key,
			id: result.key,
			isbn: (result.isbn ?? []).find((el: string | any[]) => el.length <= 10) ?? 'unknown',
			isbn13: (result.isbn ?? []).find((el: string | any[]) => el.length == 13) ?? 'unknown',
			englishTitle: result.title_english ?? result.title,

			author: result.author_name ?? 'unknown',
			plot: result.description ?? 'unknown',
			pages: result.number_of_pages_median ?? 'unknown',
			onlineRating: Number.parseFloat(Number(result.ratings_average ?? 0).toFixed(2)),
			image: this.plugin.settings.embedPosters
				? `![](${`https://covers.openlibrary.org/b/OLID/` + result.cover_edition_key + `-L.jpg`}`
				: `https://covers.openlibrary.org/b/OLID/` + result.cover_edition_key + `-L.jpg`,

			released: true,

			userData: {
				read: false,
				lastRead: '',
				personalRating: 0,
			},
		} as BookModel);

		return model;
	}
}
