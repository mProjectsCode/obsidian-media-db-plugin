import {App, ButtonComponent, DropdownComponent, Modal, Setting, TextComponent} from 'obsidian';
import MediaDbPlugin from '../main';

export class MediaDbFolderImportModal extends Modal {
	plugin: MediaDbPlugin;
	onSubmit: (selectedAPI: string, titleFieldName: string) => void;
	selectedApi: string;
	searchBtn: ButtonComponent;
	titleFieldName: string;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit: (selectedAPI: string, titleFieldName: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApi = plugin.apiManager.apis[0].apiName;
	}

	submit() {
		this.onSubmit(this.selectedApi, this.titleFieldName);
		this.close();
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: 'Create Media DB entries from folder'});

		const apiSelectorWrapper = contentEl.createEl('div', {cls: 'media-db-plugin-list-wrapper'});
		const apiSelectorTextWrapper = apiSelectorWrapper.createEl('div', {cls: 'media-db-plugin-list-text-wrapper'});
		apiSelectorTextWrapper.createEl('span', {text: 'API to search', cls: 'media-db-plugin-list-text'});

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.plugin.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorWrapper.appendChild(apiSelectorComponent.selectEl);


		const placeholder = 'Title metadata field name';
		const titleFieldNameComponent = new TextComponent(contentEl);
		titleFieldNameComponent.inputEl.style.width = '100%';
		titleFieldNameComponent.setPlaceholder(placeholder);
		titleFieldNameComponent.onChange(value => this.titleFieldName = value);

		contentEl.appendChild(titleFieldNameComponent.inputEl);

		new Setting(contentEl)
			.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
			.addButton(btn => btn.setButtonText('Ok').setCta().onClick(() => this.submit()));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
