import { afterEach, expect, spyOn, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as obsidian from 'obsidian';
import { HardcoverAPI } from 'packages/obsidian/src/api/apis/HardcoverAPI';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { BookModel } from 'packages/obsidian/src/models/BookModel';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';

if (typeof window === 'undefined') GlobalRegistrator.register();
const request = spyOn(obsidian, 'requestUrl');
afterEach(() => request.mockReset());

function provider(token: string | null = 'test-token'): HardcoverAPI {
	return new HardcoverAPI({
		hardcoverOAuth: { getAccessToken: async () => (token ? { ok: true, value: token } : { ok: false, error: { kind: MDBErrorKind.Validation, message: 'Connect first' } }) },
		settings: { HardcoverAPI_disabledMediaTypes: [MediaType.Book] },
	} as unknown as MediaDbPlugin);
}

function respond(json: unknown, status = 200): void {
	request.mockResolvedValueOnce({ status, json } as obsidian.RequestUrlResponse);
}

const book = {
	id: 123,
	title: 'The Left Hand of Darkness',
	slug: 'the-left-hand-of-darkness',
	release_year: 1969,
	release_date: '1969-03-01',
	description: 'A novel.',
	pages: 300,
	rating: 4.2,
	image: { url: 'https://images.hardcover.app/cover.jpg' },
	contributions: [
		{ contribution: null, author: { name: 'Ursula K. Le Guin' } },
		{ contribution: 'Author', author: { name: 'Ursula K. Le Guin' } },
		{ contribution: 'Translator', author: { name: 'A Translator' } },
	],
	cached_tags: { Genre: [{ tag: 'Science fiction' }] },
	default_physical_edition: { isbn_10: '0441478123', isbn_13: '9780441478125', pages: 304 },
	default_ebook_edition: { isbn_10: '0000000000', isbn_13: '0000000000000', pages: 320 },
};

test('Hardcover requires a secret and does not send requests without it', async () => {
	const api = provider(null);
	const result = await api.searchByTitle('Dune');
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.error.kind).toBe(MDBErrorKind.Validation);
	expect(request).not.toHaveBeenCalled();
	expect(api.hasType(MediaType.Book)).toBe(false);
});

test('search uses variables, caps results and restores relevance order', async () => {
	const api = provider();
	respond({ data: { search: { ids: ['456', '123', '456'] } } });
	respond({ data: { books: [book, { ...book, id: 456, title: 'First result' }] } });
	const result = await api.searchByTitle('title " with quotes');
	expect(result.ok).toBe(true);
	if (result.ok) expect(result.value.map(item => item.id)).toEqual(['456', '123']);
	const options = request.mock.calls[0][0] as obsidian.RequestUrlParam;
	expect(options.url).toBe('https://api.hardcover.app/v1/graphql');
	expect(options.headers?.Authorization).toBe('Bearer test-token');
	expect(options.throw).toBe(false);
	const body = JSON.parse(options.body as string);
	expect(body.variables).toEqual({ query: 'title " with quotes' });
	expect(body.query).toContain('per_page: 20');
	expect(body.query).not.toContain('title " with quotes');
});

test('empty search does not fetch details', async () => {
	respond({ data: { search: { ids: [] } } });
	const result = await provider().searchByTitle('unknown');
	expect(result).toEqual({ ok: true, value: [] });
	expect(request).toHaveBeenCalledTimes(1);
});

test('book lookup maps metadata and keeps both ISBNs from one default edition', async () => {
	respond({ data: { books_by_pk: book } });
	const result = await provider().getById('123');
	expect(result.ok).toBe(true);
	if (!result.ok) return;
	expect(result.value).toBeInstanceOf(BookModel);
	expect(result.value).toMatchObject({
		id: '123',
		dataSource: 'HardcoverAPI',
		year: '1969',
		author: 'Ursula K. Le Guin',
		plot: 'A novel.',
		genres: ['Science fiction'],
		pages: 304,
		onlineRating: 4.2,
		isbn: '0441478123',
		isbn13: '9780441478125',
		released: true,
		url: 'https://hardcover.app/books/the-left-hand-of-darkness',
		userData: { read: false, lastRead: '', personalRating: 0 },
	});
});

