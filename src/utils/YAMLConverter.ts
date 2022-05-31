export class YAMLConverter {
	static toYaml(obj: any): string {
		let output = '';

		for (const [key, value] of Object.entries(obj)) {
			output += `${key}: ${YAMLConverter.toYamlString(value)}\n`;
		}

		return output;
	}

	private static toYamlString(value: any): string {
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
					output += `\n  - ${YAMLConverter.toYamlString(valueElement)}`;
				}
			} else {
				for (const [objKey, objValue] of Object.entries(value)) {
					output += `\n    ${objKey}: ${YAMLConverter.toYamlString(objValue)}`;
				}
			}

			return output;
		}
	}
}
