import { ButtonComponent, Modal, Notice, Setting, TextComponent, ToggleComponent } from 'obsidian';
import { MediaTypeModel } from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import { SEARCH_MODAL_DEFAULT_OPTIONS, SearchModalData, SearchModalOptions } from '../utils/ModalHelper';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { unCamelCase } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class MediaDbSearchModal extends Modal {
	plugin: MediaDbPlugin;

	query: string;
	isBusy: boolean;
	title: string;
	selectedTypes: { name: MediaType; selected: boolean }[];

	searchBtn: ButtonComponent;

	submitCallback?: (res: SearchModalData) => void;
	closeCallback?: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin, searchModalOptions: SearchModalOptions) {
		searchModalOptions = Object.assign({}, SEARCH_MODAL_DEFAULT_OPTIONS, searchModalOptions);
		super(plugin.app);

		this.plugin = plugin;
		this.selectedTypes = [];
		this.title = searchModalOptions.modalTitle;
		this.query = searchModalOptions.prefilledSearchString;

		for (const mediaType of MEDIA_TYPES) {
			this.selectedTypes.push({ name: mediaType, selected: searchModalOptions.preselectedTypes.contains(mediaType) });
		}
	}

	setSubmitCallback(submitCallback: (res: SearchModalData) => void): void {
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

	async search(): Promise<MediaTypeModel[]> {
		if (!this.query || this.query.length < 3) {
			new Notice('MDB | Query too short');
			return;
		}

		const types: MediaType[] = this.selectedTypes.filter(x => x.selected).map(x => x.name);

		if (types.length === 0) {
			new Notice('MDB | No Type selected');
			return;
		}

		if (!this.isBusy) {
			this.isBusy = true;
			this.searchBtn.setDisabled(false);
			this.searchBtn.setButtonText('Searching...');

			this.submitCallback({ query: this.query, types: types });
		}
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		const placeholder = 'Search by title';
		const searchComponent = new TextComponent(contentEl);
		let currentToggle: ToggleComponent = null;

		searchComponent.inputEl.style.width = '100%';
		searchComponent.setPlaceholder(placeholder);
		searchComponent.setValue(this.query);
		searchComponent.onChange(value => (this.query = value));
		searchComponent.inputEl.addEventListener('keydown', this.keyPressCallback.bind(this));

		contentEl.appendChild(searchComponent.inputEl);
		searchComponent.inputEl.focus();

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });
		contentEl.createEl('h3', { text: 'APIs to search' });

		for (const mediaType of MEDIA_TYPES) {
			const apiToggleListElementWrapper = contentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });

			const apiToggleTextWrapper = apiToggleListElementWrapper.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
			apiToggleTextWrapper.createEl('span', { text: unCamelCase(mediaType), cls: 'media-db-plugin-list-text' });

			const apiToggleComponentWrapper = apiToggleListElementWrapper.createEl('div', { cls: 'media-db-plugin-list-toggle' });

			const apiToggleComponent = new ToggleComponent(apiToggleComponentWrapper);
			apiToggleComponent.setTooltip(unCamelCase(mediaType));
			apiToggleComponent.setValue(this.selectedTypes.find(x => x.name === mediaType).selected);
			if (apiToggleComponent.getValue()) {
				currentToggle = apiToggleComponent;
			}
			apiToggleComponent.onChange(value => {
				if (value) {
					if (currentToggle && currentToggle !== apiToggleComponent) {
						currentToggle.setValue(false);
						this.selectedTypes.find(x => x.name === mediaType).selected = false;
					}
					currentToggle = apiToggleComponent;
					this.selectedTypes.find(x => x.name === mediaType).selected = true;
				} else {
					currentToggle = null;
					this.selectedTypes.find(x => x.name === mediaType).selected = false;
				}
			});
			apiToggleComponentWrapper.appendChild(apiToggleComponent.toggleEl);
		}

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
