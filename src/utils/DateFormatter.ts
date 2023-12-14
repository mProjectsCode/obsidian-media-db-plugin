import { moment } from 'obsidian';

export class DateFormatter {
	toFormat: string;
	locale: string;

	constructor() {
		this.toFormat = 'YYYY-MM-DD';
		// get locale of this machine (e.g. en, en-gb, de, fr, etc.)
		this.locale = new Intl.DateTimeFormat().resolvedOptions().locale;
	}

	setFormat(format: string): void {
		this.toFormat = format;
	}

	getPreview(format?: string): string {
		const today = moment();

		if (!format) {
			format = this.toFormat;
		}

		return today.locale(this.locale).format(format);
	}

	/**
	 * Tries to format a given date string with the currently set date format.
	 * You can set a date format by calling `setFormat()`.
	 *
	 * @param dateString the date string to be formatted
	 * @param dateFormat the current format of `dateString`. When this is `null` and the actual format of the
	 * given date string is not `C2822` or `ISO` format, this function will try to guess the format by using the native `Date` module.
	 * @param locale the locale of `dateString`. This is needed when `dateString` includes a month or day name and its locale format differs
	 * from the locale of this machine.
	 * @returns formatted date string or null if `dateString` is not a valid date
	 */
	format(dateString: string, dateFormat?: string, locale: string = 'en'): string | null {
		if (!dateString) {
			return null;
		}

		let date: moment.Moment;

		if (!dateFormat) {
			// reading date formats other then C2822 or ISO with moment is deprecated
			// see https://momentjs.com/docs/#/parsing/string/
			if (this.hasMomentFormat(dateString)) {
				// expect C2822 or ISO format
				date = moment(dateString);
			} else {
				// try to read date string with native Date
				date = moment(new Date(dateString));
			}
		} else {
			date = moment(dateString, dateFormat, locale);
		}

		// format date (if it is valid)
		return date.isValid() ? date.locale(this.locale).format(this.toFormat) : null;
	}

	private hasMomentFormat(dateString: string): boolean {
		const date = moment(dateString, true); // strict mode
		return date.isValid();
	}
}
