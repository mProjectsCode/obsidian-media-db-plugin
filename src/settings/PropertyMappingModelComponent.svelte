<script lang="ts">
	import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions } from './PropertyMapping';
	import { capitalizeFirstLetter } from '../utils/Utils';
	import Icon from './Icon.svelte';

	interface Props {
		model: PropertyMappingModel;
		save: (model: PropertyMappingModel) => void;
	}

	let { model, save }: Props = $props();

	let validationResult: { res: boolean; err?: Error } | undefined = $derived(model.validate());
</script>

<div class="media-db-plugin-property-mappings-model-container">
	<div class="setting-item-name">{capitalizeFirstLetter(model.type)}</div>

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
			{#each model.properties as property}
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
							<select
								class="dropdown"
								bind:value={property.mapping}
								onchange={() => {
									model = model.copy();
								}}
							>
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
									<input class="media-db-plugin-property-mapping-input" type="text" spellcheck="false" bind:value={property.newProperty} />
								</div>
							{:else}
								<span class="media-db-plugin-property-mapping-to-disabled">—</span>
							{/if}
						</td>

						<td class="col-wikilink">
							<label class="media-db-plugin-property-mapping-wikilink-label" title="Convert value to wikilink ([[value]])">
								<input type="checkbox" bind:checked={property.wikilink} />
							</label>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if !validationResult?.res}
		<div class="media-db-plugin-property-mapping-validation">
			{validationResult?.err?.message}
		</div>
	{/if}

	<button
		class="media-db-plugin-property-mappings-save-button {validationResult?.res ? 'mod-cta' : 'mod-muted'}"
		onclick={() => {
			if (model.validate().res) save(model);
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
		table-layout: fixed; /* prevent overflow from wide cells */
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
	}

	.col-wikilink {
		width: 15%;
		text-align: center;
	}

	/* ensure inner controls don't push table wider than container */
	.media-db-plugin-property-mapping-to {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}

	.media-db-plugin-property-mapping-input,
	.media-db-plugin-property-mappings-table select.dropdown {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
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
