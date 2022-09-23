import {containsOnlyLettersAndUnderscores} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';

export enum PropertyMappingOption {
	None = 'none',
	Map = 'remap',
	Remove = 'remove',
}

export const propertyMappingOptions = [PropertyMappingOption.None, PropertyMappingOption.Map, PropertyMappingOption.Remove];

export interface PropertyMappingModel {
	type: MediaType,
	properties: PropertyMapping[],
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

		/*
		const conversionRuleParts = conversionRule.split('->');
		if (conversionRuleParts.length !== 2) {
			throw Error(`Conversion rule "${conversionRule}" may only have exactly one "->"`);
		}

		let property = conversionRuleParts[0].trim();
		let newProperty = conversionRuleParts[1].trim();

		if (!property || !containsOnlyLettersAndUnderscores(property)) {
			throw Error(`Error in conversion rule "${conversionRule}": property may not be empty and only contain letters and underscores.`);
		}

		if (!newProperty || !containsOnlyLettersAndUnderscores(newProperty)) {
			throw Error(`Error in conversion rule "${conversionRule}": new property may not be empty and only contain letters and underscores.`);
		}

		this.property = property;
		this.newProperty = newProperty;

		 */
	}

	validate(): string {
		if (!this.property || !containsOnlyLettersAndUnderscores(this.property)) {
			return `Error in conversion rule "${this.toString()}": property may not be empty and only contain letters and underscores.`;
		}

		if (!this.newProperty || !containsOnlyLettersAndUnderscores(this.newProperty)) {
			return `Error in conversion rule "${this.toString()}": new property may not be empty and only contain letters and underscores.`;
		}

		return '';
	}

	toString(): string {
		if (this.mapping === PropertyMappingOption.None) {
			return this.property;
		} else if (this.mapping === PropertyMappingOption.Map) {
			return `${this.property} -> ${this.newProperty}`;
		} else if (this.mapping === PropertyMappingOption.Remove) {
			return `remove ${this.property}`;
		}

		return this.property;
	}
}
