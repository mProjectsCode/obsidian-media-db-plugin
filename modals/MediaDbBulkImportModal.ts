import type { ButtonComponent } from 'obsidian';
import { DropdownComponent, Modal, Setting, TextComponent, ToggleComponent } from 'obsidian';
import type { APIModel } from 'src/api/APIModel';
import { BulkImportLookupMethod } from 'src/utils/BulkImportHelper';
import type MediaDbPlugin from '../main';

export class MediaDbBulkImportModal extends Modal {
	plugin: MediaDbPlugin;
	onSubmit: (selectedAPI: string, lookupMethod: BulkImportLookupMethod, fieldName: string, appendContent: boolean) => void;
	selectedApi: string;
	searchBtn?: ButtonComponent;
	lookupMethod: BulkImportLookupMethod;
	fieldName: string;
	appendContent: boolean;

	constructor(plugin: MediaDbPlugin, onSubmit: (selectedAPI: string, lookupMethod: BulkImportLookupMethod, fieldName: string, appendContent: boolean) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.selectedApi = plugin.apiManager.apis[0].apiName;
		this.lookupMethod = BulkImportLookupMethod.TITLE;
		this.fieldName = '';
		this.appendContent = false;
	}

	submit(): void {
		this.onSubmit(this.selectedApi, this.lookupMethod, this.fieldName, this.appendContent);
		this.close();
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Import folder as Media DB entries' });

		this.createDropdownEl(
			contentEl,
			'API to search',
			(value: string) => {
				this.selectedApi = value;
			},
			this.plugin.apiManager.apis.map((api: APIModel) => {
				return { value: api.apiName, display: api.apiName };
			}),
		);

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
		contentEl.createEl('h3', { text: 'Media lookup method' });
		contentEl.createEl('p', {
			text: 'Choose whether to search the API by title (can return multiple results) or lookup directly using an ID (returns at most one result), and specify the name of the frontmatter property which contains the title or ID of the media.',
		});

		this.createDropdownEl(
			contentEl,
			'Lookup media by',
			(value: string) => {
				this.lookupMethod = value as BulkImportLookupMethod;
			},
			[
				{ value: BulkImportLookupMethod.TITLE, display: 'Title' },
				{ value: BulkImportLookupMethod.ID, display: 'ID' },
			],
		);

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const fieldNameWrapperEl = contentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });
		const fieldNameLabelWrapperEl = fieldNameWrapperEl.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
		fieldNameLabelWrapperEl.createEl('span', { text: 'Using the property named', cls: 'media-db-plugin-list-text' });

		const fieldNameComponent = new TextComponent(fieldNameWrapperEl);
		fieldNameComponent.setPlaceholder('title / id');
		fieldNameComponent.onChange(value => (this.fieldName = value));
		fieldNameComponent.inputEl.addEventListener('keydown', ke => {
			if (ke.key === 'Enter') {
				this.submit();
			}
		});
		contentEl.appendChild(fieldNameWrapperEl);

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

	createDropdownEl(parentEl: HTMLElement, label: string, onChange: (value: string) => void, options: { value: string; display: string }[]): void {
		const wrapperEl = parentEl.createEl('div', { cls: 'media-db-plugin-list-wrapper' });
		const labelWrapperEl = wrapperEl.createEl('div', { cls: 'media-db-plugin-list-text-wrapper' });
		labelWrapperEl.createEl('span', { text: label, cls: 'media-db-plugin-list-text' });

		const dropDownComponent = new DropdownComponent(wrapperEl);
		dropDownComponent.onChange(onChange);
		for (const option of options) {
			dropDownComponent.addOption(option.value, option.display);
		}
		wrapperEl.appendChild(dropDownComponent.selectEl);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
