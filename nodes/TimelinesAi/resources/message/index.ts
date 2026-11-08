import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { applyMultipart, buildMultipart, readInputFile } from '../../shared/multipart';
import {
	CHAT_ID,
	chatSelect,
	messageUidField,
	whatsappAccountPhoneSelect,
} from '../../shared/descriptions';
import { paginateByPage } from '../../shared/pagination';
import { requireTextOrAttachment, simplifyMessages } from '../../shared/utils';

const forMessages = { resource: ['message'] };

async function sendVoiceAsMultipart(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const file = await readInputFile.call(this);
	return applyMultipart(
		requestOptions,
		buildMultipart([
			{ name: 'file', filename: file.filename, contentType: file.contentType, data: file.data },
		]),
	);
}
const SEND_OPERATIONS = ['sendToChat', 'sendToPhone', 'sendToJid'];
const sendOutput = {
	postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }],
};

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forMessages },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a message',
				description: 'Get the details of a message',
				routing: {
					request: { method: 'GET', url: '=/messages/{{ $parameter.messageUid }}' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many messages in a chat',
				description: 'Get many messages of a chat, newest first by default',
				routing: {
					request: { method: 'GET', url: `=/chats/${CHAT_ID}/messages` },
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data.messages' } }],
					},
				},
			},
			{
				name: 'Get Status History',
				value: 'getStatusHistory',
				action: 'Get the status history of a message',
				description: 'Get the sending history of a message, such as Sent, Delivered and Read',
				routing: {
					request: {
						method: 'GET',
						url: '=/messages/{{ $parameter.messageUid }}/status_history',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Send to Chat',
				value: 'sendToChat',
				action: 'Send a message to a chat',
				description: 'Send a message into an existing chat or group',
				routing: {
					request: { method: 'POST', url: `=/chats/${CHAT_ID}/messages` },
					send: { preSend: [requireTextOrAttachment] },
					output: sendOutput,
				},
			},
			{
				name: 'Send to JID',
				value: 'sendToJid',
				action: 'Send a message to a JID',
				description: 'Send a message to a WhatsApp contact or group by its JID',
				routing: {
					request: { method: 'POST', url: '/messages/to_jid' },
					send: { preSend: [requireTextOrAttachment] },
					output: sendOutput,
				},
			},
			{
				name: 'Send Voice Message',
				value: 'sendVoice',
				action: 'Send a voice message to a chat',
				description: 'Send an audio file as a WhatsApp voice note into an existing chat',
				routing: {
					request: { method: 'POST', url: `=/chats/${CHAT_ID}/voice_message` },
					send: { preSend: [sendVoiceAsMultipart] },
					output: sendOutput,
				},
			},
			{
				name: 'Send to Phone',
				value: 'sendToPhone',
				action: 'Send a message to a phone number',
				description: 'Send a message to a phone number, with or without an existing chat',
				routing: {
					request: { method: 'POST', url: '/messages' },
					send: { preSend: [requireTextOrAttachment] },
					output: sendOutput,
				},
			},
		],
		default: 'sendToChat',
	},

	// ----- Target -----
	{
		...chatSelect,
		displayOptions: { show: { ...forMessages, operation: ['sendToChat', 'sendVoice', 'getAll'] } },
	},

	// ----- Voice message -----
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		options: [
			{
				name: 'Binary Data',
				value: 'binaryData',
				description: 'Use an audio file from the binary data of an earlier node',
			},
			{
				name: 'URL',
				value: 'url',
				description: 'Download the audio file from a public URL',
			},
		],
		default: 'binaryData',
		displayOptions: { show: { ...forMessages, operation: ['sendVoice'] } },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the audio file (OGG or OGA)',
		displayOptions: {
			show: { ...forMessages, operation: ['sendVoice'], inputType: ['binaryData'] },
		},
	},
	{
		displayName: 'Audio URL',
		name: 'fileUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. https://example.com/greeting.ogg',
		description: 'Publicly accessible URL of an OGG or OGA audio file',
		displayOptions: { show: { ...forMessages, operation: ['sendVoice'], inputType: ['url'] } },
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. +14155550123',
		description: 'Recipient phone number in international format',
		displayOptions: { show: { ...forMessages, operation: ['sendToPhone'] } },
		routing: { send: { type: 'body', property: 'phone' } },
	},
	{
		displayName: 'JID',
		name: 'jid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 14155550123@s.whatsapp.net',
		description:
			'WhatsApp ID of a contact (phone number followed by @s.whatsapp.net) or a group (group ID followed by @g.us)',
		displayOptions: { show: { ...forMessages, operation: ['sendToJid'] } },
		routing: { send: { type: 'body', property: 'jid' } },
	},
	{
		...whatsappAccountPhoneSelect,
		displayOptions: { show: { ...forMessages, operation: ['sendToPhone', 'sendToJid'] } },
	},
	{
		...messageUidField,
		displayOptions: { show: { ...forMessages, operation: ['get', 'getStatusHistory'] } },
	},

	// ----- Send payload -----
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Message text, up to 2,000 characters. Can be empty if you send an attachment.',
		displayOptions: { show: { ...forMessages, operation: SEND_OPERATIONS } },
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...forMessages, operation: SEND_OPERATIONS } },
		options: [
			{
				displayName: 'Attachment Template ID',
				name: 'attachment_template_id',
				type: 'number',
				default: 0,
				description: 'ID of an attachment template created in the TimelinesAI workspace',
				routing: { send: { type: 'body', property: 'attachment_template_id' } },
			},
			{
				displayName: 'File UID',
				name: 'file_uid',
				type: 'string',
				default: '',
				placeholder: 'e.g. afa9d4dd-978d-4a14-aa1b-bd65c272e645',
				description: 'UID of a file uploaded with File → Upload, sent as an attachment',
				routing: { send: { type: 'body', property: 'file_uid' } },
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				placeholder: 'e.g. lead',
				description: 'Label to apply to the chat when the message is sent',
				routing: { send: { type: 'body', property: 'label' } },
			},
		],
	},
	{
		displayName: 'Reply To Message UID',
		name: 'replyTo',
		type: 'string',
		default: '',
		placeholder: 'e.g. de919486-0c93-409d-ae66-c2bbb544faca',
		description: 'UID of a message in the same chat to quote in the reply',
		displayOptions: { show: { ...forMessages, operation: ['sendToChat'] } },
		routing: { send: { type: 'body', property: 'reply_to', value: '={{ $value || undefined }}' } },
	},

	// ----- Get Many -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...forMessages, operation: ['getAll'] } },
		routing: {
			send: { paginate: true },
			operations: { pagination: paginateByPage },
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...forMessages, operation: ['getAll'], returnAll: [false] } },
		routing: { output: { maxResults: '={{$value}}' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...forMessages, operation: ['getAll'] } },
		options: [
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Return messages created at or after this time',
				routing: { request: { qs: { after: '={{$value}}' } } },
			},
			{
				displayName: 'After Message UID',
				name: 'after_message',
				type: 'string',
				default: '',
				description: 'Return messages created after this message (not including it)',
				routing: { request: { qs: { after_message: '={{$value}}' } } },
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Return messages created at or before this time',
				routing: { request: { qs: { before: '={{$value}}' } } },
			},
			{
				displayName: 'Before Message UID',
				name: 'before_message',
				type: 'string',
				default: '',
				description: 'Return messages created before this message (not including it)',
				routing: { request: { qs: { before_message: '={{$value}}' } } },
			},
			{
				displayName: 'From Me',
				name: 'from_me',
				type: 'boolean',
				default: true,
				description:
					'Whether to return only messages sent from your WhatsApp account (on) or only received messages (off)',
				routing: { request: { qs: { from_me: '={{$value}}' } } },
			},
			{
				displayName: 'Sort Order',
				name: 'sorting_order',
				type: 'options',
				options: [
					{ name: 'Newest First', value: 'desc' },
					{ name: 'Oldest First', value: 'asc' },
				],
				default: 'desc',
				routing: { request: { qs: { sorting_order: '={{$value}}' } } },
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: { show: { ...forMessages, operation: ['get', 'getAll'] } },
		routing: { output: { postReceive: [simplifyMessages] } },
	},
];
