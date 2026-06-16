import createClient from 'openapi-fetch';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { SeasonModel } from 'packages/obsidian/src/models/SeasonModel';
import { SeasonSearchResultModel } from 'packages/obsidian/src/models/SeasonSearchResultModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';
import { obsidianFetch } from 'packages/obsidian/src/utils/Utils';
import type { paths } from 'packages/schemas/src/TMDB';

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

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const searchResponseResult = await fromPromise(
			client.GET('/3/search/tv', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					query: {
						query: encodeURIComponent(title),
						include_adult: this.plugin.settings.sfwFilter ? false : true,
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!searchResponseResult.ok) {
			return err(searchResponseResult.error);
		}
		const searchResponse = searchResponseResult.value;

		if (searchResponse.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}

		if (searchResponse.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${searchResponse.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${searchResponse.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: searchResponse.response.status },
			});
		}

		const searchData = searchResponse.data;

		if (!searchData?.results || searchData.total_results === 0) {
			return ok([]);
		}

		const topResults = searchData.results.slice(0, 20);

		const items = await Promise.all(
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
							fetch: obsidianFetch,
						});

						if (detailsResponse.response.status === 200 && Array.isArray(detailsResponse.data?.seasons)) {
							totalSeasons = detailsResponse.data.seasons.length;
						}
					} catch {
						// Ignore detail errors and use 0 as fallback.
					}
				}

				return new SeasonSearchResultModel({
					title: `${result.name ?? result.original_name ?? ''}`,
					englishTitle: result.name ?? result.original_name ?? '',
					year: result.first_air_date ? new Date(result.first_air_date).getFullYear().toString() : 'unknown',
					dataSource: this.apiName,
					id: result.id?.toString() ?? '',
					seasonCount: totalSeasons,
				});
			}),
		);

		return ok(items);
	}

	// Fetch all seasons for a given series
	async getSeasonsForSeries(tvId: string): Promise<Result<SeasonModel[], MDBError>> {
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);
		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName, tvId },
			});
		}

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });
		const seriesResponseResult = await fromPromise(
			client.GET('/3/tv/{series_id}', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					path: { series_id: Number.parseInt(tvId, 10) },
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, tvId },
				}),
		);

		if (!seriesResponseResult.ok) {
			return err(seriesResponseResult.error);
		}
		const seriesResponse = seriesResponseResult.value;

		if (seriesResponse.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName, tvId },
			});
		}

		if (seriesResponse.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${seriesResponse.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${seriesResponse.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: seriesResponse.response.status, tvId },
			});
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
					}),
				);
			}
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, MDBError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.TMDBKeyId);

		if (!key) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName, id },
			});
		}

		// Expect season ids like "12345/season/2"
		const m = /^(\d+)\/season\/(\d+)$/.exec(id);
		if (!m) {
			return err({
				kind: MDBErrorKind.Validation,
				message: `MDB | Invalid season id "${id}". Expected format "<series_id>/season/<season_number>".`,
				userMessage: `Invalid season id "${id}".`,
				context: { apiName: this.apiName, id },
			});
		}

		const tvId = Number.parseInt(m[1], 10);
		const seasonNumber = Number.parseInt(m[2], 10);

		const client = createClient<paths>({ baseUrl: 'https://api.themoviedb.org' });

		// Fetch season details
		const seasonResponseResult = await fromPromise(
			client.GET('/3/tv/{series_id}/season/{season_number}', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					path: {
						series_id: tvId,
						season_number: seasonNumber,
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!seasonResponseResult.ok) {
			return err(seasonResponseResult.error);
		}
		const seasonResponse = seasonResponseResult.value;

		if (seasonResponse.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName, id },
			});
		}

		if (seasonResponse.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${seasonResponse.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${seasonResponse.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: seasonResponse.response.status, id },
			});
		}

		const seasonData = seasonResponse.data;
		if (!seasonData) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}
		// Fetch parent series to build consistent titles and inherit fields
		const seriesResponseResult = await fromPromise(
			client.GET('/3/tv/{series_id}', {
				headers: {
					Authorization: `Bearer ${key}`,
				},
				params: {
					path: { series_id: tvId },
					query: {
						append_to_response: 'credits',
					},
				},
				fetch: obsidianFetch,
			}),
			cause =>
				toMdbError(cause, {
					kind: MDBErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!seriesResponseResult.ok) {
			return err(seriesResponseResult.error);
		}
		const seriesResponse = seriesResponseResult.value;

		if (seriesResponse.response.status === 401) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName, id },
			});
		}

		if (seriesResponse.response.status !== 200) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | Received status code ${seriesResponse.response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${seriesResponse.response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: seriesResponse.response.status, id },
			});
		}

		const seriesData = seriesResponse.data;

		if (!seriesData) {
			return err({
				kind: MDBErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
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

		return ok(
			new SeasonModel({
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
			}),
		);
	}

	getDisabledMediaTypes(): MediaType[] {
		return [];
	}
}
