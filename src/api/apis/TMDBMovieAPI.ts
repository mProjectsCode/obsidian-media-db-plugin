import { Notice, renderResults } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

interface TMDBSearchMovieResult {
	id: number;
	original_language?: string;
	original_title?: string;
	overview?: string;
	popularity?: number;
	poster_path?: string;
	release_date?: string;
	title?: string;
	video?: boolean;
	vote_average?: number;
	vote_count?: number;
	adult?: boolean;
	backdrop_path?: string;
	genre_ids?: number[];
}

interface TMDBSearchMovieResponse {
	page: number;
	results: TMDBSearchMovieResult[];
	total_results: number;
	total_pages: number;
}

interface TMDBMovieDetails {
	id: number;
	title?: string;
	original_title?: string;
	release_date?: string;
	overview?: string;
	genres?: { id: number; name: string }[];
	production_companies?: { id: number; name: string }[];
	runtime?: number;
	status?: string;
	vote_average?: number;
	poster_path?: string;
	credits?: {
		cast?: { name: string }[];
		crew?: { name: string; job: string }[];
	};
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
		this.typeMappings = new Map();
		this.typeMappings.set('movie', 'movie');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);
		if (!this.plugin.settings.TMDBKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${this.plugin.settings.TMDBKey}&query=${encodeURIComponent(title)}&include_adult=${this.plugin.settings.sfwFilter ? 'false' : 'true'}`;
		const searchResp = await fetch(searchUrl);
		if (searchResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (searchResp.status !== 200) {
			throw Error(`MDB | Received status code ${searchResp.status} from ${this.apiName}.`);
		}

		const searchData = (await searchResp.json()) as TMDBSearchMovieResponse;
		if (!searchData.results || searchData.total_results === 0) {
			return [];
		}

		const ret: MediaTypeModel[] = [];
		for (const result of searchData.results) {
			ret.push(
				new MovieModel({
					type: 'movie',
					title: result.original_title ?? '',
					englishTitle: result.title ?? '',
					year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id.toString(),
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MovieModel> {
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

		const result = (await fetchData.json()) as TMDBMovieDetails;

		return new MovieModel({
			type: 'movie',
			title: result.title ?? '',
			englishTitle: result.title ?? '',
			year: result.release_date ? new Date(result.release_date).getFullYear().toString() : 'unknown',
			premiere: this.plugin.dateFormatter.format(result.release_date ?? '', this.apiDateFormat) ?? 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/movie/${result.id}`,
			id: result.id.toString(),
			plot: result.overview ?? '',
			genres: result.genres?.map((g: any) => g.name) ?? [],
			writer: result.credits?.crew?.filter((c: any) => c.job === 'Screenplay').map((c: any) => c.name) ?? [],
			director: result.credits?.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name) ?? [],
			studio: result.production_companies?.map((s: any) => s.name) ?? [],
			duration: result.runtime?.toString() ?? 'unknown',
			onlineRating: result.vote_average ?? 0,
			actors: result.credits?.cast?.map((c: any) => c.name).slice(0, 5) ?? [],
			image: result.poster_path ? `https://image.tmdb.org/t/p/w780${result.poster_path}` : '',
			released: ['Released'].includes(result.status ?? ''),
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
