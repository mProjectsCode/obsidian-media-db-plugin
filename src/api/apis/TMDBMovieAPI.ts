import { Notice, renderResults } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

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

		const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${this.plugin.settings.TMDBKey}&query=${encodeURIComponent(title)}&include_adult=${this.plugin.settings.sfwFilter ? 'false' : 'true'}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json();

		if (data.total_results === 0) {
			if (data.Error === 'Movie not found!') {
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
				new MovieModel({
					type: 'movie',
					title: result.original_title,
					englishTitle: result.title,
					year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
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

		const searchUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?api_key=${this.plugin.settings.TMDBKey}&append_to_response=credits`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const result = await fetchData.json();
		// console.debug(result);

		return new MovieModel({
			type: 'movie',
			title: result.title,
			englishTitle: result.title,
			year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
			premiere: this.plugin.dateFormatter.format(result.release_date, this.apiDateFormat) ?? 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/movie/${result.id}`,
			id: result.id,

			plot: result.overview ?? '',
			genres: result.genres.map((g: any) => g.name) ?? [],
			writer: result.credits.crew.filter((c: any) => c.job === 'Screenplay').map((c: any) => c.name) ?? [],
			director: result.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name) ?? [],
			studio: result.production_companies.map((s: any) => s.name) ?? [],
			
			duration: result.runtime ?? 'unknown',
			onlineRating: result.vote_average,
			actors: result.credits.cast.map((c: any) => c.name).slice(0, 5) ?? [],
			image: `https://image.tmdb.org/t/p/w780${result.poster_path}`,

			released:['Released'].includes(result.status),
			streamingServices: [],

			userData: {
				watched: false,
				lastWatched: '',
				personalRating: 0,
			},
		});

	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.TMDBMovieAPI_disabledMediaTypes as MediaType[];
	}
}
