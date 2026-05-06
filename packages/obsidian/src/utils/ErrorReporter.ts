import { Notice } from 'obsidian';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind } from 'packages/obsidian/src/utils/AppError';
import { Logger } from 'packages/obsidian/src/utils/Logger';

export class ErrorReporter {
	notice(error: AppError): void {
		const message = error.userMessage ?? error.message;
		new Notice(message);
	}

	log(error: AppError): void {
		Logger.warn('MDB | error', error);
	}

	report(error: AppError): void {
		this.log(error);

		if (error.kind !== AppErrorKind.Cancelled) {
			this.notice(error);
		}
	}
}
