import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import {MovieModel} from '../../models/MovieModel';
import MediaDbPlugin from '../../main';
import {SeriesModel} from '../../models/SeriesModel';

export class MALAPI extends APIModel {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI';
		this.apiDescription = 'A free API for Anime. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = ['movie', 'series', 'anime'];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried`);

		const searchUrl = `https://api.jikan.moe/v4/anime?q=${title}&limit=20${this.plugin.settings.sfwFilter ? '&sfw' : ''}`;

		const fetchData = await fetch(searchUrl);
		console.log(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json();

		console.log(data);

		let ret: MediaTypeModel[] = [];

		for (const result of data.data) {
			if (result.type.toLowerCase() === 'movie' || result.type.toLowerCase() === 'special') {
				ret.push(new MovieModel({
					type: result.type,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					year: result.year ?? result.aired?.prop?.from?.year ?? '',
					dataSource: this.apiName,
					id: result.mal_id,
				} as MovieModel));
			} else if (result.type.toLowerCase() === 'tv' || result.type.toLowerCase() === 'ova') {
				ret.push(new SeriesModel({
					type: result.type,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					year: result.year ?? result.aired?.prop?.from?.year ?? '',
					dataSource: this.apiName,
					id: result.mal_id,
				} as SeriesModel));
			}
		}

		return ret;
	}

	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {

		const searchUrl = `https://api.jikan.moe/v4/anime/${item.id}`;

		const fetchData = await fetch(searchUrl);
		if (fetchData.status !== 200) {
			throw Error(`Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.log(data);
		const result = data.data;

		if (result.type.toLowerCase() === 'movie' || result.type.toLowerCase() === 'special') {
			const model = new MovieModel({
				type: result.type,
				title: result.title,
				englishTitle: result.title_english ?? result.title,
				year: result.year ?? result.aired?.prop?.from?.year ?? '',
				dataSource: this.apiName,
				url: result.url,
				id: result.mal_id,

				genres: result.genres?.map((x: any) => x.name) ?? [],
				producer: result.studios?.map((x: any) => x.name).join(', ') ?? 'unknown',
				duration: result.duration ?? 'unknown',
				onlineRating: result.score ?? 0,
				image: result.images?.jpg?.image_url ?? '',

				released: true,
				premiere: (new Date(result.aired?.from)).toLocaleDateString() ?? 'unknown',

				watched: false,
				lastWatched: '',
				personalRating: 0,
			} as MovieModel);

			return model;
		} else if (result.type.toLowerCase() === 'tv' || result.type.toLowerCase() === 'ova') {
			const model = new SeriesModel({
				type: result.type,
				title: result.title,
				englishTitle: result.title_english ?? result.title,
				year: result.year ?? result.aired?.prop?.from?.year ?? '',
				dataSource: this.apiName,
				url: result.url,
				id: result.mal_id,

				genres: result.genres?.map((x: any) => x.name) ?? [],
				studios: result.studios?.map((x: any) => x.name) ?? [],
				episodes: result.episodes,
				duration: result.duration ?? 'unknown',
				onlineRating: result.score ?? 0,
				image: result.images?.jpg?.image_url ?? '',

				released: true,
				airedFrom: (new Date(result.aired?.from)).toLocaleDateString() ?? 'unknown',
				airedTo: (new Date(result.aired?.to)).toLocaleDateString() ?? 'unknown',
				airing: result.airing,

				watched: false,
				lastWatched: '',
				personalRating: 0,
			} as SeriesModel);

			return model;
		}

		return;
	}
}
