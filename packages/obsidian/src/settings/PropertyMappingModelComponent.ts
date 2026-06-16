import { Component, setIcon } from 'obsidian';
import type { PropertyMappingModelData } from 'packages/obsidian/src/settings/PropertyMapping';
import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions } from 'packages/obsidian/src/settings/PropertyMapping';
import { capitalizeFirstLetter } from 'packages/obsidian/src/utils/Utils';

interface PropertyMappingModelComponentProps {
	model: PropertyMappingModelData;
	save: (model: PropertyMappingModelData) => void;
}

export default class PropertyMappingModelComponent extends Component {
	private readonly containerEl: HTMLElement;
	private readonly save: (model: PropertyMappingModelData) => void;
	private modelData: PropertyMappingModelData;
	private unsavedChanges = false;

	constructor(containerEl: HTMLElement, props: PropertyMappingModelComponentProps) {
		super();
		this.containerEl = containerEl;
		this.modelData = props.model;
		this.save = props.save;
	}

	override onload(): void {
		this.render();
	}

	override onunload(): void {
		this.containerEl.empty();
	}

	private get validationResult(): { res: boolean; err?: Error } {
		const model = PropertyMappingModel.fromJSON(this.modelData);
		return model.validate();
	}

	private handleSave(): void {
		const model = PropertyMappingModel.fromJSON(this.modelData);
		if (!model.validate().res) {
			return;
		}

		this.save(model.toJSON());
		this.unsavedChanges = false;
		this.render();
	}

	private onModelUpdate(): void {
		this.unsavedChanges = true;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const validationResult = this.validationResult;
		const rootEl = this.containerEl.createDiv('media-db-plugin-property-mappings-model-container');
		const headerEl = rootEl.createDiv('media-db-plugin-property-mappings-model-header');
		headerEl.createDiv({ cls: 'setting-item-name', text: capitalizeFirstLetter(this.modelData.type) });

		const actionsEl = headerEl.createDiv('media-db-plugin-property-mappings-model-actions');
		if (this.unsavedChanges) {
			actionsEl.createDiv({ cls: 'media-db-plugin-property-mapping-unsaved-changes', text: 'Unsaved changes' });
		}

		const saveButtonEl = actionsEl.createEl('button', {
			cls: `media-db-plugin-property-mappings-save-button ${validationResult.res ? 'mod-cta' : 'mod-muted'}`,
			text: 'Save',
		});
		saveButtonEl.addEventListener('click', () => this.handleSave());

		if (!validationResult.res) {
			rootEl.createDiv({
				cls: 'media-db-plugin-property-mapping-validation',
				text: validationResult.err?.message ?? '',
			});
		}

		const tableContainerEl = rootEl.createDiv('media-db-plugin-property-mappings-table-container');
		const tableEl = tableContainerEl.createEl('table', 'media-db-plugin-property-mappings-table');
		const tableHeadEl = tableEl.createEl('thead');
		const headerRowEl = tableHeadEl.createEl('tr');
		headerRowEl.createEl('th', { cls: 'col-property', text: 'Property' });
		headerRowEl.createEl('th', { cls: 'col-mapping', text: 'Mapping' });
		headerRowEl.createEl('th', { cls: 'col-new-name', text: 'New name' });
		headerRowEl.createEl('th', { cls: 'col-wikilink', text: 'Wikilink' });

		const tableBodyEl = tableEl.createEl('tbody');
		for (const [index, property] of this.modelData.properties.entries()) {
			const rowEl = tableBodyEl.createEl('tr');
			const propertyCellEl = rowEl.createEl('td', 'col-property');
			propertyCellEl.createEl('code', { text: property.property });

			if (property.locked) {
				const lockedCellEl = rowEl.createEl('td', 'col-locked');
				lockedCellEl.colSpan = 3;
				lockedCellEl.createDiv({
					cls: 'media-db-plugin-property-binding-text',
					text: 'property cannot be remapped',
				});
				continue;
			}

			const mappingCellEl = rowEl.createEl('td', 'col-mapping');
			const selectEl = mappingCellEl.createEl('select', 'dropdown');
			for (const remappingOption of propertyMappingOptions) {
				selectEl.createEl('option', {
					attr: { value: remappingOption },
					text: remappingOption,
				});
			}
			selectEl.value = propertyMappingOptions.includes(property.mapping) ? property.mapping : PropertyMappingOption.Default;
			selectEl.addEventListener('change', event => {
				const targetEl = event.currentTarget as HTMLSelectElement;
				this.modelData.properties[index].mapping = targetEl.value as PropertyMappingOption;
				this.modelData.properties[index].newProperty = '';
				this.onModelUpdate();
			});

			const newNameCellEl = rowEl.createEl('td', 'col-new-name');
			if (property.mapping === PropertyMappingOption.Map) {
				const mappingToEl = newNameCellEl.createDiv('media-db-plugin-property-mapping-to');
				const iconWrapperEl = mappingToEl.createDiv('icon-wrapper');
				const iconEl = iconWrapperEl.createDiv('icon');
				setIcon(iconEl, 'arrow-right');

				const inputEl = mappingToEl.createEl('input', {
					cls: 'media-db-plugin-property-mapping-input',
					type: 'text',
				});
				inputEl.spellcheck = false;
				inputEl.value = property.newProperty;
				inputEl.addEventListener('input', event => {
					const targetEl = event.currentTarget as HTMLInputElement;
					this.modelData.properties[index].newProperty = targetEl.value;
					this.onModelUpdate();
				});
			} else {
				newNameCellEl.createSpan({
					cls: 'media-db-plugin-property-mapping-to-disabled',
					text: 'N/A',
				});
			}

			const wikilinkCellEl = rowEl.createEl('td', 'col-wikilink');
			const wikilinkLabelEl = wikilinkCellEl.createEl('label', {
				cls: 'media-db-plugin-property-mapping-wikilink-label',
				attr: { title: 'Convert value to wikilink ([[value]])' },
			});
			const wikilinkInputEl = wikilinkLabelEl.createEl('input', { type: 'checkbox' });
			wikilinkInputEl.checked = property.wikilink ?? false;
			wikilinkInputEl.addEventListener('change', event => {
				const targetEl = event.currentTarget as HTMLInputElement;
				this.modelData.properties[index].wikilink = targetEl.checked;
				this.onModelUpdate();
			});
		}
	}
}
