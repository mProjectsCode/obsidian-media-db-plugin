import {App, SuggestModal} from 'obsidian';
import {APIRequestResult} from '../api/APIRequestResult';
import {APIManager} from '../api/APIManager';

export class MediaDbSearchModal extends SuggestModal<APIRequestResult> {
	query: string;
	isBusy: boolean;
	apiManager: APIManager;
	onChoose: (err: Error, result?: APIRequestResult) => void;

	constructor(app: App, apiManager: APIManager, onChoose?: (err: Error, result?: APIRequestResult) => void) {
		super(app);

		this.apiManager = apiManager;
		this.onChoose = onChoose;
		this.isBusy = false;
	}

	async search(force: boolean = false): Promise<APIRequestResult[]> {
		if (!this.query) {
			return;
		}

		if (!this.isBusy || force) {
			this.isBusy = true;
			const thisQuery: string = this.query;

			console.log('MDB | query started with ' + thisQuery);

			const res = await this.apiManager.query(thisQuery);

			// console.log(res)

			// await sleep(1000);

			if (this.query === thisQuery) {
				this.isBusy = false;

				return res;

				// return [
				// 	{title: thisQuery, type: 'movie', data: null} as APIRequestResult,
				// 	{title: 'test2', type: 'series', data: {episodes: 24}} as APIRequestResult,
				// ];
			} else {
				return await this.search(true);
			}
		}
	}

	async getSuggestions(query: string): Promise<APIRequestResult[]> {
		this.query = query;

		return await this.search();
	}

	renderSuggestion(item: APIRequestResult, el: HTMLElement): void {
		el.createEl('div', {text: item.title});
		el.createEl('small', {text: item.type});
	}

	onChooseSuggestion(item: APIRequestResult, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(null, item);
	}
}
