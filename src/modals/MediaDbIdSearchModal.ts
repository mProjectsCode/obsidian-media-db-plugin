import {App, ButtonComponent, DropdownComponent, Modal, Notice, Setting, TextComponent} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {APIManager} from '../api/APIManager';
import {debugLog} from '../utils/Utils';

export class MediaDbIdSearchModal extends Modal {
	query: string;
	isBusy: boolean;
	apiManager: APIManager;
	searchBtn: ButtonComponent;
	selectedApi: string;
	onSubmit: (err: Error, result?: MediaTypeModel) => void;

	constructor(app: App, apiManager: APIManager, onSubmit?: (err: Error, result?: MediaTypeModel) => void) {
		super(app);
		this.apiManager = apiManager;
		this.onSubmit = onSubmit;
		this.selectedApi = '';
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

				console.log(`MDB | query started with id ${this.query}`);

				const api = this.apiManager.getApiByName(this.selectedApi);
				if (!api) {
					this.onSubmit(new Error('the selected api does not exist'));
				}
				const res = await api.getById({id: this.query} as MediaTypeModel); // TODO: fix jank
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

		contentEl.createEl('h2', {text: 'Search media db by id'});

		const placeholder = 'Search by id';
		const searchComponent = new TextComponent(contentEl);
		searchComponent.inputEl.style.width = '100%';
		searchComponent.setPlaceholder(placeholder);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.submitCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		const apiSelectorWrapper = contentEl.createEl('div', {cls: 'media-db-plugin-list-wrapper'});
		const apiSelectorTExtWrapper = apiSelectorWrapper.createEl('div', {cls: 'media-db-plugin-list-text-wrapper'});
		apiSelectorTExtWrapper.createEl('span', {text: 'API to search', cls: 'media-db-plugin-list-text'});

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorWrapper.appendChild(apiSelectorComponent.selectEl);

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
