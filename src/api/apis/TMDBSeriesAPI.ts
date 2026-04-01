/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import createClient from 'openapi-fetch';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { ApiSecretID, getApiSecretValue } from '../../settings/apiSecretsHelper';
import { SeriesModel } from '../../models/SeriesModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/TMDB';

export class TMDBSeriesAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'TMDBSeriesAPI';
		this.apiDescription = 'A community built Series DB.';
		this.apiUrl = 'https://www.themoviedb.org/';
		this.types = [MediaType.Series];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('tv', 'series');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const bearer = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.tmdb);
		if (!bearer) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const response = await client.GET('/3/search/tv', {
			headers: {
				Authorization: `Bearer ${bearer}`,
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
				new SeriesModel({
					type: 'series',
					title: result.original_name,
					englishTitle: result.name,
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
					dataSource: this.apiName,
					id: result.id.toString(),
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const bearer = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.tmdb);
		if (!bearer) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const response = await client.GET('/3/tv/{series_id}', {
			headers: {
				Authorization: `Bearer ${bearer}`,
			},
			params: {
				path: { series_id: parseInt(id) },
				query: {
					append_to_response: 'credits,content_ratings,watch/providers',
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

		return new SeriesModel({
			type: 'series',
			title: result.original_name,
			englishTitle: result.name,
			year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/tv/${result.id}`,
			id: result.id.toString(),

			plot: result.overview ?? '',
			genres: result.genres?.map((g: any) => g.name) ?? [],
			writer: result.created_by?.map((c: any) => c.name) ?? [],
			studio: result.production_companies?.map((s: any) => s.name) ?? [],
			episodes: result.number_of_episodes,
			duration: result.episode_run_time?.[0]?.toString() ?? 'unknown',
			onlineRating: result.vote_average ? Math.round(result.vote_average * 10) / 10 : 0,
			// TMDB's spec allows for 'append_to_response' but doesn't seem to account for it in the type
			// @ts-ignore
			actors: result.credits?.cast.map((c: any) => c.name).slice(0, 5) ?? [],
			image: result.poster_path ? `https://image.tmdb.org/t/p/w780${result.poster_path}` : null,

			released: ['Returning Series', 'Cancelled', 'Canceled', 'Pilot', 'Ended'].includes(result.status!),
			country: result.production_countries?.map((c: any) => c.name) ?? [],
			language: result.spoken_languages?.map((l: any) => l.english_name) ?? [],
			network: result.networks?.map((n: any) => n.name) ?? [],
			// @ts-ignore
			ageRating: result.content_ratings?.results?.find((r: any) => r.iso_3166_1 === this.plugin.settings.tmdbRegion)?.rating ?? '',
			// @ts-ignore
			streamingServices: result['watch/providers']?.results?.[this.plugin.settings.tmdbRegion]?.flatrate?.map((p: any) => p.provider_name) ?? [],
			airing: ['Returning Series'].includes(result.status!),
			airedFrom: this.plugin.dateFormatter.format(result.first_air_date, this.apiDateFormat) ?? 'unknown',
			airedTo: ['Returning Series'].includes(result.status!) ? 'unknown' : (this.plugin.dateFormatter.format(result.last_air_date, this.apiDateFormat) ?? 'unknown'),

			userData: {
				watched: false,
				lastWatched: '',
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.TMDBSeriesAPI_disabledMediaTypes;
	}
}
