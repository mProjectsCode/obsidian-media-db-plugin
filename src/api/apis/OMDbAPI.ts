import createClient from 'openapi-fetch';
import { obsidianFetch } from 'src/utils/Utils';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { SeriesModel } from '../../models/SeriesModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';
import type { paths } from '../schemas/OMDb';

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
	| {
			Response: 'False';
			Error: string;
	  };

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
	| {
			Response: 'False';
			Error: string;
	  };

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

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		if (!this.plugin.settings.OMDbKey) {
			throw new Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://www.omdbapi.com/' });

		const response = await client.GET('/?s', {
			params: {
				query: {
					s: title,
					apikey: this.plugin.settings.OMDbKey,
				},
			},
			fetch: obsidianFetch,
		});

		if (response.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status !== 200) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const data = response.data as SearchResponse | undefined;

		if (!data) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}

		if (data.Response === 'False') {
			if (data.Error === 'Movie not found!') {
				return [];
			}

			throw Error(`MDB | Received error from ${this.apiName}: ${data.Error}`);
		}
		if (!data.Search) {
			return [];
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

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		if (!this.plugin.settings.OMDbKey) {
			throw Error(`MDB | API key for ${this.apiName} missing.`);
		}

		const client = createClient<paths>({ baseUrl: 'https://www.omdbapi.com/' });

		const response = await client.GET('/?i', {
			params: {
				query: {
					i: id,
					apikey: this.plugin.settings.OMDbKey,
				},
			},
			fetch: obsidianFetch,
		});

		if (response.response.status === 401) {
			throw Error(`MDB | Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (response.response.status !== 200) {
			throw Error(`MDB | Received status code ${response.response.status} from ${this.apiName}.`);
		}

		const result = response.data as IdResponse | undefined;

		if (!result) {
			throw Error(`MDB | No data received from ${this.apiName}.`);
		}

		if (result.Response === 'False') {
			throw Error(`MDB | Received error from ${this.apiName}: ${result.Error}`);
		}

		const type = this.typeMappings.get(result.Type.toLowerCase());
		if (type === undefined) {
			throw Error(`${result.Type.toLowerCase()} is an unsupported type.`);
		}

		if (type === 'movie') {
			return new MovieModel({
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
				premiere: this.plugin.dateFormatter.format(result.Released, this.apiDateFormat),

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			});
		} else if (type === 'series') {
			return new SeriesModel({
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
				airedFrom: this.plugin.dateFormatter.format(result.Released, this.apiDateFormat),

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			});
		} else if (type === 'game') {
			return new GameModel({
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
			});
		}

		throw new Error(`MDB | Unknown media type for id ${id}`);
	}

	getDisabledMediaTypes(): MediaType[] {
		return this.plugin.settings.OMDbAPI_disabledMediaTypes;
	}
}
