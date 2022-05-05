import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';
import {MovieModel} from '../../models/MovieModel';

export class TestAPI extends APIModel {
	constructor() {
		super();
		this.apiName = 'testAPI';
		this.apiUrl = 'www.test.api';
		this.types = ['test'];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried`);

		return [
			new MovieModel({title: 'test_1', type: this.types[0], dataSource: this.apiName}),
			new MovieModel({title: 'test_2', type: this.types[0], dataSource: this.apiName, producer: 'Max Musterman'}),
		];
	}

	async getById(item: MediaTypeModel): Promise<MediaTypeModel> {
		return item;
	}
}
