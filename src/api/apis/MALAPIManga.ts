import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { MangaModel } from '../../models/MangaModel';
import { MediaType } from '../../utils/MediaType';

export class MALAPIManga extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'MALAPI Manga';
		this.apiDescription = 'A free API for Manga. Some results may take a long time to load.';
		this.apiUrl = 'https://jikan.moe/';
		this.types = [MediaType.Manga];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('manga', 'manga');
		this.typeMappings.set('manhwa', 'manhwa');
		this.typeMappings.set('doujinshi', 'doujin');
		this.typeMappings.set('one-shot', 'oneshot');
		this.typeMappings.set('manhua', 'manhua');
		this.typeMappings.set('light novel', 'light-novel');
		this.typeMappings.set('novel', 'novel');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=20${this.plugin.settings.sfwFilter ? '&sfw' : ''}`;

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
			ret.push(
				new MangaModel({
					subType: type,
					title: result.title,
					plot: result.synopsis,
					englishTitle: result.title_english ?? result.title,
					alternateTitles: result.titles?.map((x: any) => x.title) ?? [],
					year: result.year ?? result.published?.prop?.from?.year ?? '',
					dataSource: this.apiName,
					url: result.url,
					id: result.mal_id,

					genres: result.genres?.map((x: any) => x.name) ?? [],
					authors: result.authors?.map((x: any) => x.name) ?? [],
					chapters: result.chapters,
					volumes: result.volumes,
					onlineRating: result.score ?? 0,
					image: this.plugin.settings.embedPosters ? `![](${result.images?.jpg?.image_url})` ?? '' : result.images?.jpg?.image_url ?? '',

					released: true,
					publishedFrom: new Date(result.published?.from).toLocaleDateString() ?? 'unknown',
					publishedTo: new Date(result.published?.to).toLocaleDateString() ?? 'unknown',
					status: result.status,

					userData: {
						watched: false,
						lastWatched: '',
						personalRating: 0,
					},
				} as MangaModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://api.jikan.moe/v4/manga/${encodeURIComponent(id)}/full`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const result = data.data;

		const type = this.typeMappings.get(result.type?.toLowerCase());
		const model = new MangaModel({
			subType: type,
			title: result.title,
			englishTitle: result.title_english ?? result.title,
			alternateTitles: result.titles?.map((x: any) => x.title) ?? [],
			year: result.year ?? result.published?.prop?.from?.year ?? '',
			dataSource: this.apiName,
			url: result.url,
			id: result.mal_id,

			plot: (result.synopsis ?? 'unknown').replace(/"/g, "'") ?? 'unknown',
			genres: result.genres?.map((x: any) => x.name) ?? [],
			authors: result.authors?.map((x: any) => x.name) ?? [],
			chapters: result.chapters,
			volumes: result.volumes,
			onlineRating: result.score ?? 0,
			image: this.plugin.settings.embedPosters ? `![](${result.images?.jpg?.image_url})` ?? '' : result.images?.jpg?.image_url ?? '',

			released: true,
			publishedFrom: new Date(result.published?.from).toLocaleDateString() ?? 'unknown',
			publishedTo: new Date(result.published?.to).toLocaleDateString() ?? 'unknown',
			status: result.status,

			userData: {
				watched: false,
				lastWatched: '',
				personalRating: 0,
			},
		} as MangaModel);

		return model;
	}
}
