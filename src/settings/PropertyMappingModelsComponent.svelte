<script lang="ts">
	import { PropertyMappingModel } from './PropertyMapping';
	import PropertyMappingModelComponent from './PropertyMappingModelComponent.svelte';

	export let models: PropertyMappingModel[] = [];
	export let save: (model: PropertyMappingModel) => void;
</script>

<div class="setting-item" style="display: flex; gap: 10px; flex-direction: column; align-items: stretch;">
	{#each models as model}
		<PropertyMappingModelComponent {model} {save}></PropertyMappingModelComponent>
	{/each}

	<!--
		<pre>{JSON.stringify(models, null, 4)}</pre>

		{ #each ICON_LIST as icon }
			<p>
				{icon} <Icon iconName="{icon}"/>
			</p>
		{/each}
	-->
</div>

<style>
</style>
