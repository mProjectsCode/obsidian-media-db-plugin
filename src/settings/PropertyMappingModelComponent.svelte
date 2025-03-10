<script lang="ts">
	import { run } from 'svelte/legacy';

	import { PropertyMappingModel, PropertyMappingOption, propertyMappingOptions } from './PropertyMapping';
	import { capitalizeFirstLetter } from '../utils/Utils';
	import Icon from './Icon.svelte';

	interface Props {
		model: PropertyMappingModel;
		save: (model: PropertyMappingModel) => void;
	}

	let { model, save }: Props = $props();

	let validationResult: { res: boolean; err?: Error } | undefined = $state();

	$effect(() => {
		validationResult = model.validate();
	});
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
					<div class="media-db-plugin-property-binding-text">property cannot be remapped</div>
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
		onclick={() => {
			if (model.validate().res) save(model);
		}}
		>Save
	</button>
</div>

<style>
</style>
