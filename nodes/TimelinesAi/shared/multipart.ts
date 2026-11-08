import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
} from 'n8n-workflow';

type TextPart = { name: string; value: string };
type FilePart = { name: string; filename: string; contentType: string; data: Buffer };
type Part = TextPart | FilePart;

/**
 * Builds a multipart/form-data body as a single Buffer.
 *
 * n8n's HTTP layer only recognises multipart bodies created with the
 * `form-data` package, and verified community nodes may not ship runtime
 * dependencies. A raw Buffer with an explicit Content-Type is sent as is.
 */
export function buildMultipart(parts: Part[]): { body: Buffer; contentType: string } {
	const boundary = `----n8nTimelinesAi${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
	const chunks: Buffer[] = [];

	for (const part of parts) {
		const escapedName = part.name.replace(/"/g, '%22');
		if ('data' in part) {
			const escapedFilename = part.filename.replace(/"/g, '%22').replace(/[\r\n]/g, ' ');
			chunks.push(
				Buffer.from(
					`--${boundary}\r\n` +
						`Content-Disposition: form-data; name="${escapedName}"; filename="${escapedFilename}"\r\n` +
						`Content-Type: ${part.contentType}\r\n\r\n`,
					'utf8',
				),
				part.data,
				Buffer.from('\r\n', 'utf8'),
			);
		} else {
			chunks.push(
				Buffer.from(
					`--${boundary}\r\n` +
						`Content-Disposition: form-data; name="${escapedName}"\r\n\r\n` +
						`${part.value}\r\n`,
					'utf8',
				),
			);
		}
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

	return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** The file to upload, read from n8n binary data or downloaded from a URL. */
export async function readInputFile(
	this: IExecuteSingleFunctions,
): Promise<{ data: Buffer; filename: string; contentType: string }> {
	const inputType = this.getNodeParameter('inputType', 'binaryData') as string;

	if (inputType === 'url') {
		const url = String(this.getNodeParameter('fileUrl', '')).trim();
		if (!url) {
			throw new NodeOperationError(this.getNode(), 'File URL is empty', {
				description: 'Enter a publicly accessible URL of the file.',
				itemIndex: this.getItemIndex(),
			});
		}
		const response = (await this.helpers.httpRequest({
			url,
			method: 'GET',
			encoding: 'arraybuffer',
			returnFullResponse: true,
		})) as { body: ArrayBuffer | Buffer; headers: IDataObject };
		const data = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body);
		const headerType = String(response.headers['content-type'] ?? '').split(';')[0].trim();
		const pathName = url.split('?')[0].split('#')[0];
		const filename = decodeURIComponent(pathName.substring(pathName.lastIndexOf('/') + 1)) || 'file';
		return { data, filename, contentType: headerType || 'application/octet-stream' };
	}

	const propertyName = this.getNodeParameter('binaryPropertyName', 'data') as string;
	const binary = this.helpers.assertBinaryData(propertyName);
	const data = await this.helpers.getBinaryDataBuffer(propertyName);
	return {
		data,
		filename: binary.fileName ?? 'file',
		contentType: binary.mimeType || 'application/octet-stream',
	};
}

/** Replaces the request body with a multipart body and fixes the Content-Type header. */
export function applyMultipart(
	requestOptions: IHttpRequestOptions,
	multipart: { body: Buffer; contentType: string },
): IHttpRequestOptions {
	const headers = { ...(requestOptions.headers ?? {}) } as IDataObject;
	for (const key of Object.keys(headers)) {
		if (key.toLowerCase() === 'content-type') delete headers[key];
	}
	headers['Content-Type'] = multipart.contentType;
	requestOptions.headers = headers;
	requestOptions.body = multipart.body;
	return requestOptions;
}
