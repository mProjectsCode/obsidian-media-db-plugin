import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MovieModel } from 'packages/obsidian/src/models/MovieModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/TMDB';

interface TMDBCreditMember {
	name?: string | null;
	job?: string | null;
}

interface TMDBCreditsResponse {
	credits?: {
		cast?: TMDBCreditMember[];
		crew?: TMDBCreditMember[];
	};
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function getTopCastNames(credits: TMDBCreditsResponse['credits'], size: number): string[] {
	return (credits?.cast ?? [])
		.map(c => c.name)
		.filter(isNonEmptyString)
		.slice(0, size);
}

function getCrewNamesByJob(credits: TMDBCreditsResponse['credits'], job: string): string[] {
	return (credits?.crew ?? [])
		.filter(c => c.job === job)
		.map(c => c.name)
		.filter(isNonEmptyString);
}

export class TMDBMovieAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'TMDBMovieAPI';
		this.apiDescription = 'A community built Movie DB.';
		this.apiUrl = 'https://www.themoviedb.org/';
		this.types = [MediaType.Movie];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('movie', 'movie');
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const responseResult = await fromPromise(
			client.GET('/3/search/movie', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					query: {
						query: encodeURIComponent(title),
						include_adult: this.plugin.settings.sfwFilter ? false : true,
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

		if (!responseResult.ok) {
			return err(responseResult.error);
		}

		const response = responseResult.value;

		if (response.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}
		if (response.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status },
			});
		}

		const data = response.data;

		if (!data) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName },
			});
		}

		if (data.total_results === 0 || !data.results) {
			return ok([]);
		}

		// console.debug(data.results);

		const ret: MediaTypeModel[] = [];

		for (const result of data.results) {
			ret.push(
				new MovieModel({
					type: 'movie',
					title: result.original_title,
					englishTitle: result.title,
					year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id.toString(),
				}),
			);
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const responseResult = await fromPromise(
			client.GET('/3/movie/{movie_id}', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					path: { movie_id: parseInt(id) },
					query: {
						append_to_response: 'credits',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}

		const response = responseResult.value;

		if (response.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}
		if (response.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${response.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.response.status, id },
			});
		}

		const result = response.data;

		if (!result) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}
		// console.debug(result);
		const credits = (result as TMDBCreditsResponse).credits;

		return ok(
			new MovieModel({
				type: 'movie',
				title: result.title,
				englishTitle: result.title,
				year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
				premiere: this.plugin.dateFormatter.format(result.release_date, this.apiDateFormat) ?? 'unknown',
				dataSource: this.apiName,
				url: `https://www.themoviedb.org/movie/${result.id}`,
				id: result.id.toString(),

				plot: result.overview ?? '',
				genres: result.genres?.map(g => g.name).filter(isNonEmptyString) ?? [],
				writer: getCrewNamesByJob(credits, 'Screenplay'),
				director: getCrewNamesByJob(credits, 'Director'),
				studio: result.production_companies?.map(s => s.name).filter(isNonEmptyString) ?? [],

				duration: result.runtime?.toString() ?? 'unknown',
				onlineRating: result.vote_average,
				actors: getTopCastNames(credits, 5),
				image: `https://image.tmdb.org/t/p/w780${result.poster_path}`,

				released: ['Released'].includes(result.status!),
				streamingServices: [],

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			}),
		);
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.TMDBMovieAPI_disabledMediaTypes;
	}
}
