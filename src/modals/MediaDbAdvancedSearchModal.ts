import {App, ButtonComponent, Component, Modal, Setting, TextComponent, ToggleComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {APIManager} from '../api/APIManager';

export class MediaDbAdvancedSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	apiManager: APIManager;
	searchBtn: ButtonComponent;
	selectedApis: any;
	onSubmit: (err: Error, result?: MediaTypeModel[]) => void;

	constructor(app: App, apiManager: APIManager, onSubmit?: (err: Error, result?: MediaTypeModel[]) => void) {
		super(app);
		this.apiManager = apiManager;
		this.onSubmit = onSubmit;
		this.selectedApis = [];
		for (const api of this.apiManager.apis) {
			this.selectedApis[api.apiName] = true;
		}
	}

	submitCallback(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.search();
		}
	}

	async search(): Promise<MediaTypeModel[]> {

		console.log(this.selectedApis);

		if (!this.query) {
			return;
		}

		if (!this.isBusy) {
			try {
				this.isBusy = true;
				this.searchBtn.setDisabled(false);
				this.searchBtn.setButtonText('Searching...');

				console.log('MDB | query started with ' + this.query);

				const res = await this.apiManager.query(this.query, this.selectedApis);

				// console.log(res)

				this.onSubmit(null, res);
			} catch (e) {
				this.onSubmit(e);
			} finally {
				this.close();
			}
		}
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: 'Search media db'});

		const placeholder = 'Search by title';
		const searchComponent = new TextComponent(contentEl);
		searchComponent.inputEl.style.width = '100%';
		searchComponent.setPlaceholder(placeholder);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.submitCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createEl('h3', {text: 'APIs to search'});

		const apiToggleComponents: Component[] = [];
		for (const api of this.apiManager.apis) {
			const apiToggleListElementWrapper = contentEl.createEl('div', {cls: 'media-db-plugin-list-wrapper'});

			const apiToggleTextWrapper = apiToggleListElementWrapper.createEl('div', {cls: 'media-db-plugin-list-text-wrapper'});
			apiToggleTextWrapper.createEl('span', {text: api.apiName, cls: 'media-db-plugin-list-text'});
			apiToggleTextWrapper.createEl('small', {text: api.apiDescription, cls: 'media-db-plugin-list-text'});

			const apiToggleComponentWrapper = apiToggleListElementWrapper.createEl('div', {cls: 'media-db-plugin-list-toggle'});

			const apiToggleComponent = new ToggleComponent(apiToggleComponentWrapper);
			apiToggleComponent.setTooltip(api.apiName);
			apiToggleComponent.setValue(this.selectedApis[api.apiName]);
			apiToggleComponent.onChange((value) => {
				this.selectedApis[api.apiName] = value;
			});
			apiToggleComponentWrapper.appendChild(apiToggleComponent.toggleEl);
		}


		new Setting(contentEl)
			.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
			.addButton(btn => {
				return (this.searchBtn = btn
					.setButtonText('Ok')
					.setCta()
					.onClick(() => {
						this.search();
					}));
			});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}


}
