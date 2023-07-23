// obsidian already uses moment, so no need to package it twice!
// import { moment } from 'obsidian'; // doesn't work for release build
// obsidian uses a namespace-style import for moment, which ES6 doesn't allow anymore
const obsidian = require('obsidian');
const moment = obsidian.moment;

export class DateFormatter {
	toFormat: string;
	localeString: string;

	constructor() {
		this.toFormat = 'YYYY-MM-DD';
		// get locale string (e.g. en, en-gb, de, fr, etc.)
		this.localeString = new Intl.DateTimeFormat().resolvedOptions().locale;
	}

	setFormat(format: string): void {
		this.toFormat = format;
	}

	getPreview(format?: string): string {
		const today = moment();
		today.locale(this.localeString);

		if (!format) {
			format = this.toFormat;
		}

		return today.format(format);
	}

	/**
	 * Tries to format a given date string with the currently set date format.
	 * You can set a date format by calling `setFormat()`.
	 *
	 * @param dateString the date string to be formatted
	 * @param dateFormat the current format of `dateString`. When this is `null` and the actual format of the 
	 * given date string is not `C2822` or `ISO` format, this function will try to guess the format by using the native `Date` module.
	 * @returns formatted date string or null if `dateString` is not a valid date
	 */
	format(dateString: string, dateFormat?: string): string | null {
		if (!dateString) {
			return null;
		}

		let date: moment.Moment;

		if (!dateFormat) {
			// reading date formats other then C2822 or ISO with moment is deprecated
			if (this.hasMomentFormat(dateString)) {
				// expect C2822 or ISO format
				date = moment(dateString);
			} else {
				// try to read date string with native Date
				date = moment(new Date(dateString));
			}
			date.locale(this.localeString); // set local locale definition for moment
		} else {
			date = moment(dateString, dateFormat, this.localeString);
		}

		// format date (if it is valid)
		return date.isValid() ? date.format(this.toFormat) : null;
	}

	private hasMomentFormat(dateString: string): boolean {
		const date = moment(dateString, true); // strict mode
		return date.isValid();
	}
}
