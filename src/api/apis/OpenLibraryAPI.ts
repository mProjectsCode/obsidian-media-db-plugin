import createClient from 'openapi-fetch';
import { BookModel } from 'src/models/BookModel';
import { obsidianFetch } from 'src/utils/Utils';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/OpenLibrary';

interface SearchResponse {
	editions: {
		docs: {
			key?: string;
			title?: string;
			cover_i?: number;
			isbn?: string[];
		}[];
	};
	cover_i?: number;
	has_fulltext?: boolean;
	edition_count?: number;
	title?: string;
	author_name?: string[];
	first_publish_year?: number;
	key: string;

	number_of_pages_median?: number;
	isbn?: string[];
	ratings_average?: number;
}

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

		const client = createClient<paths>({ baseUrl: 'https://openlibrary.org/' });

		const response = await client.GET('/search.json', {
			params: {
				query: {
					q: title,
				},
			},
			fetch: obsidianFetch,
		});

		if (response.error !== undefined) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const data = response.data as {
			docs: SearchResponse[];
		};

		// console.debug(data);

		const ret: MediaTypeModel[] = [];

		for (const result of data.docs) {
			ret.push(
				new BookModel({
					title: result.title,
					englishTitle: result.title,
					year: result.first_publish_year?.toString() ?? 'unknown',
					dataSource: this.apiName,
					id: result.key,
					author: result.author_name?.join(', '),
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const client = createClient<paths>({ baseUrl: 'https://openlibrary.org/' });

		const response = await client.GET('/search.json', {
			params: {
				query: {
					q: `${id}`,
					fields: 'key,title,author_name,number_of_pages_median,first_publish_year,isbn,ratings_score,first_sentence,title_suggest,rating*,cover*,editions',
				},
			},
			fetch: obsidianFetch,
		});

		if (response.error !== undefined) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const data = response.data as {
			docs: SearchResponse[];
			q?: string;
		};

		const result = data.docs[0];

		let key = result.key;
		let title = result.title;
		let cover_i = result.cover_i;
		let isbnArr = result.isbn;

		// Check if the query is for /isbn/ or /books/ and extract from editions.docs if present
		const q = data.q ?? '';
		if ((q.includes('/isbn/') || q.includes('/books/')) && result.editions && Array.isArray(result.editions.docs) && result.editions.docs.length > 0) {
			const edition = result.editions.docs[0];
			key = edition.key ?? key;
			title = edition.title ?? title;
			cover_i = edition.cover_i ?? cover_i;
			isbnArr = edition.isbn ?? isbnArr;
		}

		const pages = Number(result.number_of_pages_median);
		const isbn = Number((isbnArr ?? []).find((el: string) => el.length <= 10));
		const isbn13 = Number((isbnArr ?? []).find((el: string) => el.length == 13));

		return new BookModel({
			title: title,
			year: result.first_publish_year?.toString() ?? 'unknown',
			dataSource: this.apiName,
			url: `https://openlibrary.org` + key,
			id: key,
			isbn: Number.isNaN(isbn) ? undefined : isbn,
			isbn13: Number.isNaN(isbn13) ? undefined : isbn13,
			englishTitle: title,

			author: result.author_name?.join(', '),
			pages: Number.isNaN(pages) ? undefined : pages,
			onlineRating: result.ratings_average,
			image: cover_i ? `https://covers.openlibrary.org/b/id/` + cover_i + `-L.jpg` : undefined,

			released: true,

			userData: {
				read: false,
				lastRead: '',
				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.OpenLibraryAPI_disabledMediaTypes;
	}
}
