import {App, ButtonComponent, DropdownComponent, Modal, Setting, TextComponent, ToggleComponent} from 'obsidian';
import MediaDbPlugin from '../main';

export class MediaDbFolderImportModal extends Modal {
	plugin: MediaDbPlugin;
	onSubmit: (selectedAPI: string, titleFieldName: string, appendContent: boolean) => void;
	selectedApi: string;
	searchBtn: ButtonComponent;
	titleFieldName: string;
	appendContent: boolean;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit: (selectedAPI: string, titleFieldName: string, appendContent: boolean) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApi = plugin.apiManager.apis[0].apiName;
	}

	submit() {
		this.onSubmit(this.selectedApi, this.titleFieldName, this.appendContent);
		this.close();
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: 'Import folder as Media DB entries'});

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


		contentEl.createDiv({cls: 'media-db-plugin-spacer'});
		contentEl.createEl('h3', {text: 'Append note content to Media DB entry.'});

		const appendContentToggleElementWrapper = contentEl.createEl('div', {cls: 'media-db-plugin-list-wrapper'});
		const appendContentToggleTextWrapper = appendContentToggleElementWrapper.createEl('div', {cls: 'media-db-plugin-list-text-wrapper'});
		appendContentToggleTextWrapper.createEl('span', {
			text: 'If this is enabled, the plugin will override metadata fields with the same name.',
			cls: 'media-db-plugin-list-text',
		});

		const appendContentToggleComponentWrapper = appendContentToggleElementWrapper.createEl('div', {cls: 'media-db-plugin-list-toggle'});

		const appendContentToggle = new ToggleComponent(appendContentToggleElementWrapper);
		appendContentToggle.setValue(false);
		appendContentToggle.onChange(value => this.appendContent = value);
		appendContentToggleComponentWrapper.appendChild(appendContentToggle.toggleEl);


		contentEl.createDiv({cls: 'media-db-plugin-spacer'});
		contentEl.createEl('h3', {text: 'The name of the metadata field that should be used as the title to query.'});

		const placeholder = 'title';
		const titleFieldNameComponent = new TextComponent(contentEl);
		titleFieldNameComponent.inputEl.style.width = '100%';
		titleFieldNameComponent.setPlaceholder(placeholder);
		titleFieldNameComponent.onChange(value => this.titleFieldName = value);
		titleFieldNameComponent.inputEl.addEventListener('keydown', (ke) => {
			if (ke.key === 'Enter') {
				this.submit();
			}
		});
		contentEl.appendChild(titleFieldNameComponent.inputEl);

		contentEl.createDiv({cls: 'media-db-plugin-spacer'});

		new Setting(contentEl)
			.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()))
			.addButton(btn => btn.setButtonText('Ok').setCta().onClick(() => this.submit()));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
