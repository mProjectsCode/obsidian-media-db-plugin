import {App, ButtonComponent, Component, Modal, Notice, Setting, TextComponent, ToggleComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {debugLog} from '../utils/Utils';
import MediaDbPlugin from '../main';

export class MediaDbAdvancedSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	plugin: MediaDbPlugin;
	searchBtn: ButtonComponent;
	selectedApis: any;
	onSubmit: (err: Error, result?: MediaTypeModel[]) => void;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit?: (err: Error, result?: MediaTypeModel[]) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApis = [];
		for (const api of this.plugin.apiManager.apis) {
			this.selectedApis[api.apiName] = false;
		}
	}

	submitCallback(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.search();
		}
	}

	async search(): Promise<MediaTypeModel[]> {

		debugLog(this.selectedApis);

		if (!this.query || this.query.length < 3) {
			new Notice('MDB | Query to short');
			return;
		}

		let selectedAPICount = 0;
		for (const api in this.selectedApis) {
			if (this.selectedApis[api]) {
				selectedAPICount += 1;
			}
		}

		if (selectedAPICount === 0) {
			new Notice('MDB | No API selected');
			return;
		}

		if (!this.isBusy) {
			try {
				this.isBusy = true;
				this.searchBtn.setDisabled(false);
				this.searchBtn.setButtonText('Searching...');

				console.log(`MDB | query started with title ${this.query}`);

				const res = await this.plugin.apiManager.query(this.query, this.selectedApis);
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
		for (const api of this.plugin.apiManager.apis) {
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
