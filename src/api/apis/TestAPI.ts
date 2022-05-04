import {APIModel} from '../APIModel';
import {MediaTypeModel} from '../../models/MediaTypeModel';

export class TestAPI extends APIModel {
	constructor() {
		super();
		this.apiName = 'testAPI';
		this.apiUrl = 'www.test.api';
		this.types = ['test'];
	}

	async getByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried`);

		return [
			{title: 'test1', type: this.types[0], dataSource: this.apiName} as MediaTypeModel,
			{title: 'test2', type: this.types[0], dataSource: this.apiName} as MediaTypeModel,
		];
	}

	getMataDataFromResult(item: MediaTypeModel): string {
		if (item.dataSource !== this.apiUrl) {
			return '';
		}

		return '';
	}
}
