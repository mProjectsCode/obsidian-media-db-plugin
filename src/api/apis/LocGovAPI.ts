import { APIModel } from '../APIModel';
import { MediaTypeModel } from '../../models/MediaTypeModel';
import MediaDbPlugin from '../../main';
import { debugLog } from '../../utils/Utils';

// WIP
export class LocGovAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'loc.gov API';
		this.apiDescription = 'A free API for the Library of Congress collections.';
		this.apiUrl = 'https://libraryofcongress.github.io/data-exploration/index.html';
		this.types = [];
		this.typeMappings = new Map<string, string>();
		// this.typeMappings.set('movie', 'movie');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		const searchUrl = `https://www.loc.gov/search/?q=${encodeURIComponent(title)}&fo=json&c=20`;
		const fetchData = await fetch(searchUrl);
		console.debug(fetchData);

		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		let ret: MediaTypeModel[] = [];

		throw new Error('MDB | Under construction, API implementation not finished');

		// return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const searchUrl = `https://www.loc.gov/item/${encodeURIComponent(id)}/?fo=json`;
		const fetchData = await fetch(searchUrl);
		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from an API.`);
		}

		const data = await fetchData.json();
		console.debug(data);
		const result = data.data;

		const type = this.typeMappings.get(result.type.toLowerCase());
		if (type === undefined) {
			throw Error(`${result.type.toLowerCase()} is an unsupported type.`);
		}

		throw new Error('MDB | Under construction, API implementation not finished');

		// return;
	}
}
