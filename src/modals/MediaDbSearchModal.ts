import {App, ButtonComponent, SuggestModal} from 'obsidian';
import {APIResult} from '../api/APIResult';
import {sleep} from '../utils/utils';

export class MediaDbSearchModal extends SuggestModal<APIResult> {
	query: string;
	hasChanged: boolean;
	isBusy: boolean;
	okBtn: ButtonComponent;
	onChoose: (err: Error, result?: APIResult) => void;

	constructor(app: App, onChoose?: (err: Error, result?: APIResult) => void) {
		super(app);

		this.onChoose = onChoose;
		this.isBusy = false;
	}

	async search(force: boolean = false): Promise<APIResult[]> {
		if (!this.query) {
			return;
		}

		if (!this.isBusy || force) {
			this.isBusy = true;
			const thisQuery: string = this.query;

			console.log('query started with ' + thisQuery)
			await sleep(1000); // TODO: replace with real api call

			if (this.query === thisQuery) {
				this.isBusy = false;
				return [ // TODO: replace with real api result
					{title: thisQuery, type: 'movie', data: null} as APIResult,
					{title: 'test2', type: 'series', data: {episodes: 24}} as APIResult,
				];
			} else {
				return await this.search(true);
			}
		}
	}

	async getSuggestions(query: string): Promise<APIResult[]> {
		this.query = query;

		return await this.search();
	}

	renderSuggestion(item: APIResult, el: HTMLElement): void {
		el.createEl('div', {text: item.title});
		el.createEl('small', {text: item.type});
	}

	onChooseSuggestion(item: APIResult, evt: MouseEvent | KeyboardEvent): void {
		this.onChoose(null, item);
	}


	/*
	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Search Media DB' });

		const placeholder = 'Search by title';
		const textComponent = new TextComponent(contentEl);

		textComponent.setPlaceholder(placeholder);
		textComponent.onChange(value => (this.query = value));

		textComponent.inputEl.addEventListener('keydown', this.submitCallback.bind(this));
		textComponent.inputEl.style.width = '100%';

		contentEl.appendChild(textComponent.inputEl);
		textComponent.inputEl.focus();

		const resultsComponent = new

		new Setting(contentEl)
			.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
			.addButton(btn => {
				return (this.okBtn = btn
					.setButtonText('Ok')
					.setCta()
					.onClick(() => {
						this.search();
					}));
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
	*/
}
