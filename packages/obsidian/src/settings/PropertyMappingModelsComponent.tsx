import { For } from 'solid-js';
import { type PropertyMappingModelData } from './PropertyMapping';
import PropertyMappingModelComponent from './PropertyMappingModelComponent';

interface PropertyMappingModelsComponentProps {
	models?: PropertyMappingModelData[];
	save: (model: PropertyMappingModelData) => void;
}

export default function PropertyMappingModelsComponent(props: PropertyMappingModelsComponentProps) {
	return (
		<div class="setting-item" style={{ display: 'flex', gap: '10px', 'flex-direction': 'column', 'align-items': 'stretch' }}>
			<For each={props.models || []}>{model => <PropertyMappingModelComponent model={model} save={props.save} />}</For>
		</div>
	);
}
