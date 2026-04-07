import createClient from 'openapi-fetch';
import type MediaDbPlugin from '../../main';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { SeasonModel } from '../../models/SeasonModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/TMDB';

interface NamedEntity {
	name?: string | null;
}

interface CastMember {
	name?: string | null;
}

interface CreditsLike {
	cast?: CastMember[] | null;
}

function extractNames(items: (NamedEntity | null | undefined)[] | null | undefined): string[] {
	if (!Array.isArray(items)) {
		return [];
	}

	return items.map(item => item?.name?.trim() ?? '').filter(name => name.length > 0);
}

function getTopActorNames(credits: CreditsLike | null | undefined, limit: number = 5): string[] {
	if (!credits || !Array.isArray(credits.cast)) {
		return [];
	}

	return credits.cast
		.map(member => {
			const name = member?.name;
			return typeof name === 'string' ? name : '';
		})
		.filter(name => name.length > 0)
		.slice(0, limit);
}

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
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const searchResponse = await client.GET('/3/search/tv', {
			headers: {
				Authorization: `Bearer ${key}`,
			},
			params: {
				query: {
					query: encodeURIComponent(title),
					include_adult: this.plugin.settings.sfwFilter ? false : true,
				},
			},
			fetch: fetch,
		});

		if (searchResponse.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (searchResponse.response.status !== 200) {
			throw Error(`MDB | Received status code ${searchResponse.response.status} from ${this.apiName}.`);
		}

		const searchData = searchResponse.data;

		if (!searchData?.results || searchData.total_results === 0) {
			return [];
		}

		const topResults = searchData.results.slice(0, 20);

		return await Promise.all(
			topResults.map(async result => {
				let totalSeasons = 0;
				if (typeof result.id === 'number') {
					try {
						const detailsResponse = await client.GET('/3/tv/{series_id}', {
							headers: {
								Authorization: `Bearer ${key}`,
							},
							params: {
								path: { series_id: result.id },
							},
							fetch: fetch,
						});

						if (detailsResponse.response.status === 200 && Array.isArray(detailsResponse.data?.seasons)) {
							totalSeasons = detailsResponse.data.seasons.length;
						}
					} catch {
						// Ignore detail errors and use 0 as fallback.
					}
				}

				return new SeasonModel({
					title: `${result.name ?? result.original_name ?? ''}`,
					englishTitle: result.name ?? result.original_name ?? '',
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id?.toString() ?? '',
					seasonTitle: result.name ?? result.original_name ?? '',
					seasonNumber: totalSeasons,
					image: result.poster_path ? `https://image.tmdb.org/t/p/w780${result.poster_path}` : '',
				});
			}),
		);
	}

	// Fetch all seasons for a given series
	async getSeasonsForSeries(tvId: string): Promise<SeasonModel[]> {
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);
		if (!key) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const seriesResponse = await client.GET('/3/tv/{series_id}', {
			headers: {
				Authorization: `Bearer ${key}`,
			},
			params: {
				path: { series_id: Number.parseInt(tvId, 10) },
			},
			fetch: fetch,
		});

		if (seriesResponse.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (seriesResponse.response.status !== 200) {
			throw Error(`MDB | Received status code ${seriesResponse.response.status} from ${this.apiName}.`);
		}

		const seriesData = seriesResponse.data;
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
						image: season.poster_path ?? '',
					}),
				);
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		// Expect season ids like "12345/season/2"
		const m = /^(\d+)\/season\/(\d+)$/.exec(id);
		if (!m) {
			throw Error(`MDB | Invalid season id "${id}". Expected format "<series_id>/season/<season_number>".`);
		}

		const tvId = Number.parseInt(m[1], 10);
		const seasonNumber = Number.parseInt(m[2], 10);

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });

		// Fetch season details
		const seasonResponse = await client.GET('/3/tv/{series_id}/season/{season_number}', {
			headers: {
				Authorization: `Bearer ${key}`,
			},
			params: {
				path: {
					series_id: tvId,
					season_number: seasonNumber,
				},
			},
			fetch: fetch,
		});

		if (seasonResponse.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (seasonResponse.response.status !== 200) {
			throw Error(`MDB | Received status code ${seasonResponse.response.status} from ${this.apiName}.`);
		}

		const seasonData = seasonResponse.data;
		if (!seasonData) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}
		// Fetch parent series to build consistent titles and inherit fields
		const seriesResponse = await client.GET('/3/tv/{series_id}', {
			headers: {
				Authorization: `Bearer ${key}`,
			},
			params: {
				path: { series_id: tvId },
				query: {
					append_to_response: 'credits',
				},
			},
			fetch: fetch,
		});

		if (seriesResponse.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}

		if (seriesResponse.response.status !== 200) {
			throw Error(`MDB | Received status code ${seriesResponse.response.status} from ${this.apiName}.`);
		}

		const seriesData = seriesResponse.data;

		if (!seriesData) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}

		const seriesName = seriesData?.name ?? '';
		const airDate = seasonData.air_date ?? '';
		const titleText = `${seriesName} - Season ${seasonData.season_number}`;

		// Get airedTo as the air_date of the last episode, if available
		let airedTo = 'unknown';
		if (Array.isArray(seasonData.episodes) && seasonData.episodes.length > 0) {
			const lastEp = seasonData.episodes[seasonData.episodes.length - 1];
			if (lastEp?.air_date) airedTo = lastEp.air_date;
		}
		const formattedAiredTo = airedTo === 'unknown' ? 'unknown' : (this.plugin.dateFormatter.format(airedTo, this.apiDateFormat) ?? airedTo);

		return new SeasonModel({
			title: titleText,
			englishTitle: titleText,
			year: airDate ? new Date(airDate).getFullYear().toString() : 'unknown',
			dataSource: this.apiName,
			url: `https://www.themoviedb.org/tv/${tvId.toString()}/season/${seasonData.season_number}`,
			id: `${tvId.toString()}/season/${seasonData.season_number}`,
			seasonTitle: seasonData.name ?? titleText,
			seasonNumber: seasonData.season_number ?? seasonNumber,
			episodes: Array.isArray(seasonData.episodes) ? seasonData.episodes.length : 0,
			airedFrom: this.plugin.dateFormatter.format(airDate, this.apiDateFormat) ?? 'unknown',
			airedTo: formattedAiredTo,
			plot: seasonData.overview ?? '',
			image: seasonData.poster_path ? `https://image.tmdb.org/t/p/w780${seasonData.poster_path}` : '',
			genres: extractNames(seriesData.genres),
			writer: extractNames(seriesData.created_by),
			studio: extractNames(seriesData.production_companies),
			duration: seriesData.episode_run_time?.[0]?.toString() ?? '',
			onlineRating: seasonData.vote_average ?? 0,
			actors: getTopActorNames((seriesData as { credits?: CreditsLike }).credits),
			released: ['Returning Series', 'Cancelled', 'Ended'].includes(seriesData.status ?? ''),
			streamingServices: [],
			airing: ['Returning Series'].includes(seriesData.status ?? ''),
			userData: { watched: false, lastWatched: '', personalRating: 0 },
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return [];
	}
}
