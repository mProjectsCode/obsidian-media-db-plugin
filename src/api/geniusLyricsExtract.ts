const LYRICS_CONTAINER_OPEN_RE =
	/<div\b[^>]*\bdata-lyrics-container\s*=\s*(?:"true"|'true'|true)[^>]*>/gi;

function stripHtmlToPlainLyrics(fragment: string): string {
	return fragment
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.trim();
}

/** Parses nested <div> blocks; the naive `*?</div>` regex stops at the first inner close tag. */
function extractBalancedDivInnerHtml(html: string, contentStart: number): string {
	let depth = 1;
	let i = contentStart;
	const openRe = /<div\b/gi;
	const closeRe = /<\/div>/gi;
	while (depth > 0) {
		openRe.lastIndex = i;
		closeRe.lastIndex = i;
		const om = openRe.exec(html);
		const cm = closeRe.exec(html);
		if (!cm) {
			break;
		}
		const oIdx = om ? om.index : Number.POSITIVE_INFINITY;
		const cIdx = cm.index;
		if (om && oIdx < cIdx) {
			depth++;
			i = om.index + om[0].length;
		} else {
			depth--;
			if (depth === 0) {
				return html.slice(contentStart, cIdx);
			}
			i = cm.index + cm[0].length;
		}
	}
	return '';
}

function collectLyricsContainersRegex(html: string): string[] {
	const chunks: string[] = [];
	let m: RegExpExecArray | null;
	LYRICS_CONTAINER_OPEN_RE.lastIndex = 0;
	while ((m = LYRICS_CONTAINER_OPEN_RE.exec(html)) !== null) {
		const inner = extractBalancedDivInnerHtml(html, m.index + m[0].length);
		if (inner) {
			chunks.push(inner);
		}
	}
	return chunks;
}

function extractOneContainerPlain(el: Element): string {
	const clone = el.cloneNode(true) as Element;
	clone.querySelectorAll('[data-exclude-from-selection="true"]').forEach(node => node.remove());
	return stripHtmlToPlainLyrics(clone.innerHTML);
}

export function extractLyricsFromGeniusHtml(html: string): string {
	let chunks: string[] = [];
	try {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		doc.querySelectorAll('[data-lyrics-container="true"]').forEach(c => {
			const plain = extractOneContainerPlain(c);
			if (plain) {
				chunks.push(plain);
			}
		});
	} catch {
		chunks = [];
	}

	if (chunks.length === 0) {
		return ''
	}

	return chunks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
