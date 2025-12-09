import { Notice, renderResults } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { SeriesModel } from '../../models/SeriesModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

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

		if (!this.plugin.settings.TMDBKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${this.plugin.settings.TMDBKey}&query=${encodeURIComponent(title)}&include_adult=${this.plugin.settings.sfwFilter ? 'false' : 'true'}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json();

		if (data.total_results === 0) {
			if (data.Error === 'Series not found!') {
				return [];
			}

			throw Error(`MDB | Received error from ${this.apiName}: \n${JSON.stringify(data, undefined, 4)}`);
		}
		if (!data.results) {
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
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id,
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

		const searchUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(id)}?api_key=${this.plugin.settings.TMDBKey}&append_to_response=credits`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const result = await fetchData.json();
		// console.debug(result);

		return new SeriesModel({
			type: 'series',
			title: result.original_name,
			englishTitle: result.name,
			year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/tv/${result.id}`,
			id: result.id,

			plot: result.overview ?? '',
			genres: result.genres.map((g: any) => g.name) ?? [],
			writer: result.created_by.map((c: any) => c.name) ?? [],
			studio: result.production_companies.map((s: any) => s.name) ?? [],
			episodes: result.number_of_episodes,
			duration: result.episode_run_time[0] ?? 'unknown',
			onlineRating: result.vote_average,
			actors: result.credits.cast.map((c: any) => c.name).slice(0, 5) ?? [],
			image: `https://image.tmdb.org/t/p/w780${result.poster_path}`,

			released: ['Returning Series', 'Cancelled', 'Ended'].includes(result.status),
			streamingServices: [],
			airing: ['Returning Series'].includes(result.status),
			airedFrom: this.plugin.dateFormatter.format(result.first_air_date, this.apiDateFormat) ?? 'unknown',
			airedTo: ['Returning Series'].includes(result.status) ? 'unknown' : (this.plugin.dateFormatter.format(result.last_air_date, this.apiDateFormat) ?? 'unknown'),

			userData: {
				watched: false,
				lastWatched: '',
				personalRating: 0,
			},
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.TMDBSeriesAPI_disabledMediaTypes as MediaType[];
	}
}
