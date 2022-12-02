import { ButtonComponent, DropdownComponent, Modal, Notice, Setting, TextComponent } from 'obsidian';
import { MediaTypeModel } from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import { ID_SEARCH_MODAL_DEFAULT_OPTIONS, IdSearchModalData, IdSearchModalOptions } from '../utils/ModalHelper';

export class MediaDbIdSearchModal extends Modal {
	plugin: MediaDbPlugin;

	query: string;
	isBusy: boolean;
	title: string;
	selectedApi: string;

	searchBtn: ButtonComponent;

	submitCallback?: (res: IdSearchModalData, err?: Error) => void;
	closeCallback?: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin, idSearchModalOptions: IdSearchModalOptions) {
		idSearchModalOptions = Object.assign({}, ID_SEARCH_MODAL_DEFAULT_OPTIONS, idSearchModalOptions);
		super(plugin.app);

		this.plugin = plugin;
		this.title = idSearchModalOptions.modalTitle;
		this.selectedApi = idSearchModalOptions.preselectedAPI || plugin.apiManager.apis[0].apiName;
	}

	setSubmitCallback(submitCallback: (res: IdSearchModalData, err?: Error) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	keyPressCallback(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			this.search();
		}
	}

	async search(): Promise<MediaTypeModel> {
		if (!this.query) {
			new Notice('MDB | no Id entered');
			return;
		}

		if (!this.selectedApi) {
			new Notice('MDB | No API selected');
			return;
		}

		if (!this.isBusy) {
			this.isBusy = true;
			this.searchBtn.setDisabled(false);
			this.searchBtn.setButtonText('Searching...');

			this.submitCallback({ query: this.query, api: this.selectedApi });
		}
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		const placeholder = 'Search by id';
		const searchComponent = new TextComponent(contentEl);
		searchComponent.inputEl.style.width = '100%';
		searchComponent.setPlaceholder(placeholder);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.keyPressCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const apiSelectorWrapper = contentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });
		const apiSelectorTExtWrapper = apiSelectorWrapper.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
		apiSelectorTExtWrapper.createEl('span', { text: 'API to search', cls: 'media-db-plugin-list-text' });

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.plugin.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorWrapper.appendChild(apiSelectorComponent.selectEl);

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

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

	onClose(): void {
		this.closeCallback();
		const { contentEl } = this;
		contentEl.empty();
	}
}
