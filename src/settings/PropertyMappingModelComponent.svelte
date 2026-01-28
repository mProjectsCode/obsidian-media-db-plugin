<script lang="ts">
	import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions } from './PropertyMapping';
	import { capitalizeFirstLetter } from '../utils/Utils';
	import Icon from './Icon.svelte';
	
	interface Props {
		model: PropertyMappingModel;
		save: (model: PropertyMappingModel) => void;
	}

	let { model, save }: Props = $props();

	let unsavedChanges = $state(false);
	// svelte-ignore state_referenced_locally

	let validationResult: { res: boolean; err?: Error } | undefined = $derived(model.validate());

	function onModelUpdate() {
		unsavedChanges = true;
		model = model.copy();
	}
</script>

<div class="media-db-plugin-property-mappings-model-container">
	<div class="media-db-plugin-property-mappings-model-header">
		<div class="setting-item-name">{capitalizeFirstLetter(model.type)}</div>

		<div class="media-db-plugin-property-mappings-model-actions">
			{#if unsavedChanges}
				<div class="media-db-plugin-property-mapping-unsaved-changes">Unsaved changes</div>
			{/if}

			<button
				class="media-db-plugin-property-mappings-save-button {validationResult?.res ? 'mod-cta' : 'mod-muted'}"
				onclick={() => {
					if (model.validate().res) {
						save(model);
						unsavedChanges = false;
					}
				}}
			>
				Save
			</button>
		</div>
	</div>

	{#if !validationResult?.res}
		<div class="media-db-plugin-property-mapping-validation">
			{validationResult?.err?.message}
		</div>
	{/if}

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
								<select class="dropdown" bind:value={property.mapping} onchange={() => onModelUpdate()}>
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
										<input
											class="media-db-plugin-property-mapping-input"
											type="text"
											spellcheck="false"
											bind:value={property.newProperty}
											onchange={() => onModelUpdate()}
										/>
									</div>
								{:else}
									<span class="media-db-plugin-property-mapping-to-disabled">—</span>
								{/if}
							</td>

							<td class="col-wikilink">
								<label class="media-db-plugin-property-mapping-wikilink-label" title="Convert value to wikilink ([[value]])">
									<input type="checkbox" bind:checked={property.wikilink} onchange={() => onModelUpdate()} />
								</label>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	/* Container */
	.media-db-plugin-property-mappings-model-container {
		margin-bottom: var(--size-4-8);
	}

	/* Header and actions */
	.media-db-plugin-property-mappings-model-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--size-4-4);
		gap: var(--size-4-3);
	}

	.media-db-plugin-property-mappings-model-header .setting-item-name {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-medium);
		color: var(--text-normal);
		margin: 0;
	}

	.media-db-plugin-property-mappings-model-actions {
		display: flex;
		align-items: center;
		gap: var(--size-4-3);
	}

	.media-db-plugin-property-mapping-unsaved-changes {
		color: var(--text-warning);
		font-size: var(--font-ui-small);
		white-space: nowrap;
	}

	.media-db-plugin-property-mappings-save-button {
		white-space: nowrap;
		cursor: pointer;
	}

	.media-db-plugin-property-mappings-save-button.mod-muted {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Validation error */
	.media-db-plugin-property-mapping-validation {
		color: var(--text-error);
		background: rgba(var(--color-red-rgb), 0.1);
		padding: var(--size-4-3) var(--size-4-4);
		margin-bottom: var(--size-4-4);
		border-left: 3px solid var(--text-error);
		font-size: var(--font-ui-small);
		line-height: 1.5;
		border-radius: var(--radius-s);
	}

	/* Table container */
	.media-db-plugin-property-mappings-table-container {
		overflow-x: auto;
	}

	.media-db-plugin-property-mappings-table {
		width: 100%;
		border-collapse: collapse;
		border-spacing: 0;
		font-size: var(--font-ui-small);
	}

	/* Table header */
	.media-db-plugin-property-mappings-table thead {
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.media-db-plugin-property-mappings-table th {
		padding: var(--size-4-2) var(--size-4-3);
		padding-left: 0;
		text-align: left;
		font-weight: var(--font-semibold);
		color: var(--text-muted);
		font-size: var(--font-ui-smaller);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		border-bottom: none;
	}

	/* Table body */
	.media-db-plugin-property-mappings-table tbody tr {
		transition: background-color 0.1s ease;
	}

	.media-db-plugin-property-mappings-table td {
		padding: var(--size-4-3) var(--size-4-3) var(--size-4-3) 0;
		border-bottom: 1px solid var(--background-modifier-border-hover);
		vertical-align: middle;
	}

	.media-db-plugin-property-mappings-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* Column widths */
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

	.col-locked {
		text-align: center;
		font-style: italic;
	}

	/* Property name styling */
	.media-db-plugin-property-mappings-table code {
		padding: var(--size-4-1) var(--size-4-2);
		margin: 0;
		background: var(--code-background);
		color: var(--code-normal);
		border-radius: var(--radius-s);
		font-size: var(--font-ui-smaller);
		font-family: var(--font-monospace);
	}

	/* Locked property text */
	.media-db-plugin-property-binding-text {
		color: var(--text-muted);
		font-size: var(--font-ui-small);
		font-style: italic;
	}

	/* Dropdown select - use Obsidian defaults */
	.media-db-plugin-property-mappings-table select.dropdown {
		width: 100%;
		max-width: 100%;
	}

	/* Remap input */
	.media-db-plugin-property-mapping-to {
		display: flex;
		align-items: center;
		gap: var(--size-4-2);
		min-width: 0;
	}

	.media-db-plugin-property-mapping-input {
		flex: 1;
		width: 100%;
		font-family: var(--font-monospace);
	}

	.media-db-plugin-property-mapping-to-disabled {
		color: var(--text-faint);
		font-size: var(--font-ui-medium);
	}

	/* Wikilink checkbox */
	.media-db-plugin-property-mapping-wikilink-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: var(--size-4-1);
	}

	.media-db-plugin-property-mapping-wikilink-label input[type='checkbox'] {
		cursor: pointer;
		width: var(--checkbox-size);
		height: var(--checkbox-size);
	}
</style>
