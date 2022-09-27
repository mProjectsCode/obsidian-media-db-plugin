<script lang="ts">
	import {PropertyMappingModel} from './PropertyMapping';
	import PropertyMappingModelComponent from './PropertyMappingModelComponent.svelte';

	export let models: PropertyMappingModel[] = [];

	export let save: (model: PropertyMappingModel) => void;

	// TODO: validate all the mappings before saving.
</script>

<style>

</style>

<div class="setting-item" style="display: flex; gap: 10px; flex-direction: column; align-items: stretch;">
	{ #each models as model }
		<PropertyMappingModelComponent model={model} save={save}></PropertyMappingModelComponent>
	{ /each  }

	<!--
		<pre>{JSON.stringify(models, null, 4)}</pre>

		{ #each ICON_LIST as icon }
			<p>
				{icon} <Icon iconName="{icon}"/>
			</p>
		{/each}
	-->
</div>
