import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

/**
 * preSend guard for required text parameters. `required: true` is only
 * enforced in the editor; an expression that resolves to an empty string
 * still reaches the API.
 */
export function requireNonEmpty(parameterName: string, displayName: string) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const value = this.getNodeParameter(parameterName, '') as string;
		if (String(value).trim() === '') {
			throw new NodeOperationError(this.getNode(), `${displayName} is empty`, {
				description: `Enter a value for "${displayName}". If it comes from an expression, check that the expression resolves to text for this item.`,
				itemIndex: this.getItemIndex(),
			});
		}
		return requestOptions;
	};
}

const SIMPLIFIED_CHAT_FIELDS = [
	'id',
	'name',
	'phone',
	'is_group',
	'closed',
	'read',
	'labels',
	'responsible_email',
	'whatsapp_account_id',
	'last_message_timestamp',
] as const;

const SIMPLIFIED_MESSAGE_FIELDS = [
	'uid',
	'chat_id',
	'timestamp',
	'from_me',
	'sender_phone',
	'sender_name',
	'text',
	'status',
	'has_attachment',
	'attachment_url',
] as const;

export async function simplifyMessages(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (!this.getNodeParameter('simplify', true)) return items;
	return items.map((item) => ({ ...item, json: pickFields(item.json, SIMPLIFIED_MESSAGE_FIELDS) }));
}

/**
 * preSend guard for Send operations: the API needs text, an attachment, or
 * both. Without this, an empty expression would surface as a vague API error.
 */
export async function requireTextOrAttachment(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;
	const hasText = typeof body.text === 'string' && body.text.trim() !== '';
	const hasAttachment = Boolean(body.file_uid) || Boolean(body.attachment_template_id);
	if (!hasText && !hasAttachment) {
		throw new NodeOperationError(this.getNode(), 'The message is empty', {
			description:
				'Enter "Text", or add a "File UID" or "Attachment Template ID" under Additional Fields. If the text comes from an expression, check that it resolves to text for this item.',
			itemIndex: this.getItemIndex(),
		});
	}
	// An empty Text field is still routed as `text: ""`; drop it for attachment-only messages.
	if (!hasText) delete body.text;
	return requestOptions;
}

export function pickFields(source: IDataObject, fields: readonly string[]): IDataObject {
	const result: IDataObject = {};
	for (const field of fields) {
		if (field in source) result[field] = source[field];
	}
	return result;
}

export async function simplifyChats(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (!this.getNodeParameter('simplify', true)) return items;
	return items.map((item) => ({ ...item, json: pickFields(item.json, SIMPLIFIED_CHAT_FIELDS) }));
}
