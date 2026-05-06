import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { BookModel } from 'packages/obsidian/src/models/BookModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind, toAppError } from 'packages/obsidian/src/utils/AppError';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/OpenLibrary';

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
	description?: string;

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

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const client = createClient<paths>({ baseUrl: 'https://openlibrary.org/' });

		const responseResult = await fromPromise(
			client.GET('/search.json', {
				params: {
					query: {
						q: title,
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;

		if (response.error !== undefined) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status },
			});
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

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		const client = createClient<paths>({ baseUrl: 'https://openlibrary.org/' });

		const responseResult = await fromPromise(
			client.GET('/search.json', {
				params: {
					query: {
						q: `${id}`,
						fields: 'key,title,author_name,number_of_pages_median,first_publish_year,isbn,ratings_score,first_sentence,title_suggest,rating*,cover*,editions,description',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;

		if (response.error !== undefined) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, id },
			});
		}

		const data = response.data as {
			docs: SearchResponse[];
			q?: string;
		};

		const result = data.docs?.[0];
		if (!result) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | No data found for ID ${id} in ${this.apiName}.`,
				userMessage: `No data found for ID ${id}.`,
				context: { apiName: this.apiName, id },
			});
		}

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

		return ok(
			new BookModel({
				title: title,
				year: result.first_publish_year?.toString() ?? 'unknown',
				dataSource: this.apiName,
				url: `https://openlibrary.org` + key,
				id: key,
				isbn: Number.isNaN(isbn) ? undefined : isbn,
				isbn13: Number.isNaN(isbn13) ? undefined : isbn13,
				englishTitle: title,

				author: result.author_name?.join(', '),
				plot: result.description ?? undefined,
				pages: Number.isNaN(pages) ? undefined : pages,
				onlineRating: result.ratings_average,
				image: cover_i ? `https://covers.openlibrary.org/b/id/` + cover_i + `-L.jpg` : undefined,

				released: true,

				userData: {
					read: false,
					lastRead: '',
					personalRating: 0,
				},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.OpenLibraryAPI_disabledMediaTypes;
	}
}
