<script lang="ts">
	import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions } from './PropertyMapping';
	import { capitalizeFirstLetter } from '../utils/Utils';
	import Icon from './Icon.svelte';

	export let model: PropertyMappingModel;
	export let save: (model: PropertyMappingModel) => void;

	let validationResult: { res: boolean; err?: Error };

	$: modelChanged(model);

	function modelChanged(model: PropertyMappingModel) {
		validationResult = model.validate();
	}
</script>

<div class="media-db-plugin-property-mappings-model-container">
	<div class="setting-item-name">{capitalizeFirstLetter(model.type)}</div>
	<div class="media-db-plugin-property-mappings-container">
		{#each model.properties as property}
			<div class="media-db-plugin-property-mapping-element">
				<div class="media-db-plugin-property-mapping-element-property-name-wrapper">
					<pre class="media-db-plugin-property-mapping-element-property-name"><code>{property.property}</code></pre>
				</div>
				{#if property.locked}
					<div class="media-db-plugin-property-binding-text">property can not be remapped</div>
				{:else}
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
		on:click={() => {
			if (model.validate().res) save(model);
		}}
		>Save
	</button>
</div>

<style>
</style>
