import { Component } from 'obsidian';
import type { PropertyMappingModelData } from 'packages/obsidian/src/settings/PropertyMapping';
import PropertyMappingModelComponent from 'packages/obsidian/src/settings/PropertyMappingModelComponent';

interface PropertyMappingModelsComponentProps {
	models?: PropertyMappingModelData[];
	save: (model: PropertyMappingModelData) => void;
}

export default class PropertyMappingModelsComponent extends Component {
	private readonly containerEl: HTMLElement;
	private readonly models: PropertyMappingModelData[];
	private readonly save: (model: PropertyMappingModelData) => void;

	constructor(containerEl: HTMLElement, props: PropertyMappingModelsComponentProps) {
		super();
		this.containerEl = containerEl;
		this.models = props.models ?? [];
		this.save = props.save;
	}

	override onload(): void {
		this.containerEl.empty();
		const rootEl = this.containerEl.createDiv('setting-item media-db-plugin-property-mappings-models-container');

		for (const model of this.models) {
			const modelContainerEl = rootEl.createDiv();
			this.addChild(
				new PropertyMappingModelComponent(modelContainerEl, {
					model,
					save: this.save,
				}),
			);
		}
	}

	override onunload(): void {
		this.containerEl.empty();
	}
}
