<!--adapted from @joethei's code: https://github.com/joethei/obsidian-rss/blob/master/src/view/IconComponent.svelte-->
<!--adapted from @javalent's code: https://discord.com/channels/686053708261228577/840286264964022302/902949764209987654-->
<script lang="ts">
	import { setIcon } from 'obsidian';
	import { onMount } from 'svelte';

	interface Props {
		iconName?: string;
	}

	let { iconName = '' }: Props = $props();

	let iconEl: HTMLElement | undefined = $state();

	onMount(() => {
		setIcon(iconEl!, iconName);
	});
</script>

{#if iconName.length > 0}
	<div class="icon-wrapper">
		<div bind:this={iconEl} class="icon"></div>
	</div>
{/if}

<style>
	.icon-wrapper {
		display: inline-block;
		position: relative;
		width: 20px;
	}

	.icon {
		position: absolute;
		height: 20px;
		width: 20px;
		top: calc(50% - 10px);
	}
</style>
