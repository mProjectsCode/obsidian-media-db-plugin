import {APIModel} from '../api/APIModel';
import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';

export class TestAPI extends APIModel {
	plugin: MediaDbPlugin;


	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'TestAPI';
		this.apiDescription = 'A test API for automated testing.';
		this.apiUrl = '';
		this.types = [];
	}


	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {
		return undefined;
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		return [] as MediaTypeModel[];
	}
}
