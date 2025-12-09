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

	// Use $state as a variable declaration initializer
	let propertyStates = $state(model.properties.map(p => ({ ...p })));
</script>

<div class="media-db-plugin-property-mappings-model-container">
	<div class="setting-item-name">{capitalizeFirstLetter(model.type)}</div>
	<div class="media-db-plugin-property-mappings-container">
		{#each propertyStates as property, i}
			<div class="media-db-plugin-property-mapping-element">
				<div class="media-db-plugin-property-mapping-element-property-name-wrapper">
					<pre class="media-db-plugin-property-mapping-element-property-name"><code>{property.property}</code></pre>
				</div>
				{#if property.locked}
					<div class="media-db-plugin-property-binding-text">property cannot be remapped</div>
				{:else}
					<div style="display: flex; align-items: center; gap: 8px;">
						<select class="dropdown" bind:value={property.mapping}>
							{#each propertyMappingOptions as remappingOption}
								<option value={remappingOption}>
									{remappingOption}
								</option>
							{/each}
						</select>
						{#if property.mapping === PropertyMappingOption.Map}
							<Icon iconName="arrow-right" />
							<div class="media-db-plugin-property-mapping-to">
								<input type="text" spellcheck="false" bind:value={property.newProperty} />
							</div>
						{/if}
						<!-- Wikilink checkbox -->
						<label class="media-db-plugin-property-mapping-wikilink-label" title="Convert value to wikilink ([[value]])">
							<input type="checkbox" bind:checked={property.wikilink} />
							<Icon iconName="link" />
							<span>Wikilink</span>
						</label>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	{#if !validationResult?.res}
		<div class="media-db-plugin-property-mapping-validation">
			{validationResult?.err?.message}
		</div>
	{/if}
	<button
		class="media-db-plugin-property-mappings-save-button {validationResult?.res ? 'mod-cta' : 'mod-muted'}"
		onclick={() => {
			// Sync propertyStates back to model.properties
			model.properties.forEach((p, i) => {
				Object.assign(p, propertyStates[i]);
			});
			if (model.validate().res) save(model);
		}}
		>Save
	</button>
</div>

<style>
	.media-db-plugin-property-mapping-wikilink-label {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.95em;
		cursor: pointer;
	}
</style>
