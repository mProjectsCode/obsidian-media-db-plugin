/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import createClient from 'openapi-fetch';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { ApiSecretID, getApiSecretValue } from '../../settings/apiSecretsHelper';
import { MediaType } from '../../utils/MediaType';
import { formatUsdWholeDollars } from '../../utils/Utils';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/TMDB';

/** TMDB `credits.crew` jobs that count as writing credits for movies. */
const TMDB_WRITING_CREW_JOBS = new Set([
	'Writer',
	'Screenplay',
	'Story',
	'Teleplay',
	'Original Story',
	'Characters',
	'Novel',
	'Screenstory',
]);

function tmdbWritingCreditsFromCrew(crew: any[] | undefined): string[] {
	if (!crew?.length) {
		return [];
	}
	const seen = new Set<string>();
	const names: string[] = [];
	for (const c of crew) {
		const job = c?.job as string | undefined;
		const name = c?.name as string | undefined;
		if (!job || !name || !TMDB_WRITING_CREW_JOBS.has(job)) {
			continue;
		}
		if (!seen.has(name)) {
			seen.add(name);
			names.push(name);
		}
	}
	return names;
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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const bearer = getApiSecretValue(this.plugin.app, this.plugin.settings.linkedApiSecretIds, ApiSecretID.tmdb);
		if (!bearer) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const response = await client.GET('/3/search/movie', {
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
				new MovieModel({
					type: 'movie',
					title: result.original_title,
					englishTitle: result.title,
					year: result.release_date ? new Date(result.release_date).getFullYear() : 0,
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
		const response = await client.GET('/3/movie/{movie_id}', {
			headers: {
				Authorization: `Bearer ${bearer}`,
			},
			params: {
				path: { movie_id: parseInt(id) },
				query: {
					append_to_response: 'credits,release_dates,watch/providers',
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
			year: result.release_date ? new Date(result.release_date).getFullYear() : 0,
			premiere: this.plugin.dateFormatter.format(result.release_date, this.apiDateFormat) ?? 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/movie/${result.id}`,
			id: result.id.toString(),

			plot: result.overview ?? '',
			genres: result.genres?.map((g: any) => g.name) ?? [],
			// TMDB's spec allows for 'append_to_response' but doesn't seem to account for it in the type
			writer: tmdbWritingCreditsFromCrew((result as { credits?: { crew?: any[] } }).credits?.crew),
			// @ts-ignore
			director: result.credits.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name) ?? [],
			studio: result.production_companies?.map((s: any) => s.name) ?? [],

			duration: result.runtime != null && Number.isFinite(result.runtime) ? Math.trunc(result.runtime) : 0,
			onlineRating: result.vote_average ? Math.round(result.vote_average * 10) / 10 : 0,
			// @ts-ignore
			actors: result.credits.cast.map((c: any) => c.name).slice(0, 5) ?? [],
			image: `https://image.tmdb.org/t/p/w780${result.poster_path}`,

			released: ['Released'].includes(result.status!),
			country: result.production_countries?.map((c: any) => c.name) ?? [],
			language: result.spoken_languages?.map((l: any) => l.english_name) ?? [],
			budget: formatUsdWholeDollars(result.budget ?? 0),
			revenue: formatUsdWholeDollars(result.revenue ?? 0),
			// @ts-ignore
			ageRating: result.release_dates?.results?.find((r: any) => r.iso_3166_1 === this.plugin.settings.tmdbRegion)?.release_dates?.[0]?.certification ?? '',
			// @ts-ignore
			streamingServices: result['watch/providers']?.results?.[this.plugin.settings.tmdbRegion]?.flatrate?.map((p: any) => p.provider_name) ?? [],

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
