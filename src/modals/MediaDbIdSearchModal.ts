import {App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, TextComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {debugLog} from '../utils/Utils';
import MediaDbPlugin from '../main';

export class MediaDbIdSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	plugin: MediaDbPlugin;
	searchBtn: ButtonComponent;
	selectedApi: string;
	onSubmit: (res: {query: string, api: string}, err?: Error) => void;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit?: (res: {query: string, api: string}, err?: Error) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApi = plugin.apiManager.apis[0].apiName;
	}

	submitCallback(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			this.search();
		}
	}

	async search(): Promise<MediaTypeModel> {

		debugLog(this.selectedApi);

		if (!this.query) {
			new Notice('MDB | no Id entered');
			return;
		}

		if (!this.selectedApi) {
			new Notice('MDB | No API selected');
			return;
		}

		if (!this.isBusy) {
			try {
				this.isBusy = true;
				this.searchBtn.setDisabled(false);
				this.searchBtn.setButtonText('Searching...');

				this.onSubmit({query: this.query, api: this.selectedApi});
			} catch (e) {
				this.onSubmit(null, e);
			} finally {
				this.close();
			}
		}
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: 'Search media db by id'});

		const placeholder = 'Search by id';
		const searchComponent = new TextComponent(contentEl);
		searchComponent.inputEl.style.width = '100%';
		searchComponent.setPlaceholder(placeholder);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.submitCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createDiv({cls: 'media-db-plugin-spacer'});

		const apiSelectorWrapper = contentEl.createEl('div', {cls: 'media-db-plugin-list-wrapper'});
		const apiSelectorTExtWrapper = apiSelectorWrapper.createEl('div', {cls: 'media-db-plugin-list-text-wrapper'});
		apiSelectorTExtWrapper.createEl('span', {text: 'API to search', cls: 'media-db-plugin-list-text'});

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.plugin.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorWrapper.appendChild(apiSelectorComponent.selectEl);

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
