import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { WikiModel } from 'packages/obsidian/src/models/WikiModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';

interface SearchResponse {
	query: {
		search: {
			title: string;
			pageid: number;
		}[];
	};
}

interface IdResponse {
	query: {
		pages: Record<string, WikipediaPage>;
	};
}

interface WikipediaPage {
	pageid: number;
	title: string;
	contentmodel: string;
	pagelanguage: string;
	pagelanguagehtmlcode: string;
	pagelanguagedir: string;
	touched: string; // ISO date string
	lastrevid: number;
	length: number;
	fullurl: string;
	editurl: string;
	canonicalurl: string;
}
export class WikipediaAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'Wikipedia API';
		this.apiDescription = 'The API behind Wikipedia';
		this.apiUrl = 'https://www.wikipedia.com';
		this.types = [MediaType.Wiki];
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=20&utf8=&format=json&origin=*`;
		const fetchData = await requestUrl({
			url: searchUrl,
			method: 'GET',
			throw: false,
		});
		// console.debug(fetchData);

		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status },
			});
		}

		const response = fetchData as { status: number; json(): Promise<unknown> };
		const dataResult = await fromPromise(response.json(), cause =>
			toMdbError(cause, {
				kind: MDBErrorKind.Network,
				message: `MDB | Failed to parse response from ${this.apiName}`,
				userMessage: `Failed to parse response from ${this.apiName}`,
				context: { apiName: this.apiName },
			}),
		);
		if (!dataResult.ok) {
			return err(dataResult.error);
		}
		const data = dataResult.value as SearchResponse;
		Logger.debug(data);
		const ret: MediaTypeModel[] = [];

		for (const result of data.query.search) {
			ret.push(
				new WikiModel({
					type: 'wiki',
					title: result.title,
					englishTitle: result.title,
					year: '',
					dataSource: this.apiName,
					id: result.pageid.toString(),
				}),
			);
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=info&pageids=${encodeURIComponent(id)}&inprop=url&format=json&origin=*`;
		const fetchData = await requestUrl({
			url: searchUrl,
			method: 'GET',
			throw: false,
		});

		if (fetchData.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${fetchData.status} from ${this.apiName}.`,
				userMessage: `Received status code ${fetchData.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: fetchData.status, id },
			});
		}

		const response = fetchData as { status: number; json(): Promise<unknown> };
		const dataResult = await fromPromise(response.json(), cause =>
			toMdbError(cause, {
				kind: MDBErrorKind.Network,
				message: `MDB | Failed to parse response from ${this.apiName}`,
				userMessage: `Failed to parse response from ${this.apiName}`,
				context: { apiName: this.apiName, id },
			}),
		);
		if (!dataResult.ok) {
			return err(dataResult.error);
		}
		const data = dataResult.value as IdResponse;
		// console.debug(data);
		const result = Object.values(data?.query?.pages)[0];
		if (!result) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}

		return ok(
			new WikiModel({
				title: result.title,
				englishTitle: result.title,
				dataSource: this.apiName,
				url: result.fullurl,
				id: result.pageid.toString(),

				wikiUrl: result.fullurl,
				lastUpdated: this.plugin.dateFormatter.format(result.touched, this.apiDateFormat),
				length: result.length,

				userData: {},
			}),
		);
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.WikipediaAPI_disabledMediaTypes;
	}
}
