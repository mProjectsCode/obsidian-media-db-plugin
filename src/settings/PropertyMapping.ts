import type { MediaType } from '../utils/MediaType';
import { containsOnlyLettersAndUnderscores, PropertyMappingNameConflictError, PropertyMappingValidationError } from '../utils/Utils';

// Plain object interfaces for serialization
export interface PropertyMappingData {
	property: string;
	newProperty: string;
	mapping: PropertyMappingOption;
	locked?: boolean;
	wikilink?: boolean;
}

export interface PropertyMappingModelData {
	type: MediaType;
	properties: PropertyMappingData[];
}

export enum PropertyMappingOption {
	Default = 'default',
	Map = 'remap',
	Remove = 'remove',
}

export const propertyMappingOptions = [PropertyMappingOption.Default, PropertyMappingOption.Map, PropertyMappingOption.Remove];

export class PropertyMappingModel {
	type: MediaType;
	properties: PropertyMapping[];

	constructor(type: MediaType, properties?: PropertyMapping[]) {
		this.type = type;
		this.properties = properties ?? [];
	}

	validate(): { res: boolean; err?: Error } {
		console.debug(`MDB | validated property mappings for ${this.type}`);

		// check properties
		for (const property of this.properties) {
			const propertyValidation = property.validate();
			if (!propertyValidation.res) {
				return {
					res: false,
					err: propertyValidation.err,
				};
			}
		}

		// check for name collisions
		for (const property of this.getMappedProperties()) {
			const propertiesWithSameTarget = this.getMappedProperties().filter(x => x.newProperty === property.newProperty);
			if (propertiesWithSameTarget.length === 0) {
				// if we get there, then something in this code is wrong
			} else if (propertiesWithSameTarget.length === 1) {
				// all good
			} else {
				// two or more properties are mapped to the same property
				return {
					res: false,
					err: new PropertyMappingNameConflictError(
						`Multiple remapped properties (${propertiesWithSameTarget.map(x => x.toString()).toString()}) may not share the same name.`,
					),
				};
			}
		}
		// remapped properties may not have the same name as any original property
		for (const property of this.getMappedProperties()) {
			const propertiesWithSameTarget = this.properties.filter(x => x.newProperty === property.property);
			if (propertiesWithSameTarget.length === 0) {
				// all good
			} else {
				// a mapped property shares the same name with an original property
				return {
					res: false,
					err: new PropertyMappingNameConflictError(`Remapped property (${property}) may not share it's new name with an existing property.`),
				};
			}
		}

		return {
			res: true,
		};
	}

	getMappedProperties(): PropertyMapping[] {
		return this.properties.filter(x => x.mapping === PropertyMappingOption.Map);
	}

	copy(): PropertyMappingModel {
		const copy = new PropertyMappingModel(this.type);
		for (const property of this.properties) {
			const propertyCopy = new PropertyMapping(property.property, property.newProperty, property.mapping, property.locked, property.wikilink);
			copy.properties.push(propertyCopy);
		}
		return copy;
	}

	// Serialization - returns a plain object that can be JSON.stringify'd
	toJSON(): PropertyMappingModelData {
		return {
			type: this.type,
			properties: this.properties.map(p => p.toJSON()),
		};
	}

	// Deserialization - creates a PropertyMappingModel from a plain object
	static fromJSON(json: PropertyMappingModelData): PropertyMappingModel {
		return new PropertyMappingModel(
			json.type,
			json.properties.map(p => PropertyMapping.fromJSON(p)),
		);
	}

