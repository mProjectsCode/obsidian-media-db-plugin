import { requestUrl } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

enum VNDevStatus {
	Finished,
	InDevelopment,
	Cancelled,
}

enum TagSpoiler {
	None,
	Minor,
	Major,
}

enum TagCategory {
	Content = 'cont',
	Sexual = 'ero',
	Technical = 'tech',
}

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
			devstatus: VNDevStatus;
			released: string | 'TBA' | null; // eslint-disable-line @typescript-eslint/no-redundant-type-constituents
			image: {
				url: string;
				sexual: number;
			} | null;
			rating: number | null;
			tags: [
				{
					id: string;
					name: string;
					category: TagCategory;
					rating: number;
					spoiler: TagSpoiler;
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

	/**
	 * Make a `POST` request to the VNDB API.
	 * @param endpoint The API endpoint to query. E.g. "/vn".
	 * @param body A JSON object defining the query, following the VNDB API structure.
	 * @returns A JSON object representing the query response.
	 * @throws Error The request returned an unsuccessful or unexpected HTTP status code.
	 * @see {@link https://api.vndb.org/kana#api-structure}
	 */
	private async postQuery(endpoint: string, body: string): Promise<unknown> {
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

	/**
	 * Make a `POST` request to the `/vn` endpoint.
	 * Queries visual novel entries.
	 * @see {@link https://api.vndb.org/kana#post-vn}
	 */
	private postVNQuery(body: string): Promise<VNJSONResponse> {
		return this.postQuery('/vn', body) as Promise<VNJSONResponse>;
	}

	/**
	 * Make a `POST` request to the `/release` endpoint.
	 * Queries release entries.
	 * @see {@link https://api.vndb.org/kana#post-release}
	 */
	private postReleaseQuery(body: string): Promise<ReleaseJSONResponse> {
		return this.postQuery('/release', body) as Promise<ReleaseJSONResponse>;
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		/* SFW Filter: has ANY official&&complete&&standalone&&SFW release
		            OR has NO  official&&standalone&&NSFW release
		            OR has the `In-game Sexual Content Toggle` (g2708) tag */
		// prettier-ignore
		const vnData = await this.postVNQuery(`{
			"filters": ["and" ${!this.plugin.settings.sfwFilter ? `` :
				`, ["or"
					, ["release", "=", ["and"
						, ["official", "=", "1"]
						, ["rtype", "=", "complete"]
						, ["patch", "!=", "1"]
						, ["has_ero", "!=", "1"]
					  ]]
					, ["release", "!=", ["and"
						, ["official", "=", "1"]
						, ["patch", "!=", "1"]
						, ["has_ero", "=", "1"]
					  ]]
					, ["tag", "=", "g2708"]
				  ]`}
				, ["search", "=", "${title}"]
			],
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
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const vnData = await this.postVNQuery(`{
			"filters": ["id", "=", "${id}"],
			"fields": "title, titles{title, lang}, devstatus, released, image{url, sexual}, rating, tags{name, category, rating, spoiler}, developers{name}"
		}`);

		if (vnData.results.length !== 1) throw Error(`MDB | Expected 1 result from query, got ${vnData.results.length}.`);
		const vn = vnData.results[0];
		const releasedIsDate = vn.released !== null && vn.released !== 'TBA';
		vn.released ??= 'Unknown';

		const releaseData = await this.postReleaseQuery(`{
			"filters": ["and"
				, ["vn", "="
					, ["id", "=", "${id}"]
				  ]
				, ["official", "=", 1]
			],
			"fields": "producers.name, producers.publisher, producers.developer",
			"results": 100
		}`);

		return new GameModel({
			type: MediaType.Game,
			title: vn.title,
			englishTitle: vn.titles.find(t => t.lang === 'en')?.title ?? vn.title,
			year: releasedIsDate ? new Date(vn.released).getFullYear().toString() : vn.released,
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
				.filter(t => t.category === TagCategory.Content && t.spoiler === TagSpoiler.None && t.rating >= 2)
				.sort((t1, t2) => t2.rating - t1.rating)
				.map(t => t.name),
			onlineRating: vn.rating ?? NaN,
			// TODO: Ideally we should simply flag a sensitive image, then let the user handle it non-destructively
			image: this.plugin.settings.sfwFilter && (vn.image?.sexual ?? 0) > 0.5 ? 'NSFW' : vn.image?.url,

			released: vn.devstatus === VNDevStatus.Finished,
			releaseDate: releasedIsDate ? (this.plugin.dateFormatter.format(vn.released, this.apiDateFormat) ?? vn.released) : vn.released,

			userData: {
				played: false,
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.VNDBAPI_disabledMediaTypes;
	}
}
