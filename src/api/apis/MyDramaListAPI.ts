import MediaDbPlugin from 'src/main';
import { APIModel } from '../APIModel';
import { MediaType } from 'src/utils/MediaType';
import { MediaTypeModel } from 'src/models/MediaTypeModel';
import { MovieModel } from 'src/models/MovieModel';
import { SeriesModel } from 'src/models/SeriesModel';

export class MyDramaListAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'DD MMM YYYY';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MyDramaListAPI';
		this.apiDescription = 'A free API for Asian Movies and Dramas';
		this.apiUrl = 'https://kuryana.vercel.app/';
		this.types = [MediaType.Movie, MediaType.Series];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://kuryana.vercel.app/search/q/${encodeURIComponent(title)}`;
		const fetchData = await fetch(searchUrl);
		// console.debug(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json();
		console.debug(data);

		const ret: MediaTypeModel[] = [];
		for (const result of data.results.dramas) {
			const type = result.type.toLowerCase();
			if (type.contains('movie')) {
				ret.push(
					new MovieModel({
						type: result.type,
						title: result.title,
						englishTitle: result.title,
						year: result.year,
						dataSource: this.apiName,
						id: result.slug,
					} as MovieModel),
				);
			} else if (type.contains('series') || type.contains('show') || type.contains('drama')) {
				ret.push(
					new SeriesModel({
						type: result.type,
						title: result.title,
						englishTitle: result.title,
						year: result.year,
						dataSource: this.apiName,
						id: result.slug,
					} as SeriesModel),
				);
			} else {
				console.debug(`MDB | api "${this.apiName}" unsupported Type "${result.type}"`);
			}
		}
		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://kuryana.vercel.app/id/${encodeURIComponent(id)}`;
		const fetchData = await fetch(searchUrl);
		// console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json();
		// console.debug(data);

		if (data.error) {
			throw Error(`MDB | Received error from ${this.apiName}: ${data.title} ${data.info}`);
		}

		const result = data.data;
		const type = result.details.type.toLowerCase();
		if (type.contains('movie')) {
			return new MovieModel({
				type: result.details.type,
				title: result.title,
				englishTitle: result.title,
				year: result.details.release_date?.split(',')[1]?.trim(),
				dataSource: 'My Drama List',
				url: `https://mydramalist.com/${id}`,
				id: id,

				plot: result.synopsis ?? '',
				genres: result.others.genres ?? [],
				director: result.others.director ? [result.others.director] : [],
				writer: [],
				studio: result.details.original_network ? [result.details.original_network] : [],
				duration: result.details.duration?.replace(/[. ]/g, '') ?? '0hr0min',
				onlineRating: Number.parseFloat(result.rating ?? 0),
				actors: result.casts.map((cast: any) => cast.name) ?? [],
				image: result.poster ?? '',

				released: true,
				streamingServices: [],
				premiere: this.plugin.dateFormatter.format(result.details.release_date, this.apiDateFormat) ?? 'unknown',

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as MovieModel);
		} else if (type.contains('series') || type.contains('show') || type.contains('drama')) {
			return new SeriesModel({
				type: result.details.type,
				title: result.title,
				englishTitle: result.title,
				year: result.details.aired?.split(',')[1]?.split('-')[0]?.trim(),
				dataSource: 'My Drama List',
				url: `https://mydramalist.com/${id}`,
				id: id,

				plot: result.synopsis ?? '',
				genres: result.others.genres ?? [],
				writer: [],
				studio: [result.details.original_network],
				episodes: result.details.episodes ?? 0,
				duration: result.details.duration.duration?.replace(/[. ]/g, '') ?? '0hr0min',
				onlineRating: Number.parseFloat(result.rating ?? 0),
				actors: result.casts.map((cast: any) => cast.name) ?? [],
				image: result.poster ?? '',

				released: true,
				streamingServices: [],
				airing: false,
				airedFrom: this.plugin.dateFormatter.format(result.details.aired?.split('-')[0]?.trim(), this.apiDateFormat) ?? 'unknown',
				airedTo: this.plugin.dateFormatter.format(result.details.aired?.split('-')[1]?.trim(), this.apiDateFormat) ?? 'unknown',

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as SeriesModel);
		} else {
			console.debug(`MDB | api "${this.apiName}" unsupported Type "${result.details.type}"`);
		}

		return;
	}
}
