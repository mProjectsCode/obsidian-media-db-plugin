import { Notice, renderResults } from 'obsidian';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import { SeasonModel } from '../../models/SeasonModel';

export class TMDBSeasonAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();
		this.plugin = plugin;
		this.apiName = 'TMDBSeasonAPI';
		this.apiDescription = 'A community built Series DB (seasons).';
		this.apiUrl = 'https://www.themoviedb.org/';
		this.types = [MediaType.Season];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('tv', 'season');
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

		const searchData = await searchResp.json();
		if (!searchData.results || searchData.total_results === 0) {
			return [];
		}

		const ret: MediaTypeModel[] = [];

		for (const result of searchData.results) {
			if (ret.length >= 20) break;

			// Fetch series details to get the total number of seasons
			let totalSeasons = 0;
			try {
				const detailsUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(result.id)}?api_key=${this.plugin.settings.TMDBKey}`;
				const detailsResp = await fetch(detailsUrl);
				if (detailsResp.status === 200) {
					const detailsData = await detailsResp.json();
					if (Array.isArray(detailsData.seasons)) {
						totalSeasons = detailsData.seasons.length;
					}
				}
			} catch {}
			ret.push(
				new SeasonModel({
					title: `${result.name ?? result.original_name ?? ''}`,
					englishTitle: result.name ?? result.original_name ?? '',
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id.toString(),
					seasonTitle: result.name ?? result.original_name ?? '',
					seasonNumber: totalSeasons,
				}),
			);
		}

		return ret;
	}

	//Fetch all seasons for a given series
	async getSeasonsForSeries(tvId: string): Promise<SeasonModel[]> {
		if (!this.plugin.settings.TMDBKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}
		const seriesUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tvId)}?api_key=${this.plugin.settings.TMDBKey}`;
		const seriesResp = await fetch(seriesUrl);
		if (seriesResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (seriesResp.status !== 200) {
			throw Error(`MDB | Received status code ${seriesResp.status} from ${this.apiName}.`);
		}
		const seriesData = await seriesResp.json();
		const seriesName = seriesData?.name ?? '';
		const ret: SeasonModel[] = [];
		if (Array.isArray(seriesData?.seasons)) {
			for (const season of seriesData.seasons) {
				const seasonNumber = season.season_number ?? 0;
				const titleText = `${seriesName} - Season ${seasonNumber}`;
				ret.push(
					new SeasonModel({
						title: titleText,
						englishTitle: titleText,
						year: season.air_date ? new Date(season.air_date).getFullYear().toString() : 'unknown',
						dataSource: this.apiName,
						id: `${tvId}/season/${seasonNumber}`,
						seasonTitle: season.name ?? titleText,
						seasonNumber: seasonNumber,
					}),
				);
			}
		}
		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.TMDBKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		// Expect season ids like "12345/season/2"
		const m = /^(\d+)\/season\/(\d+)$/.exec(id);
		if (!m) {
			throw Error(`MDB | Invalid season id "${id}". Expected format "<tvId>/season/<seasonNumber>".`);
		}

		const tvId = m[1];
		const seasonNumber = m[2];

		const seasonUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tvId)}/season/${encodeURIComponent(seasonNumber)}?api_key=${this.plugin.settings.TMDBKey}`;
		const seasonResp = await fetch(seasonUrl);

		if (seasonResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (seasonResp.status !== 200) {
			throw Error(`MDB | Received status code ${seasonResp.status} from ${this.apiName}.`);
		}

		const seasonData = await seasonResp.json();

		// Fetch parent series to build consistent titles and inherit fields
		const seriesUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tvId)}?api_key=${this.plugin.settings.TMDBKey}&append_to_response=credits`;
		const seriesResp = await fetch(seriesUrl);

		if (seriesResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (seriesResp.status !== 200) {
			throw Error(`MDB | Received status code ${seriesResp.status} from ${this.apiName}.`);
		}

		const seriesData = await seriesResp.json();
		const seriesName = seriesData?.name ?? '';

		const airDate = seasonData.air_date ?? '';
		const titleText = `${seriesName} - Season ${seasonData.season_number}`;

		// Get airedTo as the air_date of the last episode, if available
		let airedTo = 'unknown';
		if (Array.isArray(seasonData.episodes) && seasonData.episodes.length > 0) {
			const lastEp = seasonData.episodes[seasonData.episodes.length - 1];
			if (lastEp?.air_date) airedTo = lastEp.air_date;
		}

		return new SeasonModel({
			title: titleText,
			englishTitle: titleText,
			year: airDate ? new Date(airDate).getFullYear().toString() : 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/tv/${tvId}/season/${seasonData.season_number}`,
			id: `${tvId}/season/${seasonData.season_number}`,
			seasonTitle: seasonData.name ?? titleText,
			seasonNumber: seasonData.season_number ?? Number(seasonNumber),
			episodes: Array.isArray(seasonData.episodes) ? seasonData.episodes.length : (seasonData.episodes ?? 0),
			airedFrom: this.plugin.dateFormatter.format(airDate, this.apiDateFormat) ?? 'unknown',
			airedTo: airedTo,
			plot: seasonData.overview ?? '',
			image: seasonData.poster_path ? `https://image.tmdb.org/t/p/w780${seasonData.poster_path}` : '',
			genres: seriesData.genres?.map((g: any) => g.name) ?? [],
			writer: seriesData.created_by?.map((c: any) => c.name) ?? [],
			studio: seriesData.production_companies?.map((s: any) => s.name) ?? [],
			duration: seriesData.episode_run_time?.[0]?.toString() ?? '',
			onlineRating: seasonData.vote_average ?? 0,
			actors: seriesData.credits?.cast?.map((c: any) => c.name).slice(0, 5) ?? [],
			released: ['Returning Series', 'Cancelled', 'Ended'].includes(seriesData.status),
			streamingServices: [],
			airing: ['Returning Series'].includes(seriesData.status),
			userData: { watched: false, lastWatched: '', personalRating: 0 },
		});
	}

	// Settings didn’t define TMDBSeasonAPIdisabledMediaTypes yet; return an empty list for now
	getDisabledMediaTypes(): MediaType[] {
		return [];
	}
}
