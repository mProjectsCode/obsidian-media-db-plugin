import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { BookModel } from 'packages/obsidian/src/models/BookModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/OpenLibrary';

type OpenLibraryIdKind = 'book' | 'search';

interface SearchResponse {
	key?: string;
	title?: string;
	cover_i?: number;
	author_name?: string[];
	author_key?: string[];
	first_publish_year?: number;
	description?: string | { value?: string };
	subject?: string[];
	number_of_pages_median?: number;
	number_of_pages?: number;
	ratings_average?: number;
	isbn?: string[];
}

interface BookResponse {
	key?: string;
	title?: string;
	covers?: number[];
	isbn_10?: string[];
	isbn_13?: string[];
	authors?: { key?: string }[];
	works?: { key?: string }[];
	pagination?: string;
	publish_date?: string;
	number_of_pages?: number;
}

export class OpenLibraryAPI extends APIModel {
	plugin: MediaDbPlugin;
	private client = createClient<paths>({ baseUrl: 'https://openlibrary.org/' });

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'OpenLibraryAPI';
		this.apiDescription = 'A free API for books';
		this.apiUrl = 'https://openlibrary.org/';
		this.types = [MediaType.Book];
	}

	private detectIdKind(id: string): OpenLibraryIdKind {
		if (/\/books\/OL\d+M/i.test(id)) return 'book';
		if (/\/isbn\/\d+/i.test(id)) return 'book';
		return 'search';
	}

	private normalizeId(id: string): string {
		return id.startsWith('http') ? new URL(id).pathname : id;
	}

	private pickDescription(desc?: string | { value?: string }): string | undefined {
		if (!desc) return undefined;
		return typeof desc === 'string' ? desc : desc.value;
	}

	private async fetchOpenLibraryJson<T>(url: string, context: Record<string, unknown>): Promise<Result<T, MDBError>> {
		try {
			const response = await obsidianFetch(new Request(`https://openlibrary.org${url}`));
			if (!response.ok) {
				return err({
					kind: MDBErrorKind.Api,
					message: `MDB | Received status code ${response.status} from ${this.apiName}.`,
					userMessage: `Received status code ${response.status} from ${this.apiName}.`,
					context: { ...context, apiName: this.apiName, status: response.status },
				});
			}
			return ok((await response.json()) as T);
		} catch (cause) {
			return err(
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context,
				}),
			);
		}
	}

	private async searchByOlid(olid: string): Promise<Result<SearchResponse | undefined, MDBError>> {
		const responseResult = await fromPromise(
			this.client.GET('/search.json', {
				params: {
					query: {
						q: olid,
						fields: 'key,title,author_name,author_key,first_publish_year,cover_i,subject,number_of_pages,number_of_pages_median,description,ratings_average,isbn',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, olid },
				}),
		);

		if (!responseResult.ok) return err(responseResult.error);

		const response = responseResult.value;
		if (response.error !== undefined) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, olid },
			});
		}

		const data = response.data as { docs?: SearchResponse[] };
		return ok(data.docs?.[0]);
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const responseResult = await fromPromise(
			this.client.GET('/search.json', {
				params: {
					query: {
						q: title,
						fields: 'key,title,author_name,first_publish_year,cover_i,subject,number_of_pages,number_of_pages_median,description,ratings_average,isbn',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!responseResult.ok) return err(responseResult.error);

		const response = responseResult.value;
		if (response.error !== undefined) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status },
			});
		}

		const data = response.data as { docs: SearchResponse[] };
		const ret: MediaTypeModel[] = [];

		for (const result of data.docs) {
			const isbn10 = result.isbn?.find(el => el.length <= 10);
			const isbn13 = result.isbn?.find(el => el.length === 13);

			ret.push(
				new BookModel({
					title: result.title,
					englishTitle: result.title,
					year: result.first_publish_year?.toString() ?? 'unknown',
					dataSource: this.apiName,
					id: result.key ?? title,
					url: result.key ? `https://openlibrary.org${result.key}` : undefined,
					author: result.author_name?.join(', '),
					plot: this.pickDescription(result.description),
					genres: result.subject,
					pages: result.number_of_pages_median ?? result.number_of_pages,
					onlineRating: result.ratings_average,
					isbn: isbn10 ? Number(isbn10) : undefined,
					isbn13: isbn13 ? Number(isbn13) : undefined,
					image: result.cover_i ? `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg` : undefined,
					released: true,
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

		const normalizedId = this.normalizeId(id);
		const kind = this.detectIdKind(normalizedId);

		if (kind === 'book') {
			return this.getByBookId(normalizedId);
		}

		return this.getBySearchQuery(normalizedId);
	}

	private async getByBookId(bookKey: string): Promise<Result<MediaTypeModel, MDBError>> {
		const bookResult = await this.fetchOpenLibraryJson<BookResponse>(`${bookKey}.json`, {
			apiName: this.apiName,
			bookKey,
		});
		if (!bookResult.ok) return err(bookResult.error);

		const book = bookResult.value;
		const olid = bookKey.replace(/^\/books\//i, '').replace(/^\/isbn\//i, '');
		const searchResult = await this.searchByOlid(olid);
		const search = searchResult.ok ? searchResult.value : undefined;

		const title = book.title ?? search?.title ?? 'unknown';
		const coverId = book.covers?.[0] ?? search?.cover_i;

		const yearFromBook = book.publish_date;
		const yearFromSearch = search?.first_publish_year?.toString();
		const year = yearFromBook ?? yearFromSearch ?? 'unknown';

		const bookPagesRaw = book.number_of_pages ?? (book.pagination ? Number(book.pagination) : undefined);
		const searchPagesRaw = search?.number_of_pages ?? search?.number_of_pages_median;

		const pages =
			Number.isFinite(bookPagesRaw!) && Number(bookPagesRaw) > 0
				? Number(bookPagesRaw)
				: Number.isFinite(searchPagesRaw!) && Number(searchPagesRaw) > 0
					? Number(searchPagesRaw)
					: undefined;

		const bookIsbn10 = book.isbn_10?.find(el => el.length <= 10);
		const bookIsbn13 = book.isbn_13?.find(el => el.length === 13);
		const searchIsbn10 = search?.isbn?.find(el => el.length <= 10);
		const searchIsbn13 = search?.isbn?.find(el => el.length === 13);

		return ok(
			new BookModel({
				title,
				englishTitle: title,
				year,
				dataSource: this.apiName,
				url: `https://openlibrary.org${bookKey}`,
				id: bookKey,
				isbn: bookIsbn10 ? Number(bookIsbn10) : searchIsbn10 ? Number(searchIsbn10) : undefined,
				isbn13: bookIsbn13 ? Number(bookIsbn13) : searchIsbn13 ? Number(searchIsbn13) : undefined,
				author: search?.author_name?.join(', '),
				plot: this.pickDescription(search?.description),
				genres: search?.subject,
				pages,
				image: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined,
				released: true,
				userData: {
					read: false,
					lastRead: '',
					personalRating: 0,
				},
			}),
		);
	}

	private async getBySearchQuery(query: string): Promise<Result<MediaTypeModel, MDBError>> {
		const responseResult = await fromPromise(
			this.client.GET('/search.json', {
				params: {
					query: {
						q: query,
						fields: 'key,title,author_name,first_publish_year,cover_i,subject,number_of_pages,number_of_pages_median,description,ratings_average,isbn',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, query },
				}),
		);

		if (!responseResult.ok) return err(responseResult.error);

		const response = responseResult.value;
		if (response.error !== undefined) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, query },
			});
		}

		const data = response.data as { docs: SearchResponse[] };
		const result = data.docs?.[0];

		if (!result) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data found for query ${query} in ${this.apiName}.`,
				userMessage: `No data found for query ${query}.`,
				context: { apiName: this.apiName, query },
			});
		}

		const isbn10 = result.isbn?.find(el => el.length <= 10);
		const isbn13 = result.isbn?.find(el => el.length === 13);

		return ok(
			new BookModel({
				title: result.title,
				englishTitle: result.title,
				year: result.first_publish_year?.toString() ?? 'unknown',
				dataSource: this.apiName,
				id: result.key ?? query,
				url: result.key ? `https://openlibrary.org${result.key}` : undefined,
				isbn: isbn10 ? Number(isbn10) : undefined,
				isbn13: isbn13 ? Number(isbn13) : undefined,
				author: result.author_name?.join(', '),
				plot: this.pickDescription(result.description),
				genres: result.subject,
				pages: result.number_of_pages_median ?? result.number_of_pages,
				onlineRating: result.ratings_average,
				image: result.cover_i ? `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg` : undefined,
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
