<script lang="ts">
	import {capitalizeFirstLetter} from '../utils/Utils';
	import {PropertyMappingModel, PropertyMappingOption, propertyMappingOptions} from './PropertyMapping';

	export let models: PropertyMappingModel[] = [];

	export let save: (models: PropertyMappingModel[]) => void;
</script>

<style>
	.media-db-plugin-property-mappings-container {
		margin:         10px 0;
		display:        flex;
		flex-direction: column;
		gap:            10px;
	}

	.media-db-plugin-property-mapping-element {
		display:        flex;
		flex-direction: row;
		gap:            10px;
	}

	.media-db-plugin-property-mapping-element-property-name-wrapper {
		min-width:     160px;
		background:    var(--background-modifier-form-field);
		padding:       2px 5px;
		border-radius: 5px;
	}

	.media-db-plugin-property-mapping-element-property-name {
		margin: 0;
	}
</style>

<div class="setting-item" style="display: block;">
	{ #each models as model }
		<div class="setting-item-name">{capitalizeFirstLetter(model.type)}</div>
		<div class="media-db-plugin-property-mappings-container">
			{ #each model.properties as property }
				<div class="media-db-plugin-property-mapping-element">
					<div class="media-db-plugin-property-mapping-element-property-name-wrapper">
						<pre
							class="media-db-plugin-property-mapping-element-property-name"><code>{property.property}</code></pre>
					</div>
					{#if property.locked}
						<div class="media-db-plugin-property-binding-text">
							property can not be remapped
						</div>
					{:else}
						<select bind:value={property.mapping}>
							{#each propertyMappingOptions as remappingOption}
								<option value={remappingOption}>
									{remappingOption}
								</option>
							{/each}
						</select>

						{#if property.mapping === PropertyMappingOption.Map}
							<div class="media-db-plugin-property-mapping-text">
								->
							</div>
							<div class="media-db-plugin-property-binding-to">
								<input type="text" spellcheck="false" bind:value="{property.newProperty}">
							</div>
						{/if}
					{/if}
				</div>
			{ /each  }
		</div>
	{ /each  }

	<pre>{JSON.stringify(models, null, 4)}</pre>
</div>