test('ebook edition is used only when there is no default physical edition', async () => {
	respond({ data: { books_by_pk: { ...book, default_physical_edition: null } } });
	const result = await provider().getById('123');
	if (!result.ok) throw new Error('lookup failed');
	expect(result.value).toMatchObject({ isbn: '0000000000', isbn13: '0000000000000', pages: 320 });
});

test('sparse metadata retains model defaults and future books are unreleased', async () => {
	respond({ data: { books_by_pk: { id: 1, title: 'Future', release_date: '2999-01-01' } } });
	const result = await provider().getById('1');
	if (!result.ok) throw new Error('lookup failed');
	expect(result.value).toMatchObject({ year: '2999', author: '', genres: [], pages: 0, isbn: '', released: false });
});

test('invalid book IDs are rejected before making a request', async () => {
	for (const id of ['abc', '0', '-1', '1.5', '2147483648', '123) { me { id } }']) {
		expect((await provider().getById(id)).ok).toBe(false);
	}
	expect(request).not.toHaveBeenCalled();
});

test('year-only publication metadata marks an older book as released', async () => {
	respond({ data: { books_by_pk: { id: 1, title: 'Old book', release_year: 1969 } } });
	const result = await provider().getById('1');
	if (!result.ok) throw new Error('lookup failed');
	expect(result.value).toMatchObject({ year: '1969', released: true });
});

test('oversized search responses are capped at 20 even if the server ignores the limit', async () => {
	const ids = Array.from({ length: 25 }, (_, i) => i + 1);
	respond({ data: { search: { ids } } });
	respond({ data: { books: ids.map(id => ({ id, title: `Book ${id}` })) } });
	const result = await provider().searchByTitle('Book');
	if (!result.ok) throw new Error('search failed');
	expect(result.value).toHaveLength(20);
	const options = request.mock.calls[1][0] as obsidian.RequestUrlParam;
	expect(JSON.parse(options.body as string).variables.ids).toHaveLength(20);
});

test('concurrent lookups are spaced to respect the provider rate limit', async () => {
	const api = provider();
	const times: number[] = [];
	request.mockImplementation(() => {
		times.push(Date.now());
		return Promise.resolve({ status: 200, json: { data: { books_by_pk: book } } }) as obsidian.RequestUrlResponsePromise;
	});
	const results = await Promise.all([api.getById('123'), api.getById('123')]);
	expect(results.every(result => result.ok)).toBe(true);
	expect(times[1] - times[0]).toBeGreaterThanOrEqual(1050);
});

test('a missing book is reported as an error', async () => {
	respond({ data: { books_by_pk: null } });
	const result = await provider().getById('123');
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.error.userMessage).toContain('No book found');
});

test('HTTP auth, permission and rate errors provide actionable messages', async () => {
	for (const [status, message] of [
		[401, 'invalid or expired'],
		[403, 'permission'],
		[429, 'rate limit'],
		[500, '500'],
	] as const) {
		respond({}, status);
		const result = await provider().getById('123');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.userMessage).toContain(message);
	}
});

test('GraphQL partial errors and malformed responses are not imported', async () => {
	for (const json of [null, {}, { errors: [{ message: 'failure' }], data: { books_by_pk: book } }, { data: { search: {} } }]) {
		respond(json);
		expect((await provider().searchByTitle('Dune')).ok).toBe(false);
	}
});

test('network failures do not retain transport errors containing tokens', async () => {
	request.mockRejectedValueOnce(new Error('Authorization: Bearer test-token'));
	const result = await provider().getById('123');
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.error.kind).toBe(MDBErrorKind.Network);
	expect(JSON.stringify(result)).not.toContain('test-token');
});
