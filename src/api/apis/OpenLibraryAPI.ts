import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { BookModel } from 'src/models/BookModel';
import { requestUrl } from 'obsidian';
import { contactEmail, mediaDbVersion, pluginName } from '../../utils/Utils';
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
					id: result.cover_edition_key,
				} as BookModel)
			);
	}

	return ret;
}

async getById(id: string): Promise<MediaTypeModel> {
	console.log(`MDB | api "${this.apiName}" queried by ID`);

	const searchUrl = `https://openlibrary.org/books/${encodeURIComponent(id)}.json`;
	const fetchData = await requestUrl({
		url: searchUrl,
		headers: {
			'User-Agent': `${pluginName}/${mediaDbVersion} (${contactEmail})`,
		},
	});

	console.debug(fetchData);

	if (fetchData.status !== 200) {
		throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
	}

	const result = await fetchData.json;

	const model = new BookModel({
		title: result.title,
		year: new Date(result.publish_date).getFullYear().toString(),
		dataSource: this.apiName,
		url: `https://openlibrary.org` + result.key,
		id: result.key.slice(7),
		isbn10: result.isbn_10,
		englishTitle: result.title_english ?? result.title,

		author: result.authors.key ?? 'unknown',
		pages: result.number_of_pages ?? 'unknown',
		image: `https://covers.openlibrary.org/b/OLID/` + result.key.slice(7) + `-L.jpg` ?? '',

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
