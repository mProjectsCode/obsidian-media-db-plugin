/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import createClient from 'openapi-fetch';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/TMDB';

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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		if (!this.plugin.settings.TMDBKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const response = await client.GET('/3/search/movie', {
			headers: {
				Authorization: `Bearer ${this.plugin.settings.TMDBKey}`,
			},
			params: {
				query: {
					query: encodeURIComponent(title),
					include_adult: this.plugin.settings.sfwFilter ? false : true,
				},
			},
			fetch: fetch,
		});

		if (response.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status !== 200) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const data = response.data;

		if (!data) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}

		if (data.total_results === 0 || !data.results) {
			return [];
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

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.TMDBKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const response = await client.GET('/3/movie/{movie_id}', {
			headers: {
				Authorization: `Bearer ${this.plugin.settings.TMDBKey}`,
			},
			params: {
				path: { movie_id: parseInt(id) },
				query: {
					append_to_response: 'credits',
				},
			},
			fetch: fetch,
		});

		if (response.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status !== 200) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const result = response.data;

		if (!result) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}
		// console.debug(result);

		return new MovieModel({
			type: 'movie',
			title: result.title,
			englishTitle: result.title,
			year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
			premiere: this.plugin.dateFormatter.format(result.release_date, this.apiDateFormat) ?? 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/movie/${result.id}`,
			id: result.id.toString(),

			plot: result.overview ?? '',
			genres: result.genres?.map((g: any) => g.name) ?? [],
			// TMDB's spec allows for 'append_to_response' but doesn't seem to account for it in the type
			// @ts-ignore
			writer: result.credits.crew?.filter((c: any) => c.job === 'Screenplay').map((c: any) => c.name) ?? [],
			// @ts-ignore
			director: result.credits.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name) ?? [],
			studio: result.production_companies?.map((s: any) => s.name) ?? [],

			duration: result.runtime?.toString() ?? 'unknown',
			onlineRating: result.vote_average,
			// @ts-ignore
			actors: result.credits.cast.map((c: any) => c.name).slice(0, 5) ?? [],
			image: `https://image.tmdb.org/t/p/w780${result.poster_path}`,

			released: ['Released'].includes(result.status!),
			streamingServices: [],

			userData: {
				watched: false,
				lastWatched: '',
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.TMDBMovieAPI_disabledMediaTypes;
	}
}
