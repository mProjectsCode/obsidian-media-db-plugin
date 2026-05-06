import { requestUrl } from 'obsidian';
import { APIModel } from 'packages/obsidian/src/api/APIModel';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { GameModel } from 'packages/obsidian/src/models/GameModel';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MovieModel } from 'packages/obsidian/src/models/MovieModel';
import { SeriesModel } from 'packages/obsidian/src/models/SeriesModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind, toAppError } from 'packages/obsidian/src/utils/AppError';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, fromPromise, ok } from 'packages/obsidian/src/utils/result';

interface ErrorResponse {
	Response: 'False';
	Error: string;
}

type SearchResponse =
	| {
			Response: 'True';
			totalResults: string;
			Search: {
				Title: string;
				Year: string;
				Poster: string;
				imdbID: string;
				Type: string;
			}[];
	  }
	| ErrorResponse;

type IdResponse =
	| {
			Response: 'True';
			Title: string;
			Year: string;
			Rated: string;
			Released: string;
			Runtime: string;
			Genre: string;
			Director: string;
			Writer: string;
			Actors: string;
			Plot: string;
			Language: string;
			Country: string;
			Awards: string;
			Poster: string;
			Metascore: string;
			imdbRating: string;
			imdbVotes: string;
			imdbID: string;
			Type: string;
			DVD: string;
			BoxOffice: string;
			Production: string;
			Website: string;
	  }
	| ErrorResponse;

