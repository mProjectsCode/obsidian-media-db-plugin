<script lang="ts">
	import {capitalizeFirstLetter} from '../utils/Utils';
	import {PropertyMappingModel, PropertyMappingOption, propertyMappingOptions} from './PropertyMapping';
	import Icon from './Icon.svelte';

	export let models: PropertyMappingModel[] = [];

	export let save: (model: PropertyMappingModel) => void;

	// TODO: validate all the mappings before saving.
</script>

<style>
	.media-db-plugin-property-mappings-model-container {
		border:        1px solid var(--background-modifier-border);
		border-radius: 5px;
		padding:       10px;
		width:         100%;
	}

	.media-db-plugin-property-mappings-container {
		margin:         10px 0;
		display:        flex;
		flex-direction: column;
		gap:            5px;
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

		display:       flex;
		align-items:   center;
	}

	.media-db-plugin-property-mapping-element-property-name {
		margin: 0;
	}

	.media-db-plugin-property-mappings-save-button {
		margin: 0;
	}

	.media-db-plugin-property-mapping-to {
		display:     flex;
		align-items: center;
	}

	.media-db-plugin-property-mapping-validation {
		color:         var(--text-error);
		margin-bottom: 5px;
	}
</style>

<div class="setting-item" style="display: flex; gap: 10px; flex-direction: column; align-items: stretch;">
	{ #each models as model }
		<div class="media-db-plugin-property-mappings-model-container">
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
							<select class="dropdown" bind:value={property.mapping}>
								{#each propertyMappingOptions as remappingOption}
									<option value={remappingOption}>
										{remappingOption}
									</option>
								{/each}
							</select>

							{#if property.mapping === PropertyMappingOption.Map}
								<Icon iconName="arrow-right"/>
								<div class="media-db-plugin-property-mapping-to">
									<input type="text" spellcheck="false" bind:value="{property.newProperty}">
								</div>
							{/if}
						{/if}
					</div>
				{ /each    }
			</div>
			{ #if !model.validate().res }
				<div class="media-db-plugin-property-mapping-validation">
					{model.validate().err?.message}
				</div>
			{/if}
			<button
				class="media-db-plugin-property-mappings-save-button {model.validate().res ? 'mod-cta' : 'mod-muted'}"
				on:click={() => { if(model.validate().res) save(model) }}>Save
			</button>
		</div>
	{ /each    }

	<pre>{JSON.stringify(models, null, 4)}</pre>

	<!--
	{ #each ICON_LIST as icon }
		<p>
			{icon} <Icon iconName="{icon}"/>
		</p>
	{/each}
	-->
</div>
