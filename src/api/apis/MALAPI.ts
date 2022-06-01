import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import {MovieModel} from '../../models/MovieModel';
import MediaDbPlugin from '../../main';
import {SeriesModel} from '../../models/SeriesModel';
import {debugLog} from '../../utils/Utils';

export class MALAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI';
		this.apiDescription = 'A free API for Anime. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = ['movie', 'series', 'anime'];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('movie', 'movie');
		this.typeMappings.set('special', 'special');
		this.typeMappings.set('tv', 'series');
		this.typeMappings.set('ova', 'ova');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=20${this.plugin.settings.sfwFilter ? '&sfw' : ''}`;

		const fetchData = await fetch(searchUrl);
		debugLog(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json();

		debugLog(data);

		let ret: MediaTypeModel[] = [];

		for (const result of data.data) {
			const type = this.typeMappings.get(result.type.toLowerCase());
			if (type === undefined) {
				continue;
			}
			if (type === 'movie' || type === 'special') {
				ret.push(new MovieModel({
					type: type,
					title: result.title,
					englishTitle: result.title_english ?? result.title,
					year: result.year ?? result.aired?.prop?.from?.year ?? '',
					dataSource: this.apiName,
					id: result.mal_id,
				} as MovieModel));
			} else if (type === 'series' || type === 'ova') {
				ret.push(new SeriesModel({
					type: type,
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

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://api.jikan.moe/v4/anime/${encodeURIComponent(id)}`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		debugLog(data);
		const result = data.data;

		const type = this.typeMappings.get(result.type.toLowerCase());
		if (type === undefined) {
			throw Error(`${result.type.toLowerCase()} is an unsupported type.`);
		}

		if (type === 'movie' || type === 'special') {
			const model = new MovieModel({
				type: type,
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

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as MovieModel);

			return model;
		} else if (type === 'series' || type === 'ova') {
			const model = new SeriesModel({
				type: type,
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

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as SeriesModel);

			return model;
		}

		return;
	}
}
