<script lang="ts">
	import { PropertyMappingModel, PropertyMapping, PropertyMappingOption, propertyMappingOptions } from './PropertyMapping';
	import { capitalizeFirstLetter } from '../utils/Utils';
	import Icon from './Icon.svelte';

	interface Props {
		model: PropertyMappingModel;
		save: (model: PropertyMappingModel) => void;
	}

	let { model, save }: Props = $props();

	// Wrap in $state for reactivity on nested mutations
	let reactiveModel = $state(model);
	let properties = $state(model.properties);

	// Validation computed on demand in button
</script>

<div class="media-db-plugin-property-mappings-model-container">
	<div class="setting-item-name">{capitalizeFirstLetter(reactiveModel.type)}</div>

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
			{#each properties as property}
				<tr>
					<td class="col-property">
						<code>{property.property}</code>
					</td>

					{#if property.locked}
						<td class="col-locked" colspan="3">
							<div class="media-db-plugin-property-binding-text">property cannot be remapped</div>
						</td>
					{:else}
						<td class="col-mapping">
							<select class="dropdown" value={property.mapping} onchange={(e) => {
								property.mapping = e.currentTarget.value as PropertyMappingOption;
								properties = JSON.parse(JSON.stringify(properties)); // deep clone to plain objects for reactivity
							}}>
								{#each propertyMappingOptions as remappingOption}
									<option value={remappingOption}>
										{remappingOption}
									</option>
								{/each}
							</select>
						</td>

						<td class="col-new-name">
							{#if property.mapping === PropertyMappingOption.Map}
								<div class="media-db-plugin-property-mapping-to">
									<Icon iconName="arrow-right" />
									<input class="media-db-plugin-property-mapping-input" type="text" spellcheck="false" bind:value={property.newProperty} placeholder="New property name" oninput={() => properties = JSON.parse(JSON.stringify(properties))} />
								</div>
							{:else}
								<span class="media-db-plugin-property-mapping-to-disabled">—</span>
							{/if}
						</td>

						<td class="col-wikilink">
								<label class="media-db-plugin-property-mapping-wikilink-label" title="Convert value to wikilink ([[value]])">
									<input type="checkbox" bind:checked={property.wikilink} onchange={() => properties = JSON.parse(JSON.stringify(properties))} />
								</label>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	<button
		class="media-db-plugin-property-mappings-save-button"
		onclick={() => {
			reactiveModel.properties = properties.map(p => new PropertyMapping(p.property, p.newProperty, p.mapping, p.locked, p.wikilink));
			const validation = reactiveModel.validate();
			if (validation.res) save(reactiveModel);
		}}
	>
		Save
	</button>
</div>

<style>
	.media-db-plugin-property-mappings-table {
		width: 100%;
		border-collapse: collapse;
		border-spacing: 0;
		/* removed table-layout: fixed to allow proper width calculation for flex inputs */
	}

	/* remove excessive left padding and keep within container */
	.media-db-plugin-property-mappings-table th,
	.media-db-plugin-property-mappings-table td {
		padding: 2px 4px;
		border-bottom: 1px solid var(--background-modifier-border);
		vertical-align: middle;
	}

	/* column widths */
	.col-property {
		width: 25%;
		white-space: nowrap;
	}

	.col-mapping {
		width: 20%;
	}

	.col-new-name {
		width: 40%;
		min-width: 150px; /* ensure minimum width for input */
	}

	.col-wikilink {
		width: 15%;
		text-align: center;
	}

	/* ensure inner controls fit within table cell */
	.media-db-plugin-property-mapping-to {
		position: relative;
		width: 100%;
	}

	/* position icon absolutely */
	.media-db-plugin-property-mapping-to > :first-child {
		position: absolute;
		left: 4px;
		top: 50%;
		transform: translateY(-50%);
		z-index: 1;
	}

	.media-db-plugin-property-mapping-input {
		width: 100%;
		padding-left: 28px; /* make room for icon (20px icon + 4px gap + 4px padding) */
		box-sizing: border-box;
	}

	.media-db-plugin-property-mapping-input,
	.media-db-plugin-property-mappings-table select.dropdown {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		min-width: 50px; /* ensure minimum width for input visibility */
	}

	.media-db-plugin-property-mapping-wikilink-label {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.95em;
		cursor: pointer;
	}

	.media-db-plugin-property-mapping-to-disabled {
		color: var(--text-muted);
	}

	/* avoid extra left indentation from <pre> */
	.media-db-plugin-property-mappings-table code {
		padding: 0;
		margin: 0;
	}
</style>
