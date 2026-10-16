import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { BookModel } from 'packages/obsidian/src/models/BookModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';
import { contactEmail, mediaDbVersion, pluginName } from 'packages/obsidian/src/utils/Utils';

interface HardcoverEdition {
	isbn_10?: string | null;
	isbn_13?: string | null;
	pages?: number | null;
}

interface HardcoverBook {
	id: number;
	title: string;
	slug?: string | null;
	release_year?: number | null;
	release_date?: string | null;
	description?: string | null;
	pages?: number | null;
	rating?: number | null;
	image?: { url?: string | null } | null;
	contributions?: { contribution?: string | null; author?: { name: string } | null }[];
	cached_tags?: { Genre?: { tag: string }[] } | null;
	default_physical_edition?: HardcoverEdition | null;
	default_ebook_edition?: HardcoverEdition | null;
}

const BOOK_FIELDS = `
	id title slug release_year release_date description pages rating
	image { url }
	contributions { contribution author { name } }
	cached_tags
	default_physical_edition { isbn_10 isbn_13 pages }
	default_ebook_edition { isbn_10 isbn_13 pages }
`;

export class HardcoverAPI extends APIModel {
	private nextRequestAt = 0;

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'HardcoverAPI';
		this.apiDescription = 'Book metadata from Hardcover (connect your free account using OAuth).';
		this.apiUrl = 'https://api.hardcover.app/v1/graphql';
		this.types = [MediaType.Book];
	}

	private failure(message: string, kind = MDBErrorKind.Api): Result<never, MDBError> {
		return err({ kind, message: `MDB | ${message}`, userMessage: message, context: { apiName: this.apiName } });
	}

	private async query<T>(query: string, variables: Record<string, unknown>): Promise<Result<T, MDBError>> {
		const authorization = await this.plugin.hardcoverOAuth.getAccessToken();
		if (!authorization.ok) return authorization;
		const token = authorization.value;

		// Reserve a slot before waiting so concurrent imports also respect the per-minute limit.
		const now = Date.now();
		const requestAt = Math.max(now, this.nextRequestAt);
		this.nextRequestAt = requestAt + 1100;
		if (requestAt > now) await new Promise(resolve => window.setTimeout(resolve, requestAt - now));

		try {
			const response = await requestUrl({
				url: this.apiUrl,
				method: 'POST',
				contentType: 'application/json',
				headers: {
					Authorization: `Bearer ${token}`,
					'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
				},
				body: JSON.stringify({ query, variables }),
				throw: false,
			});
			if (response.status === 401) return this.failure('Hardcover authorization is invalid or expired. Connect again in Media DB settings.');
			if (response.status === 403) return this.failure('Hardcover authorization does not have permission for this query.');
			if (response.status === 429) return this.failure('Hardcover rate limit reached. Please try again later.');
			if (response.status !== 200) return this.failure(`Received status code ${response.status} from Hardcover.`);

			const payload = response.json as { data?: T | null; errors?: unknown[] } | null;
			if (!payload || payload.errors?.length || !payload.data) {
				return this.failure('Hardcover could not complete the query. Check your connection permissions and try again.');
			}
			return ok(payload.data);
		} catch {
			// Do not retain transport errors: they may contain the Authorization header.
			return this.failure('Network error querying Hardcover.', MDBErrorKind.Network);
		}
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		const search = await this.query<{ search?: { ids?: unknown } | null }>(
			`query SearchBooks($query: String!) {
				search(query: $query, query_type: "Book", per_page: 20, page: 1) { ids }
			}`,
			{ query: title },
		);
		if (!search.ok) return search;
		const rawIds = search.value.search?.ids;
		if (!Array.isArray(rawIds)) return this.failure('Invalid search response from Hardcover.');
		const ids = [...new Set(rawIds.map(Number).filter(id => Number.isInteger(id) && id > 0 && id <= 2147483647))].slice(0, 20);
		if (ids.length === 0) return ok([]);

		const books = await this.query<{ books?: HardcoverBook[] }>(`query SearchBookDetails($ids: [Int!]!) { books(where: {id: {_in: $ids}}) { ${BOOK_FIELDS} } }`, { ids });
		if (!books.ok) return books;
		if (!Array.isArray(books.value.books)) return this.failure('Invalid book response from Hardcover.');
		// The books query has no search ranking; restore the search endpoint's order.
		const byId = new Map(books.value.books.map(book => [book.id, book]));
		return ok(ids.flatMap(id => (byId.has(id) ? [this.toBook(byId.get(id)!)] : [])));
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		if (!/^\d+$/.test(id) || !Number.isInteger(Number(id)) || Number(id) <= 0 || Number(id) > 2147483647) {
			return this.failure('Enter a numeric Hardcover book ID.', MDBErrorKind.Validation);
		}
		const response = await this.query<{ books_by_pk?: HardcoverBook | null }>(`query BookDetails($id: Int!) { books_by_pk(id: $id) { ${BOOK_FIELDS} } }`, { id: Number(id) });
		if (!response.ok) return response;
		if (!response.value.books_by_pk) return this.failure(`No book found for Hardcover ID ${id}.`);
		return ok(this.toBook(response.value.books_by_pk));
	}

	private toBook(book: HardcoverBook): BookModel {
		const edition = book.default_physical_edition ?? book.default_ebook_edition;
		const today = new Date().toISOString().slice(0, 10);
		const authors = book.contributions
			?.filter(contributor => !contributor.contribution || contributor.contribution.toLowerCase() === 'author')
			.map(contributor => contributor.author?.name)
			.filter((name): name is string => !!name);
		return new BookModel({
			title: book.title,
			englishTitle: book.title,
			year: book.release_year?.toString() ?? book.release_date?.slice(0, 4) ?? 'unknown',
			dataSource: this.apiName,
			id: book.id.toString(),
			url: book.slug ? `https://hardcover.app/books/${book.slug}` : undefined,
			author: [...new Set(authors)].join(', '),
			plot: book.description ?? undefined,
			genres: book.cached_tags?.Genre?.map(genre => genre.tag),
			pages: edition?.pages ?? book.pages ?? undefined,
			onlineRating: book.rating ?? undefined,
			isbn: edition?.isbn_10 ?? undefined,
			isbn13: edition?.isbn_13 ?? undefined,
			image: book.image?.url ?? undefined,
			released: book.release_date ? book.release_date <= today : book.release_year != null && book.release_year <= Number(today.slice(0, 4)),
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.HardcoverAPI_disabledMediaTypes;
	}
}
