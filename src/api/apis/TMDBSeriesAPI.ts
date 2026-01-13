import { Notice, renderResults } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { SeriesModel } from '../../models/SeriesModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

interface TMDBSearchTVResult {
	id: number;
	origin_country?: string[];
	original_language?: string;
	original_name?: string;
	overview?: string;
	popularity?: number;
	poster_path?: string;
	first_air_date?: string;
	name?: string;
	vote_average?: number;
	vote_count?: number;
	adult?: boolean;
	backdrop_path?: string;
	genre_ids?: number[];
}

interface TMDBSearchTVResponse {
	page: number;
	results: TMDBSearchTVResult[];
	total_results: number;
	total_pages: number;
}

interface TMDBSeriesDetails {
	id: number;
	name?: string;
	original_name?: string;
	first_air_date?: string;
	last_air_date?: string;
	overview?: string;
	genres?: { id: number; name: string }[];
	created_by?: { id: number; name: string }[];
	production_companies?: { id: number; name: string }[];
	episode_run_time?: number[];
	number_of_episodes?: number;
	status?: string;
	vote_average?: number;
	poster_path?: string;
	credits?: {
		cast?: { name: string }[];
	};
}

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
		this.typeMappings = new Map();
		this.typeMappings.set('tv', 'series');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);
		if (!this.plugin.settings.TMDBKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${this.plugin.settings.TMDBKey}&query=${encodeURIComponent(title)}&include_adult=${this.plugin.settings.sfwFilter ? 'false' : 'true'}`;
		const searchResp = await fetch(searchUrl);
		if (searchResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (searchResp.status !== 200) {
			throw Error(`MDB | Received status code ${searchResp.status} from ${this.apiName}.`);
		}

		const searchData = (await searchResp.json()) as TMDBSearchTVResponse;
		if (!searchData.results || searchData.total_results === 0) {
			return [];
		}

		const ret: MediaTypeModel[] = [];
		for (const result of searchData.results) {
			ret.push(
				new SeriesModel({
					type: 'series',
					title: result.original_name ?? '',
					englishTitle: result.name ?? '',
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id.toString(),
				}),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<SeriesModel> {
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

		const result = (await fetchData.json()) as TMDBSeriesDetails;

		return new SeriesModel({
			type: 'series',
			title: result.original_name ?? '',
			englishTitle: result.name ?? '',
			year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/tv/${result.id}`,
			id: result.id.toString(),
			plot: result.overview ?? '',
			genres: result.genres?.map((g: any) => g.name) ?? [],
			writer: result.created_by?.map((c: any) => c.name) ?? [],
			studio: result.production_companies?.map((s: any) => s.name) ?? [],
			episodes: result.number_of_episodes ?? 0,
			duration: result.episode_run_time?.[0]?.toString() ?? 'unknown',
			onlineRating: result.vote_average ?? 0,
			actors: result.credits?.cast?.map((c: any) => c.name).slice(0, 5) ?? [],
			image: result.poster_path ? `https://image.tmdb.org/t/p/w780${result.poster_path}` : '',
			released: ['Returning Series', 'Cancelled', 'Ended'].includes(result.status ?? ''),
			streamingServices: [],
			airing: ['Returning Series'].includes(result.status ?? ''),
			airedFrom: this.plugin.dateFormatter.format(result.first_air_date ?? '', this.apiDateFormat) ?? 'unknown',
			airedTo: ['Returning Series'].includes(result.status ?? '') ? 'unknown' : (this.plugin.dateFormatter.format(result.last_air_date ?? '', this.apiDateFormat) ?? 'unknown'),
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
