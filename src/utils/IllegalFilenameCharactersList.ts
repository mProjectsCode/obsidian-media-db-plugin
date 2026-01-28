// Illegal characters in the form `[illegal_character, replacement][]`
export const ILLEGAL_FILENAME_CHARACTERS = [
	['/', '-'],
	['\\', '-'],
	['<', ''],
	['>', ''],
	[':', ' - '],
	['"', "'"],
	['|', ' - '],
	['?', ''],
	['*', ''],
	['[', '('],
	[']', ')'],
	['^', ''],
	['#', ''],
];
