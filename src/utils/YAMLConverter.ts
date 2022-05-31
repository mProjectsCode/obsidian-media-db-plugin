export class YAMLConverter {
	static toYaml(obj: any): string {
		let output = '';

		for (const [key, value] of Object.entries(obj)) {
			output += `${key}: ${YAMLConverter.toYamlString(value, 0)}\n`;
		}

		return output;
	}

	private static toYamlString(value: any, indentation: number): string {
		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		} else if (typeof value === 'number') {
			return value.toString();
		} else if (typeof value === 'string') {
			return '"' + value + '"';
		} else if (typeof value === 'object') {
			let output = '';

			if (Array.isArray(value)) {
				for (const valueElement of value) {
					output += `\n${YAMLConverter.calculateSpacing(indentation)}  - ${YAMLConverter.toYamlString(valueElement, indentation + 1)}`;
				}
			} else {
				for (const [objKey, objValue] of Object.entries(value)) {
					output += `\n${YAMLConverter.calculateSpacing(indentation)}    ${objKey}: ${YAMLConverter.toYamlString(objValue, indentation + 1)}`;
				}
			}

			return output;
		}
	}

	private static calculateSpacing(indentation: number): string {
		return ' '.repeat(indentation * 4);
	}
}
