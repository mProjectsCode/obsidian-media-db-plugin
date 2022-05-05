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
				ret.push(new MovieModel({title: value.Title, id: value.imdbID, dataSource: this.apiName, type: 'movie', premiere: value.Year} as MovieModel));
			}
		}

		return ret;
	}

	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {

		const searchUrl = `http://www.omdbapi.com/?i=${item.id}&apikey=${this.plugin.settings.OMDbKey}`;

		const fetchData = await fetch(searchUrl);
		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		if (data.Type === 'movie') {
			const model = new MovieModel({title: data.Title, id: data.imdbID, dataSource: this.apiName, type: 'movie', premiere: data.Year} as MovieModel);

			// TODO: mapping

			return model;
		}

		return;
	}
}
