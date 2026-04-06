import type MediaDbPlugin from '../main';
import type { MediaType } from '../utils/MediaType';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { PropertyMappingOption } from './PropertyMapping';

export class PropertyMapper {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Converts an object using the conversion rules for its type.
	 * Returns an unaltered object if object.type is null or undefined or if there are no conversion rules for the type.
	 *
	 * @param obj
	 */
	convertObject(obj: Record<string, unknown>): Record<string, unknown> {
		if (!Object.hasOwn(obj, 'type')) {
			return obj;
		}

		if (!MEDIA_TYPES.includes(obj.type as MediaType)) {
			return obj;
		}

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === obj.type);
		if (!propertyMappingModel) {
			return obj;
		}

		const propertyMappings = propertyMappingModel.properties;
		const propertyMappingByProperty = new Map(propertyMappings.map(mapping => [mapping.property, mapping]));

		const newObj: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			const propertyMapping = propertyMappingByProperty.get(key);

			if (!propertyMapping) {
				newObj[key] = value;
				continue;
			}

			let finalValue = value;
			if (propertyMapping.wikilink) {
				if (typeof value === 'string') {
					finalValue = `[[${value}]]`;
				} else if (Array.isArray(value)) {
					finalValue = (value as unknown[]).map((v: unknown) => (typeof v === 'string' ? `[[${v}]]` : v));
				}
			}

			if (propertyMapping.mapping === PropertyMappingOption.Map) {
				newObj[propertyMapping.newProperty] = finalValue;
			} else if (propertyMapping.mapping === PropertyMappingOption.Default) {
				newObj[key] = finalValue;
			}
		}

		return newObj;
	}

	/**
	 * Converts an object back using the conversion rules for its type.
	 * Returns an unaltered object if object.type is null or undefined or if there are no conversion rules for the type.
	 *
	 * @param obj
	 */
	convertObjectBack(obj: Record<string, unknown>): Record<string, unknown> {
		if (!Object.hasOwn(obj, 'type')) {
			return obj;
		}

		if (obj.type === 'manga') {
			obj.type = 'comicManga';
			console.debug(`MDB | updated metadata type`, obj.type);
		}
		if (!MEDIA_TYPES.includes(obj.type as MediaType)) {
			return obj;
		}

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === obj.type);
		const propertyMappings = propertyMappingModel?.properties ?? [];
		const propertyMappingByOriginal = new Map(propertyMappings.map(mapping => [mapping.property, mapping]));
		const propertyMappingByMapped = new Map(propertyMappings.map(mapping => [mapping.newProperty, mapping]));

		const originalObj: Record<string, unknown> = { ...obj };

		for (const [key, value] of Object.entries(obj)) {
			const normalProperty = propertyMappingByOriginal.get(key);
			if (normalProperty) {
				originalObj[key] = value;
				continue;
			}

			const mappedProperty = propertyMappingByMapped.get(key);
			if (mappedProperty) {
				originalObj[mappedProperty.property] = value;
				delete originalObj[key];
			}
		}

		return originalObj;
	}
}
