import type { App, ButtonComponent } from 'obsidian';
import { DropdownComponent, Modal, Setting, TextComponent, ToggleComponent } from 'obsidian';
import type MediaDbPlugin from '../main';

export class MediaDbFolderImportModal extends Modal {
	plugin: MediaDbPlugin;
	onSubmit: (selectedAPI: string, titleFieldName: string, idFieldName: string, appendContent: boolean) => void;
	selectedApi: string;
	searchBtn?: ButtonComponent;
	titleFieldName: string;
	idFieldName: string;
	appendContent: boolean;

	constructor(app: App, plugin: MediaDbPlugin, onSubmit: (selectedAPI: string, titleFieldName: string, idFieldName: string, appendContent: boolean) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApi = plugin.apiManager.apis[0].apiName;
		this.titleFieldName = '';
		this.idFieldName = '';
		this.appendContent = false;
	}

	submit(): void {
		this.onSubmit(this.selectedApi, this.titleFieldName, this.idFieldName, this.appendContent);
		this.close();
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Import folder as Media DB entries' });

		const apiSelectorWrapper = contentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });
		const apiSelectorTextWrapper = apiSelectorWrapper.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
		apiSelectorTextWrapper.createEl('span', { text: 'API to search', cls: 'media-db-plugin-list-text' });

		const apiSelectorComponent = new DropdownComponent(apiSelectorWrapper);
		apiSelectorComponent.onChange((value: string) => {
			this.selectedApi = value;
		});
		for (const api of this.plugin.apiManager.apis) {
			apiSelectorComponent.addOption(api.apiName, api.apiName);
		}
		apiSelectorWrapper.appendChild(apiSelectorComponent.selectEl);

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });
		contentEl.createEl('h3', { text: 'Append note content to Media DB entry?' });

		const appendContentToggleElementWrapper = contentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });
		const appendContentToggleTextWrapper = appendContentToggleElementWrapper.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
		appendContentToggleTextWrapper.createEl('span', {
			text: 'If this is enabled, the plugin will override metadata fields with the same name.',
			cls: 'media-db-plugin-list-text',
		});

		const appendContentToggleComponentWrapper = appendContentToggleElementWrapper.createEl('div', { cls: 'media-db-plugin-list-toggle' });

		const appendContentToggle = new ToggleComponent(appendContentToggleElementWrapper);
		appendContentToggle.setValue(false);
		appendContentToggle.onChange(value => (this.appendContent = value));
		appendContentToggleComponentWrapper.appendChild(appendContentToggle.toggleEl);

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });
		contentEl.createEl('h3', { text: "Name of 'title' metadata field to use in API query." });

		const placeholder = 'title';
		const titleFieldNameComponent = new TextComponent(contentEl);
		titleFieldNameComponent.inputEl.style.width = '100%';
		titleFieldNameComponent.setPlaceholder(placeholder);
		titleFieldNameComponent.onChange(value => (this.titleFieldName = value));
		titleFieldNameComponent.inputEl.addEventListener('keydown', ke => {
			if (ke.key === 'Enter') {
				this.submit();
			}
		});
		contentEl.appendChild(titleFieldNameComponent.inputEl);

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });
		contentEl.createEl('h3', { text: "Name of 'id' metadata field to use in API query (if present, will be used instead of title)." });

		const idFieldNameComponent = new TextComponent(contentEl);
		idFieldNameComponent.inputEl.style.width = '100%';
		idFieldNameComponent.setPlaceholder('id');
		idFieldNameComponent.onChange(value => (this.idFieldName = value));
		idFieldNameComponent.inputEl.addEventListener('keydown', ke => {
			if (ke.key === 'Enter') {
				this.submit();
			}
		});
		contentEl.appendChild(idFieldNameComponent.inputEl);

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
					this.submit();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
				this.searchBtn = btn;
			});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
