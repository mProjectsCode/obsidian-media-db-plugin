import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { WikiModel } from '../../models/WikiModel';
import { MediaType } from '../../utils/MediaType';

export class WikipediaAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'Wikipedia API';
		this.apiDescription = 'The API behind Wikipedia';
		this.apiUrl = 'https://www.wikipedia.com';
		this.types = [MediaType.Wiki];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=20&utf8=&format=json&origin=*`;
		const fetchData = await fetch(searchUrl);
		console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const ret: MediaTypeModel[] = [];

		for (const result of data.query.search) {
			ret.push(
				new WikiModel({
					type: 'wiki',
					title: result.title,
					englishTitle: result.title,
					year: '',
					dataSource: this.apiName,
					id: result.pageid,
				} as WikiModel),
			);
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=info&pageids=${encodeURIComponent(id)}&inprop=url&format=json&origin=*`;
		const fetchData = await fetch(searchUrl);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const result: any = Object.entries(data?.query?.pages)[0][1];

		const model = new WikiModel({
			type: 'wiki',
			title: result.title,
			englishTitle: result.title,
			year: '',
			dataSource: this.apiName,
			url: result.fullurl,
			id: result.pageid,

			wikiUrl: result.fullurl,
			lastUpdated: this.plugin.dateFormatter.format(result.touched, this.apiDateFormat),
			length: result.length,

			userData: {},
		} as WikiModel);

		return model;
	}
}