export class OMDbAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'DD MMM YYYY';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'OMDbAPI';
		this.apiDescription = 'A free API for Movies, Series and Games.';
		this.apiUrl = 'https://www.omdbapi.com/';
		this.types = [MediaType.Movie, MediaType.Series, MediaType.Game];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('movie', 'movie');
		this.typeMappings.set('series', 'series');
		this.typeMappings.set('game', 'game');
	}

	async searchByTitle(title: string): Promise<Result<MediaTypeModel[], AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by Title`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.OMDbKeyId);

		if (!key) {
			return err({
				kind: AppErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const responseResult = await fromPromise(
			requestUrl({
				url: `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${key}`,
				method: 'GET',
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, title },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;

		if (response.status === 401) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}
		if (response.status !== 200) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.status },
			});
		}

		const data = response.json as SearchResponse | undefined;

		if (!data) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName },
			});
		}

		if (data.Response === 'False') {
			if (data.Error === 'Movie not found!') {
				return ok([]);
			}

			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received error from ${this.apiName}: ${data.Error}`,
				userMessage: `${data.Error}`,
				context: { apiName: this.apiName },
			});
		}
		if (!data.Search) {
			return ok([]);
		}

		// console.debug(data.Search);

		const ret: MediaTypeModel[] = [];

		for (const result of data.Search) {
			const type = this.typeMappings.get(result.Type.toLowerCase());
			if (type === undefined) {
				continue;
			}
			if (type === 'movie') {
				ret.push(
					new MovieModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
					}),
				);
			} else if (type === 'series') {
				ret.push(
					new SeriesModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
					}),
				);
			} else if (type === 'game') {
				ret.push(
					new GameModel({
						type: type,
						title: result.Title,
						englishTitle: result.Title,
						year: result.Year,
						dataSource: this.apiName,
						id: result.imdbID,
					}),
				);
			}
		}

		return ok(ret);
	}

	async getById(id: string): Promise<Result<MediaTypeModel, AppError>> {
		Logger.log(`MDB | api "${this.apiName}" queried by ID`);
		const key = this.plugin.app.secretStorage.getSecret(this.plugin.settings.OMDbKeyId);

		if (!key) {
			return err({
				kind: AppErrorKind.Validation,
				message: `MDB | API key for ${this.apiName} missing.`,
				userMessage: `API key for ${this.apiName} missing.`,
				context: { apiName: this.apiName },
			});
		}

		const responseResult = await fromPromise(
			requestUrl({
				url: `https://www.omdbapi.com/?i=${encodeURIComponent(id)}&apikey=${key}`,
				method: 'GET',
			}),
			cause =>
				toAppError(cause, {
					kind: AppErrorKind.Network,
					message: `MDB | Network error querying ${this.apiName}`,
					userMessage: `Network error querying ${this.apiName}`,
					context: { apiName: this.apiName, id },
				}),
		);

		if (!responseResult.ok) {
			return err(responseResult.error);
		}
		const response = responseResult.value;

		if (response.status === 401) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Authentication for ${this.apiName} failed. Check the API key.`,
				userMessage: `Authentication for ${this.apiName} failed. Check the API key.`,
				context: { apiName: this.apiName },
			});
		}
		if (response.status !== 200) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received status code ${response.status} from ${this.apiName}.`,
				userMessage: `Received status code ${response.status} from ${this.apiName}.`,
				context: { apiName: this.apiName, status: response.status, id },
			});
		}

		const result = response.json as IdResponse | undefined;

		if (!result) {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | No data received from ${this.apiName}.`,
				userMessage: `No data received from ${this.apiName}.`,
				context: { apiName: this.apiName, id },
			});
		}

		if (result.Response === 'False') {
			return err({
				kind: AppErrorKind.Api,
				message: `MDB | Received error from ${this.apiName}: ${result.Error}`,
				userMessage: `${result.Error}`,
				context: { apiName: this.apiName, id },
			});
		}

		const type = this.typeMappings.get(result.Type.toLowerCase());
		if (type === undefined) {
			return err({
				kind: AppErrorKind.Validation,
				message: `${result.Type.toLowerCase()} is an unsupported type.`,
				userMessage: `${result.Type.toLowerCase()} is an unsupported type.`,
				context: { apiName: this.apiName, id, type: result.Type },
			});
		}

		if (type === 'movie') {
			return ok(
				new MovieModel({
					type: type,
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					url: `https://www.imdb.com/title/${result.imdbID}/`,
					id: result.imdbID,

					plot: result.Plot,
					genres: result.Genre?.split(', '),
					director: result.Director?.split(', '),
					writer: result.Writer?.split(', '),
					duration: result.Runtime,
					onlineRating: Number.parseFloat(result.imdbRating ?? 0),
					actors: result.Actors?.split(', '),
					image: result.Poster.replace('_SX300', '_SX600'),

					released: true,
					country: result.Country?.split(', '),
					boxOffice: result.BoxOffice,
					ageRating: result.Rated,
					premiere: this.plugin.dateFormatter.format(result.Released, this.apiDateFormat),

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				}),
			);
		} else if (type === 'series') {
			return ok(
				new SeriesModel({
					type: type,
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					url: `https://www.imdb.com/title/${result.imdbID}/`,
					id: result.imdbID,

					plot: result.Plot,
					genres: result.Genre?.split(', '),
					writer: result.Writer?.split(', '),
					studio: [],
					episodes: 0,
					duration: result.Runtime,
					onlineRating: Number.parseFloat(result.imdbRating ?? 0),
					actors: result.Actors?.split(', '),
					image: result.Poster.replace('_SX300', '_SX600'),

					released: true,
					country: result.Country?.split(', '),
					ageRating: result.Rated,
					airedFrom: this.plugin.dateFormatter.format(result.Released, this.apiDateFormat),

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				}),
			);
		} else if (type === 'game') {
			return ok(
				new GameModel({
					type: type,
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					url: `https://www.imdb.com/title/${result.imdbID}/`,
					id: result.imdbID,

					genres: result.Genre?.split(', '),
					onlineRating: Number.parseFloat(result.imdbRating ?? 0),
					image: result.Poster.replace('_SX300', '_SX600'),

					released: true,
					releaseDate: this.plugin.dateFormatter.format(result.Released, this.apiDateFormat),

					userData: {
						played: false,
						personalRating: 0,
					},
				}),
			);
		}

		return err({
			kind: AppErrorKind.Unexpected,
			message: `MDB | Unknown media type for id ${id}`,
			userMessage: `Unknown media type for id ${id}`,
			context: { apiName: this.apiName, id },
		});
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.OMDbAPI_disabledMediaTypes;
	}
}
