import {APIModel} from '../APIModel';
import {APIRequestResult} from '../APIRequestResult';

export class TestAPI extends APIModel {
	constructor() {
		super();
		this.name = 'testAPI';
		this.types = ['test'];
	}

	async getByTitle(title: string): Promise<APIRequestResult[]> {
		console.log(`MDB | api "${this.name}" queried`);

		return [
			{title: 'test1', type: this.types[0], apiName: this.name, data: {length: 126}} as APIRequestResult,
			{title: 'test2', type: this.types[0], apiName: this.name, description: 'some test description', data: {}} as APIRequestResult,
		];
	}

	getMataDataFromResult(item: APIRequestResult): string {
		if (item.apiName !== this.name) {
			return '';
		}

		return '';
	}
}
