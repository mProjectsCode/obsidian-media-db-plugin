import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import {MovieModel} from '../../models/MovieModel';
import MediaDbPlugin from '../../main';
import {SeriesModel} from '../../models/SeriesModel';
import {GameModel} from '../../models/GameModel';

export class OMDbAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'OMDbAPI';
		this.apiDescription = 'A free API for Movies, Series and Games.';
		this.apiUrl = 'http://www.omdbapi.com/';
		this.types = ['movie', 'series'];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried`);

		const searchUrl = `http://www.omdbapi.com/?s=${title}&apikey=${this.plugin.settings.OMDbKey}`;

		const fetchData = await fetch(searchUrl);

		if (fetchData.status === 401) {
			throw Error(`Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json();

		if (data.Response === 'False') {
			throw Error(`Received error from ${this.apiName}: ${data.Error}`);
		}

		if (!data.Search) {
			return [];
		}

		console.log(data.Search);

		let ret: MediaTypeModel[] = [];

		for (const result of data.Search) {
			if (result.Type === 'movie') {
				ret.push(new MovieModel({
					type: 'movie',
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					id: result.imdbID,
				} as MovieModel));
			} else if (result.Type === 'series') {
				ret.push(new SeriesModel({
					type: 'series',
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					id: result.imdbID,
				} as SeriesModel));
			} else if (result.Type === 'game') {
				ret.push(new GameModel({
					type: 'game',
					title: result.Title,
					englishTitle: result.Title,
					year: result.Year,
					dataSource: this.apiName,
					id: result.imdbID,
				} as GameModel));
			}
		}

		return ret;
	}

	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {

		const searchUrl = `http://www.omdbapi.com/?i=${item.id}&apikey=${this.plugin.settings.OMDbKey}`;

		const fetchData = await fetch(searchUrl);
		if (fetchData.status === 401) {
			throw Error(`Authentication for ${this.apiName} failed. Check the API key.`);
		}
		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}

		const result = await fetchData.json();

		console.log(result);

		if (result.Response === 'False') {
			throw Error(`Received error from ${this.apiName}: ${result.Error}`);
		}

		if (result.Type === 'movie') {
			const model = new MovieModel({
				type: 'movie',
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				genres: result.Genre?.split(', ') ?? [],
				producer: result.Director ?? 'unknown',
				duration: result.Runtime ?? 'unknown',
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				image: result.Poster ?? '',

				released: true,
				premiere: (new Date(result.Released)).toLocaleDateString() ?? 'unknown',

				watched: false,
				lastWatched: '',
				personalRating: 0,
			} as MovieModel);

			return model;
		} else if (result.Type === 'series') {
			const model = new SeriesModel({
				type: 'series',
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				genres: result.Genre?.split(', ') ?? [],
				studios: [result.Director] ?? 'unknown',
				episodes: 0,
				duration: result.Runtime ?? 'unknown',
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				image: result.Poster ?? '',

				released: true,
				airing: false,
				airedFrom: (new Date(result.Released)).toLocaleDateString() ?? 'unknown',
				airedTo: 'unknown',

				watched: false,
				lastWatched: '',
				personalRating: 0,
			} as SeriesModel);

			return model;
		} else if (result.Type === 'game') {
			const model = new GameModel({
				type: 'game',
				title: result.Title,
				englishTitle: result.Title,
				year: result.Year,
				dataSource: this.apiName,
				url: `https://www.imdb.com/title/${result.imdbID}/`,
				id: result.imdbID,

				genres: result.Genre?.split(', ') ?? [],
				onlineRating: Number.parseFloat(result.imdbRating ?? 0),
				image: result.Poster ?? '',

				released: true,
				releaseDate: (new Date(result.Released)).toLocaleDateString() ?? 'unknown',

				played: false,
				personalRating: 0,
			} as GameModel);

			return model;
		}

		return;
	}
}
