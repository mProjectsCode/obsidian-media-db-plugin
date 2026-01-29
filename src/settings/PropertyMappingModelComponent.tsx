import { createSignal, createMemo, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions, type PropertyMappingModelData } from './PropertyMapping';
import { capitalizeFirstLetter } from '../utils/Utils';
import Icon from './Icon';

interface PropertyMappingModelComponentProps {
	model: PropertyMappingModelData;
	save: (model: PropertyMappingModelData) => void;
}

export default function PropertyMappingModelComponent(props: PropertyMappingModelComponentProps) {
	const [unsavedChanges, setUnsavedChanges] = createSignal(false);

	// Create a store from the model's plain data
	const [modelData, setModelData] = createStore(props.model);

	// Derive the validation result reactively
	const validationResult = createMemo(() => {
		const model = PropertyMappingModel.fromJSON(modelData);
		return model.validate();
	});

	const onModelUpdate = () => {
		setUnsavedChanges(true);
	};

	const handleSave = () => {
		const model = PropertyMappingModel.fromJSON(modelData);
		if (model.validate().res) {
			props.save(model);
			setUnsavedChanges(false);
		}
	};

	return (
		<div class="media-db-plugin-property-mappings-model-container">
			<div class="media-db-plugin-property-mappings-model-header">
				<div class="setting-item-name">{capitalizeFirstLetter(modelData.type)}</div>

				<div class="media-db-plugin-property-mappings-model-actions">
					<Show when={unsavedChanges()}>
						<div class="media-db-plugin-property-mapping-unsaved-changes">Unsaved changes</div>
					</Show>

					<button class={`media-db-plugin-property-mappings-save-button ${validationResult().res ? 'mod-cta' : 'mod-muted'}`} onClick={handleSave}>
						Save
					</button>
				</div>
			</div>

			<Show when={!validationResult().res}>
				<div class="media-db-plugin-property-mapping-validation">{validationResult().err?.message}</div>
			</Show>

			<div class="media-db-plugin-property-mappings-table-container">
				<table class="media-db-plugin-property-mappings-table">
					<thead>
						<tr>
							<th class="col-property">Property</th>
							<th class="col-mapping">Mapping</th>
							<th class="col-new-name">New name</th>
							<th class="col-wikilink">Wikilink</th>
						</tr>
					</thead>
					<tbody>
						<For each={modelData.properties}>
							{(property, index) => (
								<tr>
									<td class="col-property">
										<code>{property.property}</code>
									</td>

									<Show
										when={!property.locked}
										fallback={
											<td class="col-locked" colspan={3}>
												<div class="media-db-plugin-property-binding-text">property cannot be remapped</div>
											</td>
										}
									>
										<td class="col-mapping">
											<select
												class="dropdown"
												value={property.mapping}
												onChange={e => {
													setModelData('properties', index(), 'mapping', e.currentTarget.value as PropertyMappingOption);
													setModelData('properties', index(), 'newProperty', '');
													onModelUpdate();
												}}
											>
												<For each={propertyMappingOptions}>{remappingOption => <option value={remappingOption}>{remappingOption}</option>}</For>
											</select>
										</td>

										<td class="col-new-name">
											<Show
												when={property.mapping === PropertyMappingOption.Map}
												fallback={<span class="media-db-plugin-property-mapping-to-disabled">—</span>}
											>
												<div class="media-db-plugin-property-mapping-to">
													<Icon iconName="arrow-right" />
													<input
														class="media-db-plugin-property-mapping-input"
														type="text"
														spellcheck={false}
														value={property.newProperty}
														onInput={e => {
															setModelData('properties', index(), 'newProperty', e.currentTarget.value);
															onModelUpdate();
														}}
													/>
												</div>
											</Show>
										</td>

										<td class="col-wikilink">
											<label class="media-db-plugin-property-mapping-wikilink-label" title="Convert value to wikilink ([[value]])">
												<input
													type="checkbox"
													checked={property.wikilink}
													onChange={e => {
														setModelData('properties', index(), 'wikilink', e.currentTarget.checked);
														onModelUpdate();
													}}
												/>
											</label>
										</td>
									</Show>
								</tr>
							)}
						</For>
					</tbody>
				</table>
			</div>
		</div>
	);
}
