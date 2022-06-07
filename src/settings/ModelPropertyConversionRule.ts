import {containsOnlyLettersAndUnderscores} from '../utils/Utils';

export class ModelPropertyConversionRule {
	property: string;
	newProperty: string;

	constructor(conversionRule: string) {
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
	}
}
