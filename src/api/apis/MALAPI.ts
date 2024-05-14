import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import MediaDbPlugin from '../../main';
import { SeriesModel } from '../../models/SeriesModel';
import { MediaType } from '../../utils/MediaType';

export class MALAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI';
		this.apiDescription = 'A free API for Anime. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = [MediaType.Movie, MediaType.Series];
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
		console.debug(fetchData);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}
		const data = await fetchData.json();

		console.debug(data);

		const ret: MediaTypeModel[] = [];

		for (const result of data.data) {
			const type = this.typeMappings.get(result.type?.toLowerCase());
			if (type === undefined) {
				ret.push(
					new MovieModel({
						subType: '',
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year: result.year ?? result.aired?.prop?.from?.year ?? '',
						dataSource: this.apiName,
						id: result.mal_id,
					} as MovieModel),
				);
			}
			if (type === 'movie' || type === 'special') {
				ret.push(
					new MovieModel({
						subType: type,
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year: result.year ?? result.aired?.prop?.from?.year ?? '',
						dataSource: this.apiName,
						id: result.mal_id,
					} as MovieModel),
				);
			} else if (type === 'series' || type === 'ova') {
				ret.push(
					new SeriesModel({
						subType: type,
						title: result.title,
						englishTitle: result.title_english ?? result.title,
						year: result.year ?? result.aired?.prop?.from?.year ?? '',
						dataSource: this.apiName,
						id: result.mal_id,
					} as SeriesModel),
				);
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://api.jikan.moe/v4/anime/${encodeURIComponent(id)}/full`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const result = data.data;

		const type = this.typeMappings.get(result.type?.toLowerCase());
		if (type === undefined) {
			const model = new MovieModel({
				subType: '',
				title: result.title,
				englishTitle: result.title_english ?? result.title,
				year: result.year ?? result.aired?.prop?.from?.year ?? '',
				dataSource: this.apiName,
				url: result.url,
				id: result.mal_id,

				plot: result.synopsis ? result.synopsis.replace('[Written by MAL Rewrite]', '').trim() : '',
				genres: result.genres?.map((x: any) => x.name) ?? [],
				director: [],
				writer: [],
				studio: result.studios?.map((x: any) => x.name).join(', ') ?? 'unknown',
				duration: result.duration ?? 'unknown',
				onlineRating: result.score ?? 0,
				actors: [],
				image: this.plugin.settings.embedPosters ? `![](${result.images?.jpg?.image_url})` ?? '' : result.images?.jpg?.image_url ?? '',

				released: true,
				premiere: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat) ?? 'unknown',
				streamingServices: result.streaming?.map((x: any) => x.name) ?? [],

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as MovieModel);

			return model;
		}

		if (type === 'movie' || type === 'special') {
			const model = new MovieModel({
				subType: type,
				title: result.title,
				englishTitle: result.title_english ?? result.title,
				year: result.year ?? result.aired?.prop?.from?.year ?? '',
				dataSource: this.apiName,
				url: result.url,
				id: result.mal_id,

				plot: result.synopsis,
				genres: result.genres?.map((x: any) => x.name) ?? [],
				director: [],
				writer: [],
				studio: result.studios?.map((x: any) => x.name).join(', ') ?? 'unknown',
				duration: result.duration ?? 'unknown',
				onlineRating: result.score ?? 0,
				actors: [],
				image: this.plugin.settings.embedPosters ? `![](${result.images?.jpg?.image_url})` ?? '' : result.images?.jpg?.image_url ?? '',

				released: true,
				premiere: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat) ?? 'unknown',
				streamingServices: result.streaming?.map((x: any) => x.name) ?? [],

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as MovieModel);

			return model;
		} else if (type === 'series' || type === 'ova') {
			const model = new SeriesModel({
				subType: type,
				title: result.title,
				englishTitle: result.title_english ?? result.title,
				year: result.year ?? result.aired?.prop?.from?.year ?? '',
				dataSource: this.apiName,
				url: result.url,
				id: result.mal_id,

				plot: result.synopsis ? result.synopsis.replace('[Written by MAL Rewrite]', '').trim() : '',
				genres: result.genres?.map((x: any) => x.name) ?? [],
				writer: [],
				studio: result.studios?.map((x: any) => x.name) ?? [],
				episodes: result.episodes,
				duration: result.duration ?? 'unknown',
				onlineRating: result.score ?? 0,
				streamingServices: result.streaming?.map((x: any) => x.name) ?? [],
				image: this.plugin.settings.embedPosters ? `![](${result.images?.jpg?.image_url})` ?? '' : result.images?.jpg?.image_url ?? '',

				released: true,
				airedFrom: this.plugin.dateFormatter.format(result.aired?.from, this.apiDateFormat) ?? 'unknown',
				airedTo: this.plugin.dateFormatter.format(result.aired?.to, this.apiDateFormat) ?? 'unknown',
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
