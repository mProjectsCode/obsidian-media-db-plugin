import type { App } from 'obsidian';
import { Modal, Notice } from 'obsidian';
import { render } from 'solid-js/web';
import type MediaDbPlugin from '../main';
import type { MediaType } from '../utils/MediaType';
import { mediaTypeDisplayName } from '../utils/Utils';
import type { PropertyMappingModelData } from '../settings/PropertyMapping';
import PropertyMappingModelComponent from '../settings/PropertyMappingModelComponent';

export class PropertyMappingModal extends Modal {
	private disposeSolid?: () => void;

	constructor(
		app: App,
		private readonly plugin: MediaDbPlugin,
		private readonly mediaType: MediaType,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle(`Property mappings — ${mediaTypeDisplayName(this.mediaType)}`);

		const modelData = this.plugin.settings.propertyMappingModels.find(m => m.type === this.mediaType);
		if (!modelData) {
			contentEl.createEl('p', { text: 'No property mapping model found for this media type.' });
			return;
		}

		contentEl.createEl('p', {
			cls: 'mod-muted',
			text: 'Choose whether each metadata field stays as-is, is renamed in front matter, or is omitted. Use Save to persist your changes.',
		});

		const root = contentEl.createDiv();
		this.disposeSolid = render(
			() =>
				PropertyMappingModelComponent({
					model: structuredClone(modelData),
					showMediaTypeTitle: false,
					save: (model: PropertyMappingModelData): void => {
						const index = this.plugin.settings.propertyMappingModels.findIndex(m => m.type === model.type);
						if (index !== -1) {
							this.plugin.settings.propertyMappingModels[index] = model;
						}
						new Notice(`MDB: Property mappings for ${mediaTypeDisplayName(model.type)} saved successfully.`);
						void this.plugin.saveSettings();
					},
				}),
			root,
		);
	}

	onClose(): void {
		this.disposeSolid?.();
		this.disposeSolid = undefined;
		this.contentEl.empty();
	}
}
