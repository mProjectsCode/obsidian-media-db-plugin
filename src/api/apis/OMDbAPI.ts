import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import {MovieModel} from '../../models/MovieModel';
import MediaDbPlugin from '../../main';

export class OMDbAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'OMDbAPI';
		this.apiDescription = 'A free API for Movies and Series.';
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

		if (!data.Search) {
			return [];
		}

		console.log(data.Search);

		let ret: MediaTypeModel[] = [];

		for (const value of data.Search) {
			if (value.Type === 'movie') {
				ret.push(new MovieModel({
					type: 'movie',
					title: value.Title,
					year: value.Year,
					dataSource: this.apiName,
					id: value.imdbID,
				} as MovieModel));
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

		const data = await fetchData.json();
		console.log(data);

		if (data.Type === 'movie') {
			const model = new MovieModel({
				type: 'movie',
				title: data.Title,
				year: data.Year,
				dataSource: this.apiName,
				id: data.imdbID,

				genres: data.Genre?.split(', ') ?? [],
				producer: data.Director ?? 'unknown',
				duration: data.Runtime ?? 'unknown',
				onlineRating: Number.parseFloat(data.imdbRating ?? 0),
				image: data.Poster ?? '',

				released: true,
				premiere: data.Released ?? 'unknown',

				watched: false,
				lastWatched: '',
				personalRating: 0,
			} as MovieModel);

			return model;
		}

		return;
	}
}
