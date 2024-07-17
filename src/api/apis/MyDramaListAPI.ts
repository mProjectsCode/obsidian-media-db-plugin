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
		//console.debug(data);

		const ret: MediaTypeModel[] = [];
		for (const result of data.results.dramas) {
			const type = result.type.toLowerCase();
			if (type.contains('movie')) {
				ret.push(
					new MovieModel({
						type: 'Movie',
						subType: result.type,
						title: result.title,
						englishTitle: result.title,
						year: result.year,
						dataSource: this.apiName,
						id: result.slug,
					} as MovieModel),
				);
			} else if (type.contains('series') || type.contains('show') || type.contains('drama') || type.contains('special')) {
				ret.push(
					new SeriesModel({
						type: 'Series',
						subType: result.type,
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
				type: 'Movie',
				subType: result.details.type,
				title: result.title,
				englishTitle: result.title,
				nativeTitle: result?.others?.native_title ?? '',
				aliases: result?.others?.also_known_as ?? [],
				year: result.details?.release_date?.split(',')[1]?.trim(),
				dataSource: 'My Drama List',
				url: `https://mydramalist.com/${id}`,
				id: id,
				country: result?.details?.country ?? '',
				content_rating: result?.details?.content_rating ?? '',

				plot: result.synopsis ?? '',
				genres: result.others.genres ?? [],
				mediaTags: result?.others?.tags ? result.others.tags.map((tag: string) => tag.replace(' (Vote or add tags)', '')) : [],
				relatedContent: result.others.related_content ?? '',
				director: result.others.director ? result.others.director : [],
				writer: result.others.screenwriter ?? [],
				studio: result.details.original_network ? [result.details.original_network] : [],
				duration: result.details.duration?.replace(/[. ]/g, '') ?? '',
				onlineRating: result.rating ? Number.parseFloat(result.rating) : '',
				votes: Number.parseInt(result.details.score.split('(')[1].split(' ')[2].replace(',', '')) ?? '',
				ranked: Number.parseInt(result.details.ranked.replace('#', '')) ?? '',
				popularity: Number.parseInt(result.details.popularity.replace('#', '')) ?? '',
				watchers: result.details.watchers ? Number.parseInt(result.details.watchers) : '',
				actors: result.casts.map((cast: any) => cast.name) ?? [],
				image: result.poster ?? '',

				released: true,
				streamingServices: [],
				premiere: this.plugin.dateFormatter.format(result.details.release_date, this.apiDateFormat) ?? '',

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			} as MovieModel);
		} else if (type.contains('series') || type.contains('show') || type.contains('drama') || type.contains('special')) {
			return new SeriesModel({
				type: 'Series',
				subType: result.details.type,
				title: result.title,
				nativeTitle: result?.others?.native_title ?? '',
				aliases: result?.others?.also_known_as ?? [],
				englishTitle: result.title,
				year: result.details.aired?.split(',')[1]?.split('-')[0]?.trim(),
				dataSource: 'My Drama List',
				url: `https://mydramalist.com/${id}`,
				id: id,
				country: result?.details?.country ?? '',
				content_rating: result?.details?.content_rating ?? '',

				plot: result.synopsis ?? '',
				genres: result.others.genres ?? [],
				mediaTags: result?.others?.tags ? result.others.tags.map((tag: string) => tag.replace(' (Vote or add tags)', '')) : [],
				relatedContent: result.others.related_content ?? '',
				director: result.others.director ? result.others.director : [],
				writer: result.others.screenwriter ?? [],
				studio: [result.details.original_network],
				episodes: result.details.episodes ?? 0,
				duration: result.details.duration?.replace(/[. ]/g, '') ?? '',
				onlineRating: result.rating ? Number.parseFloat(result.rating) : '',
				actors: result.casts.map((cast: any) => cast.name) ?? [],
				votes: Number.parseInt(result.details.score.split('(')[1].split(' ')[2].replace(',', '')) ?? '',
				ranked: Number.parseInt(result.details.ranked.replace('#', '')) ?? '',
				popularity: Number.parseInt(result.details.popularity.replace('#', '')) ?? '',
				watchers: result.details.watchers ? Number.parseInt(result.details.watchers) : '',
				image: result.poster ?? '',

				released: true,
				streamingServices: [],
				airing: false,
				airedFrom: this.plugin.dateFormatter.format(result.details.aired?.split('-')[0]?.trim(), this.apiDateFormat) ?? '',
				airedTo: this.plugin.dateFormatter.format(result.details.aired?.split('-')[1]?.trim(), this.apiDateFormat) ?? '',

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
