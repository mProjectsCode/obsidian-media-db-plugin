import {ButtonComponent, Modal, Notice, Setting, TextComponent, ToggleComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';

export class MediaDbAdvancedSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	plugin: MediaDbPlugin;
	searchBtn: ButtonComponent;
	selectedApis: { name: string, selected: boolean }[];
	submitCallback?: (res: { query: string, apis: string[] }) => void;
	closeCallback?: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.selectedApis = [];
		for (const api of this.plugin.apiManager.apis) {
			this.selectedApis.push({name: api.apiName, selected: false});
		}
	}

	setSubmitCallback(submitCallback: (res: { query: string, apis: string[] }) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	keyPressCallback(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.search();
		}
	}

	async search(): Promise<MediaTypeModel[]> {
		if (!this.query || this.query.length < 3) {
			new Notice('MDB | Query too short');
			return;
		}

		const apis: string[] = this.selectedApis.filter(x => x.selected).map(x => x.name);

		if (apis.length === 0) {
			new Notice('MDB | No API selected');
			return;
		}

		if (!this.isBusy) {
			this.isBusy = true;
			this.searchBtn.setDisabled(false);
			this.searchBtn.setButtonText('Searching...');

			this.submitCallback({query: this.query, apis: apis});
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
		searchComponent.inputEl.addEventListener('keydown', this.keyPressCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createDiv({cls: 'media-db-plugin-spacer'});
		contentEl.createEl('h3', {text: 'APIs to search'});

		// const apiToggleComponents: Component[] = [];
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
			.addButton(btn => {
				btn.setButtonText('Cancel');
				btn.onClick(() => this.close());
				btn.buttonEl.addClass('media-db-plugin-button');
			})
			.addButton(btn => {
				btn.setButtonText('Ok');
				btn.setCta();
				btn.onClick(() => {
					this.search();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
				this.searchBtn = btn;
			});
	}

	onClose() {
		this.closeCallback();
		const {contentEl} = this;
		contentEl.empty();
	}

}
