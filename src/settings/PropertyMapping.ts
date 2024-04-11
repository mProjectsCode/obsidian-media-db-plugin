import { containsOnlyLettersAndUnderscores, PropertyMappingNameConflictError, PropertyMappingValidationError } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

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
			const propertyCopy = new PropertyMapping(property.property, property.newProperty, property.mapping, property.locked);
			copy.properties.push(propertyCopy);
		}
		return copy;
	}
}

export class PropertyMapping {
	property: string;
	newProperty: string;
	locked: boolean;
	mapping: PropertyMappingOption;

	constructor(property: string, newProperty: string, mapping: PropertyMappingOption, locked?: boolean) {
		this.property = property;
		this.newProperty = newProperty;
		this.mapping = mapping;
		this.locked = locked ?? false;
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
				err: new PropertyMappingValidationError(`Error in property mapping "${this.toString()}": property may not be empty and only contain letters and underscores.`),
			};
		}

		if (!this.newProperty || !containsOnlyLettersAndUnderscores(this.newProperty)) {
			return {
				res: false,
				err: new PropertyMappingValidationError(`Error in property mapping "${this.toString()}": new property may not be empty and only contain letters and underscores.`),
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
}
