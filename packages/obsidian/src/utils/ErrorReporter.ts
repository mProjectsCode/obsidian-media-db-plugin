import { Notice } from 'obsidian';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';

export class ErrorReporter {
	notice(error: MDBError): void {
		const message = error.userMessage ?? error.message;
		new Notice(message);
	}

	log(error: MDBError): void {
		Logger.warn('MDB | error', error);
	}

	report(error: MDBError): void {
		this.log(error);

		if (error.kind !== MDBErrorKind.Cancelled) {
			this.notice(error);
		}
	}
}
