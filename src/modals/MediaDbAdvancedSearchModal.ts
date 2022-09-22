import {App, ButtonComponent, Component, Modal, Notice, Setting, TextComponent, ToggleComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {debugLog} from '../utils/Utils';
import MediaDbPlugin from '../main';

export class MediaDbAdvancedSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	plugin: MediaDbPlugin;
	searchBtn: ButtonComponent;
	selectedApis: {name: string, selected: boolean}[];
	onSubmit: (res: {query: string, apis: string[]}, err?: Error) => void;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit?: (res: {query: string, apis: string[]}, err?: Error) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApis = [];
		for (const api of this.plugin.apiManager.apis) {
			this.selectedApis.push({name: api.apiName, selected: false});
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

		const apis: string[] = this.selectedApis.filter(x => x.selected).map(x => x.name);

		if (apis.length === 0) {
			new Notice('MDB | No API selected');
			return;
		}

		if (!this.isBusy) {
			try {
				this.isBusy = true;
				this.searchBtn.setDisabled(false);
				this.searchBtn.setButtonText('Searching...');

				this.onSubmit({query: this.query, apis: apis});
			} catch (e) {
				this.onSubmit(null, e);
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

		contentEl.createDiv({cls: 'media-db-plugin-spacer'});
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
			apiToggleComponent.setValue(this.selectedApis.find(x => x.name === api.apiName).selected);
			apiToggleComponent.onChange((value) => {
				this.selectedApis.find(x => x.name === api.apiName).selected = value;
			});
			apiToggleComponentWrapper.appendChild(apiToggleComponent.toggleEl);
		}

		contentEl.createDiv({cls: 'media-db-plugin-spacer'});

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
