import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import { requestUrl } from 'obsidian';
import { MediaType } from '../../utils/MediaType';

/**
 * A partial `POST /vn` response payload; desired fields should be listed in the request body.
 */
interface VNJSONResponse {
	more: boolean;
	results: [
		{
			id: string;
			title: string;
			titles: [
				{
					title: string;
					lang: string;
				},
			];
			devstatus: 0 | 1 | 2; // Released | In-development | Cancelled
			released: string | 'TBA' | null;
			image: {
				url: string;
			} | null;
			rating: number | null;
			tags: [
				{
					id: string;
					name: string;
					category: 'cont' | 'ero' | 'tech';
					rating: number;
					spoiler: 0 | 1 | 2; // None | Minor | Major
				},
			];
			developers: [
				{
					id: string;
					name: string;
				},
			];
		},
	];
}

/**
 * A partial `POST /release` response payload; desired fields should be listed in the request body.
 */
interface ReleaseJSONResponse {
	more: boolean;
	results: [
		{
			id: string;
			producers: [
				{
					id: string;
					name: string;
					developer: boolean;
					publisher: boolean;
				},
			];
		},
	];
}

export class VNDBAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD'; // Can also return YYYY-MM or YYYY

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'VNDB API';
		this.apiDescription = 'A free API for visual novels.';
		this.apiUrl = 'https://api.vndb.org/kana';
		this.types = [MediaType.Game];
	}

	postVNQuery = (body: string): Promise<VNJSONResponse> => this.postQuery('/vn', body);
	postReleaseQuery = (body: string): Promise<ReleaseJSONResponse> => this.postQuery('/release', body);
	async postQuery(endpoint: string, body: string): Promise<any> {
		const fetchData = await requestUrl({
			url: `${this.apiUrl}${endpoint}`,
			method: 'POST',
			contentType: 'application/json',
			body: body,
			throw: false,
		});

		if (fetchData.status !== 200) {
			switch (fetchData.status) {
				case 400:
					throw Error(`MDB | Invalid request body or query [${fetchData.text}].`);
				case 404:
					throw Error(`MDB | Invalid API path or HTTP method.`);
				case 429:
					throw Error(`MDB | Throttled.`);
				case 500:
					throw Error(`MDB | VNDB server error.`);
				case 502:
					throw Error(`MDB | VNDB server is down.`);
				default:
					throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
			}
		}

		return fetchData.json;
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const vnData = await this.postVNQuery(`{
			"filters": ["search", "=", "${title}"],
			"fields": "title, titles{title, lang}, released",
			"sort": "searchrank",
			"results": 20
		}`);

		const ret: MediaTypeModel[] = [];
		for (const vn of vnData.results) {
			ret.push(
				new GameModel({
					type: MediaType.Game,
					title: vn.title,
					englishTitle: vn.titles.find(t => t.lang === 'en')?.title ?? vn.title,
					year: vn.released && vn.released !== 'TBA' ? new Date(vn.released).getFullYear().toString() : 'TBA',
					dataSource: this.apiName,
					id: vn.id,
				} as GameModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const vnData = await this.postVNQuery(`{
			"filters": ["id", "=", "${id}"],
			"fields": "title, titles{title, lang}, devstatus, released, image{url}, rating, tags{name, category, rating, spoiler}, developers{name}"
		}`);

		if (vnData.results.length !== 1) throw Error(`MDB | Expected 1 result from query, got ${vnData.results.length}.`);
		const vn = vnData.results[0];

		const releaseData = await this.postReleaseQuery(`{
			"filters": ["and",
				["vn", "=",
					["id", "=", "${id}"]
				],
				["official", "=", 1],
				["patch", "!=", 1]
			],
			"fields": "producers.name, producers.publisher, producers.developer",
			"results": 100
		}`);

		return new GameModel({
			type: MediaType.Game,
			title: vn.title,
			englishTitle: vn.titles.find(t => t.lang === 'en')?.title ?? vn.title,
			year: vn.released && vn.released !== 'TBA' ? new Date(vn.released).getFullYear().toString() : 'TBA',
			dataSource: this.apiName,
			url: `https://vndb.org/${vn.id}`,
			id: vn.id,

			developers: vn.developers.map(d => d.name),
			publishers: releaseData.results
				.flatMap(r => r.producers)
				.filter(p => p.publisher)
				.sort((p1, p2) => Number(p2.developer) - Number(p1.developer)) // Place developer-publishers first in publisher list
				.map(p => p.name)
				.unique(),
			genres: vn.tags
				.filter(t => t.category === 'cont' && t.spoiler === 0 && t.rating >= 2)
				.sort((t1, t2) => t2.rating - t1.rating)
				.map(t => t.name),
			onlineRating: vn.rating ?? NaN,
			image: vn.image?.url,

			released: vn.devstatus === 0,
			releaseDate: this.plugin.dateFormatter.format(vn.released, this.apiDateFormat),

			userData: {
				played: false,
				personalRating: 0,
			},
		} as GameModel);
	}
}
