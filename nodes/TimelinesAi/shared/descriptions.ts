import type { INodeProperties } from 'n8n-workflow';

/**
 * Declarative routing exposes the raw resource-locator value via `$parameter`,
 * without applying the mode's `extractValue`. This expression resolves the chat
 * ID for every mode: a pasted chat URL yields its numeric ID, while list and
 * ID modes pass the value through unchanged.
 */
export const CHAT_ID = '{{ String($parameter.chat).match(/\\/chat\\/(\\d+)/)?.[1] ?? $parameter.chat }}';

/** Optional sending account, sent as `whatsapp_account_phone` only when set. */
export const whatsappAccountPhoneSelect: INodeProperties = {
	displayName: 'WhatsApp Account',
	name: 'whatsappAccount',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description:
		'WhatsApp account to send from. If empty, TimelinesAI uses the most recently connected account in the workspace.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a WhatsApp account...',
			typeOptions: {
				searchListMethod: 'getWhatsAppAccounts',
				searchable: true,
			},
		},
		{
			displayName: 'By Phone',
			name: 'phone',
			type: 'string',
			placeholder: 'e.g. +14155550123',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^\\+?[0-9 ()-]{6,}$',
						errorMessage: 'Enter the account phone number in international format',
					},
				},
			],
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'whatsapp_account_phone',
			value: '={{ $value || undefined }}',
		},
	},
};

export const messageUidField: INodeProperties = {
	displayName: 'Message UID',
	name: 'messageUid',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. de919486-0c93-409d-ae66-c2bbb544faca',
	description: 'UID of the message, as returned when it was sent or by Get Many',
};

export const chatSelect: INodeProperties = {
	displayName: 'Chat',
	name: 'chat',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a chat...',
			typeOptions: {
				searchListMethod: 'getChats',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1000001',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9]+$',
						errorMessage: 'Chat ID must be a number',
					},
				},
			],
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://app.timelines.ai/chat/1000001/messages/',
			extractValue: {
				type: 'regex',
				regex: '\\/chat\\/([0-9]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '.*\\/chat\\/[0-9]+.*',
						errorMessage: 'Not a valid TimelinesAI chat URL',
					},
				},
			],
		},
	],
};
