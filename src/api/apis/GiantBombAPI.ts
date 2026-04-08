import createClient from 'openapi-fetch';
import { coerceYear, obsidianFetch } from 'src/utils/Utils';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { ApiSecretID, getApiSecretValue } from '../../settings/apiSecretsHelper';
import { MediaType } from '../../utils/MediaType';
import { verboseLog } from '../../utils/verboseLog';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/GiantBomb';

export class GiantBombAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'GiantBombAPI';
		this.apiDescription = 'A free API for games.';
		this.apiUrl = 'https://www.giantbomb.com/api';
		this.types = [MediaType.Game];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		verboseLog(`api "${this.apiName}" queried by Title`);

		const apiKey = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.giantBomb);
		if (!apiKey) {
			throw Error(`[Media DB] API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://www.giantbomb.com/api/' });
		const response = await client.GET('/games', {
			params: {
				query: {
					api_key: apiKey,
					filter: `name:${title}`,
					format: 'json',
					limit: 20,
				},
			},
			fetch: obsidianFetch,
		});

		if (response.response.status === 401) {
			throw Error(`[Media DB] Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status === 429) {
			throw Error(`[Media DB] Too many requests for ${this.apiName}, you've exceeded your API quota.`);
		}
		if (response.response.status !== 200) {
			throw Error(`[Media DB] Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const data = response.data?.results;

		const ret: MediaTypeModel[] = [];
		for (const result of data ?? []) {
			const year = result.original_release_date ? new Date(result.original_release_date).getFullYear() : undefined;

			ret.push(
				new GameModel({
					title: result.name,
					englishTitle: result.name,
					year: coerceYear(year),
					dataSource: this.apiName,
					id: result.guid?.toString(),
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		verboseLog(`api "${this.apiName}" queried by ID`);

		const apiKey = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.giantBomb);
		if (!apiKey) {
			throw Error(`[Media DB] API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://www.giantbomb.com/api/' });
		const response = await client.GET('/game/{guid}', {
			params: {
				path: {
					guid: id,
				},
				query: {
					api_key: apiKey,
					format: 'json',
				},
			},
			fetch: obsidianFetch,
		});

		if (response.response.status === 401) {
			throw Error(`[Media DB] Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status === 429) {
			throw Error(`[Media DB] Too many requests for ${this.apiName}, you've exceeded your API quota.`);
		}
		if (response.response.status !== 200) {
			throw Error(`[Media DB] Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const result = response.data?.results;

		if (!result) {
			throw Error(`[Media DB] No results found for ID ${id} in ${this.apiName}.`);
		}

		verboseLog(result);

		// sadly the only OpenAPI definition I could find doesn't have the right types
		const year = result.original_release_date ? new Date(result.original_release_date).getFullYear() : undefined;
		const developers = result.developers as
			| {
					name: string;
			  }[]
			| undefined;
		const publishers = result.publishers as
			| {
					name: string;
			  }[]
			| undefined;
		const genres = result.genres as
			| {
					name: string;
			  }[]
			| undefined;
		const image = result.image as
			| {
					small_url: string;
					medium_url: string;
					super_url: string;
			  }
			| undefined;

		return new GameModel({
			type: MediaType.Game,
			title: result.name,
			englishTitle: result.name,
			year: coerceYear(year),
			dataSource: this.apiName,
			url: result.site_detail_url,
			id: result.guid?.toString(),
			developers: developers?.map(x => x.name),
			publishers: publishers?.map(x => x.name),
			genres: genres?.map(x => x.name),
			onlineRating: 0,
			image: image?.super_url,

			released: true,
			releaseDate: result.original_release_date,

			userData: {
				played: false,

				personalRating: 0,
			},
		});
	}
	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.GiantBombAPI_disabledMediaTypes;
	}
}
