import type { ButtonComponent } from 'obsidian';
import { DropdownComponent, Modal, Notice, Setting, TextComponent } from 'obsidian';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { IdSearchModalData, IdSearchModalOptions } from 'packages/obsidian/src/utils/ModalHelper';
import { ID_SEARCH_MODAL_DEFAULT_OPTIONS } from 'packages/obsidian/src/utils/ModalHelper';

export class MediaDbIdSearchModal extends Modal {
	plugin: MediaDbPlugin;

	query: string;
	isBusy: boolean;
	title: string;
	selectedApi: string;

	searchBtn?: ButtonComponent;

	submitCallback?: (res: IdSearchModalData, err?: Error) => void;
	closeCallback?: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin, idSearchModalOptions: IdSearchModalOptions) {
		idSearchModalOptions = Object.assign({}, ID_SEARCH_MODAL_DEFAULT_OPTIONS, idSearchModalOptions);
		super(plugin.app);

		this.plugin = plugin;
		this.title = idSearchModalOptions.modalTitle ?? '';
		this.selectedApi = idSearchModalOptions.preselectedAPI ?? plugin.apiManager.apis[0]?.apiName ?? '';
		this.query = idSearchModalOptions.prefilledSearchString ?? '';
		this.isBusy = false;
	}

	setSubmitCb(submitCallback: (res: IdSearchModalData, err?: Error) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCb(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	keyPressCallback(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopImmediatePropagation();
			void this.search();
		}
	}

	async search(): Promise<void> {
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
			this.searchBtn?.setDisabled(true);
			this.searchBtn?.setButtonText('Searching...');
			this.searchBtn?.buttonEl.addClass('media-db-plugin-button-loading');

			this.submitCallback?.({ query: this.query, api: this.selectedApi });
		}
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		const placeholder = 'Search by id';
		const searchComponent = new TextComponent(contentEl);
		searchComponent.inputEl.addClass('media-db-plugin-search-input');
		searchComponent.setPlaceholder(placeholder);
		searchComponent.setValue(this.query);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.keyPressCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const apiSelectorWrapper = contentEl.createDiv({ cls: 'media-db-plugin-list-wrapper' });
		const apiSelectorTExtWrapper = apiSelectorWrapper.createDiv({ cls: 'media-db-plugin-list-text-wrapper' });
		apiSelectorTExtWrapper.createSpan({ text: 'API to search', cls: 'media-db-plugin-list-text' });

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.plugin.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorComponent.setValue(this.selectedApi);
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
					void this.search();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
				this.searchBtn = btn;
			});
	}

	onClose(): void {
		this.closeCallback?.();
		const { contentEl } = this;
		contentEl.empty();
	}
}
