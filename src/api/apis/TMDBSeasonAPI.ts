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

		// 1) Search for series
		const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${this.plugin.settings.TMDBKey}&query=${encodeURIComponent(title)}&include_adult=${this.plugin.settings.sfwFilter ? 'false' : 'true'}`;
		const searchResp = await fetch(searchUrl);

		if (searchResp.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (searchResp.status !== 200) {
			throw Error(`MDB | Received status code ${searchResp.status} from ${this.apiName}.`);
		}

		const searchData = await searchResp.json();

		if (searchData.total_results === 0 || !searchData.results) {
			return [];
		}

		const ret: MediaTypeModel[] = [];

		// 2) For each series result, fetch its seasons and flatten into SeasonModel entries (cap total to 20)
		for (const series of searchData.results) {
			if (ret.length >= 20) break;

			const tvId = series.id;
			const seriesUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tvId)}?api_key=${this.plugin.settings.TMDBKey}`;
			const tvResp = await fetch(seriesUrl);

			if (tvResp.status === 401) {
				throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
			}
			if (tvResp.status !== 200) {
				// Skip this series if it fails; do not abort the whole search
				console.warn(`MDB | Skipping series ${tvId} due to status ${tvResp.status}`);
				continue;
			}

			const tvData = await tvResp.json();
			const seriesName = tvData?.name ?? series?.name ?? series?.original_name ?? '';

			if (Array.isArray(tvData?.seasons)) {
				for (const season of tvData.seasons) {
					if (ret.length >= 20) break;

					// Some seasons (e.g., specials) may have limited metadata; handle gracefully
					const seasonNumber = season.season_number ?? 0;
					const airDate = season.air_date ?? '';
					const titleText = `${seriesName} - Season ${seasonNumber}`;
					ret.push(
						new SeasonModel({
							// SeasonModel constructor sets type to MediaType.Series internally
							title: titleText,
							englishTitle: titleText,
							year: airDate ? new Date(airDate).getFullYear().toString() : 'unknown',
							dataSource: this.apiName,
							id: `${tvId}-S${seasonNumber}`,
							seasonTitle: season.name ?? titleText,
							seasonNumber: seasonNumber,
							episodes: season.episode_count ?? 0,
							airedFrom: this.plugin.dateFormatter.format(airDate, this.apiDateFormat) ?? 'unknown',
							airedTo: 'unknown',
							plot: season.overview ?? '',
							image: season.poster_path ? `https://image.tmdb.org/t/p/w780${season.poster_path}` : '',
							userData: { watched: false, lastWatched: '', personalRating: 0 },
						}),
					);
				}
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.TMDBKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		// Expect season ids like "12345-S2"
		const m = /^(\d+)-S(\d+)$/.exec(id);
		if (!m) {
			throw Error(`MDB | Invalid season id "${id}". Expected format "<tvId>-S<seasonNumber>".`);
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

		// Fetch parent series to build consistent titles
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

		const airDate = seasonData.air_date ?? '';
		const titleText = `${seriesName} - Season ${seasonData.season_number}`;

		return new SeasonModel({
			title: titleText,
			englishTitle: titleText,
			year: airDate ? new Date(airDate).getFullYear().toString() : 'unknown',
			dataSource: this.apiName,
			id: `${tvId}-S${seasonData.season_number}`,
			seasonTitle: seasonData.name ?? titleText,
			seasonNumber: seasonData.season_number ?? Number(seasonNumber),
			episodes: Array.isArray(seasonData.episodes) ? seasonData.episodes.length : (seasonData.episodes ?? 0),
			airedFrom: this.plugin.dateFormatter.format(airDate, this.apiDateFormat) ?? 'unknown',
			airedTo: 'unknown',
			plot: seasonData.overview ?? '',
			image: seasonData.poster_path ? `https://image.tmdb.org/t/p/w780${seasonData.poster_path}` : '',
			userData: { watched: false, lastWatched: '', personalRating: 0 },
		});
	}

	// Settings didn’t define TMDBSeasonAPIdisabledMediaTypes yet; return an empty list for now
	getDisabledMediaTypes(): MediaType[] {
		return [];
	}
}