	/**
	 * Migrates loaded settings to match the structure of default settings.
	 * - Adds new properties from defaults that don't exist in loaded settings
	 * - Preserves user customizations from loaded settings
	 * - Updates locked status from defaults
	 *
	 * @param loadedModels - Models loaded from disk (may be outdated)
	 * @param defaultModels - Current default models (source of truth for structure)
	 * @returns Migrated models with correct structure and preserved user settings
	 */
	static migrateModels(loadedModels: PropertyMappingModelData[], defaultModels: PropertyMappingModel[]): PropertyMappingModel[] {
		const migratedModels: PropertyMappingModel[] = [];

		for (const defaultModel of defaultModels) {
			const loadedModel = loadedModels.find(m => m.type === defaultModel.type);

			if (!loadedModel) {
				// New model type - use default
				migratedModels.push(defaultModel);
				continue;
			}

			// Migrate properties
			const migratedProperties: PropertyMapping[] = [];
			for (const defaultProperty of defaultModel.properties) {
				const loadedProperty = loadedModel.properties.find(p => p.property === defaultProperty.property);

				if (!loadedProperty) {
					// New property - use default
					migratedProperties.push(defaultProperty);
				} else {
					// Existing property - merge: take locked from default, customizations from loaded
					migratedProperties.push(
						new PropertyMapping(
							loadedProperty.property,
							loadedProperty.newProperty,
							loadedProperty.mapping,
							defaultProperty.locked, // locked status from default
							loadedProperty.wikilink ?? false,
						),
					);
				}
			}

			migratedModels.push(new PropertyMappingModel(defaultModel.type, migratedProperties));
		}

		return migratedModels;
	}
}

export class PropertyMapping {
	property: string;
	newProperty: string;
	locked: boolean;
	mapping: PropertyMappingOption;
	wikilink: boolean;

	constructor(property: string, newProperty: string, mapping: PropertyMappingOption, locked?: boolean, wikilink?: boolean) {
		this.property = property;
		this.newProperty = newProperty;
		this.mapping = mapping;
		this.locked = locked ?? false;
		this.wikilink = wikilink ?? false;
	}

	validate(): { res: boolean; err?: Error } {
		// locked property may only be default
		if (this.locked) {
			if (this.mapping === PropertyMappingOption.Remove) {
				return {
					res: false,
					err: new PropertyMappingValidationError(`Error in property mapping "${this.toString()}": locked property may not be removed.`),
				};
			}
			if (this.mapping === PropertyMappingOption.Map) {
				return {
					res: false,
					err: new PropertyMappingValidationError(`Error in property mapping "${this.toString()}": locked property may not be remapped.`),
				};
			}
		}

		if (this.mapping === PropertyMappingOption.Default) {
			return { res: true };
		}
		if (this.mapping === PropertyMappingOption.Remove) {
			return { res: true };
		}

		if (!this.property || !containsOnlyLettersAndUnderscores(this.property)) {
			return {
				res: false,
				err: new PropertyMappingValidationError(`Error in property mapping "${this.toString()}": property may not be empty and may only contain letters and underscores.`),
			};
		}

		if (!this.newProperty || !containsOnlyLettersAndUnderscores(this.newProperty)) {
			return {
				res: false,
				err: new PropertyMappingValidationError(
					`Error in property mapping "${this.toString()}": new property may not be empty and may only contain letters and underscores.`,
				),
			};
		}

		return {
			res: true,
		};
	}

	toString(): string {
		if (this.mapping === PropertyMappingOption.Default) {
			return this.property;
		} else if (this.mapping === PropertyMappingOption.Map) {
			return `${this.property} -> ${this.newProperty}`;
		} else if (this.mapping === PropertyMappingOption.Remove) {
			return `remove ${this.property}`;
		}

		return this.property;
	}

	// Serialization - returns a plain object
	toJSON(): PropertyMappingData {
		return {
			property: this.property,
			newProperty: this.newProperty,
			mapping: this.mapping,
			locked: this.locked,
			wikilink: this.wikilink,
		};
	}

	// Deserialization - creates a PropertyMapping from a plain object
	static fromJSON(json: PropertyMappingData): PropertyMapping {
		return new PropertyMapping(json.property, json.newProperty, json.mapping, json.locked, json.wikilink);
	}
}
