import type MediaDbPlugin from '../main';
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

		// console.log(obj.type);

		if (MEDIA_TYPES.filter(x => x.toString() == obj.type).length < 1) {
			return obj;
		}

		const propertyMappingModel = this.plugin.settings.propertyMappingModels.find(x => x.type === obj.type);
		if (!propertyMappingModel) {
			return obj;
		}

		const propertyMappings = propertyMappingModel.properties;

		const newObj: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(obj)) {
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					let finalValue = value;
					if (propertyMapping.wikilink) {
						if (typeof value === 'string') {
							finalValue = `[[${value}]]`;
						} else if (Array.isArray(value)) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return
							finalValue = value.map(v => (typeof v === 'string' ? `[[${v}]]` : v));
						}
					}
					if (propertyMapping.mapping === PropertyMappingOption.Map) {
						// @ts-ignore
						newObj[propertyMapping.newProperty] = finalValue;
					} else if (propertyMapping.mapping === PropertyMappingOption.Remove) {
						// do nothing
					} else if (propertyMapping.mapping === PropertyMappingOption.Default) {
						// @ts-ignore
						newObj[key] = finalValue;
					}
					break;
				}
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
		const models = this.plugin.settings.propertyMappingModels;

		let matchedModel: (typeof models)[number] | undefined;
		for (const model of models) {
			const typePm = model.properties.find(p => p.property === 'type');
			const typeKey =
				typePm?.mapping === PropertyMappingOption.Map && typePm.newProperty
					? typePm.newProperty
					: 'type';
			if (!Object.hasOwn(obj, typeKey)) {
				continue;
			}
			let typeVal: unknown = obj[typeKey];
			if (typeVal === 'manga') {
				typeVal = 'comicManga';
				console.debug(`MDB | updated metadata type`, typeVal);
			}
			if (typeVal === model.type) {
				matchedModel = model;
				break;
			}
		}

		if (!matchedModel) {
			return obj;
		}

		const propertyMappings = matchedModel.properties;
		const originalObj: Record<string, unknown> = {};

		objLoop: for (const [key, value] of Object.entries(obj)) {
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					originalObj[key] = value;
					continue objLoop;
				}
			}
			for (const propertyMapping of propertyMappings) {
				if (
					propertyMapping.mapping === PropertyMappingOption.Map &&
					propertyMapping.newProperty === key
				) {
					originalObj[propertyMapping.property] = value;
					continue objLoop;
				}
			}
		}

		return originalObj;
	}
}
