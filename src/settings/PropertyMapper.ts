import {PropertyMappingOption} from './PropertyMapping';
import {MEDIA_TYPES} from '../utils/MediaTypeManager';
import MediaDbPlugin from '../main';

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
	convertObject(obj: object): object {
		if (!obj.hasOwnProperty('type')) {
			return obj;
		}

		// @ts-ignore
		// console.log(obj.type);

		// @ts-ignore
		if (MEDIA_TYPES.filter(x => x.toString() == obj.type).length < 1) {
			return obj;
		}

		// @ts-ignore
		const propertyMappings = this.plugin.settings.propertyMappingModels.find(x => x.type === obj.type).properties;

		const newObj: object = {};

		for (const [key, value] of Object.entries(obj)) {
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					if (propertyMapping.mapping === PropertyMappingOption.Map) {
						// @ts-ignore
						newObj[propertyMapping.newProperty] = value;
					} else if (propertyMapping.mapping === PropertyMappingOption.Remove) {

					} else if (propertyMapping.mapping === PropertyMappingOption.Default) {
						// @ts-ignore
						newObj[key] = value;
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
	convertObjectBack(obj: object): object {
		if (!obj.hasOwnProperty('type')) {
			return obj;
		}

		// @ts-ignore
		if (MEDIA_TYPES.contains(obj.type)) {
			return obj;
		}

		// @ts-ignore
		const propertyMappings = this.plugin.settings.propertyMappingModels.find(x => x.type === obj.type).properties;

		const originalObj: object = {};

		objLoop: for (const [key, value] of Object.entries(obj)) {
			// first try if it is a normal property
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.property === key) {
					// @ts-ignore
					originalObj[key] = value;

					continue objLoop;
				}
			}

			// otherwise see if it is a mapped property
			for (const propertyMapping of propertyMappings) {
				if (propertyMapping.newProperty === key) {
					// @ts-ignore
					originalObj[propertyMapping.property] = value;

					continue objLoop;
				}
			}
		}

		return originalObj;
	}
}
