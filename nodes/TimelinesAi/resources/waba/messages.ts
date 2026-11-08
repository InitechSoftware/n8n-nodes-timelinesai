import type { INodeProperties } from 'n8n-workflow';
import { messageUidField } from '../../shared/descriptions';
import { paginateByPage } from '../../shared/pagination';
import { simplifyMessages } from '../../shared/utils';
import {
	WABA_CHAT_ID,
	buildWabaMessageBody,
	wabaAccountSelect,
	wabaChatSelect,
	wabaPayloadFields,
} from '../../shared/waba';

const forMessages = { resource: ['wabaMessage'] };
const forReactions = { resource: ['wabaMessageReaction'] };
const forAccounts = { resource: ['wabaAccount'] };
const forTemplates = { resource: ['wabaTemplate'] };
const dataRoot = { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] };
const SEND_OPERATIONS = ['sendInChat', 'sendToPhone'];

export const wabaMessageDescription: INodeProperties[] = [
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
				action: 'Get a WABA message',
				description: 'Get the details of a WABA message',
				routing: { request: { method: 'GET', url: '=/waba/messages/{{ $parameter.messageUid }}' }, output: dataRoot },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many messages in a WABA chat',
				description: 'Get many messages of a WABA chat, newest first by default',
				routing: {
					request: { method: 'GET', url: `=/waba/chats/${WABA_CHAT_ID}/messages` },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data.messages' } }] },
				},
			},
			{
				name: 'Get Status History',
				value: 'getStatusHistory',
				action: 'Get the status history of a WABA message',
				description: 'Get the sending history of a WABA message, including failure reasons',
				routing: {
					request: { method: 'GET', url: '=/waba/messages/{{ $parameter.messageUid }}/status_history' },
					output: dataRoot,
				},
			},
			{
				name: 'Send in Chat',
				value: 'sendInChat',
				action: 'Send a message in a WABA chat',
				description: 'Send text, a file or a template into an existing WABA chat',
				routing: {
					request: { method: 'POST', url: `=/waba/chats/${WABA_CHAT_ID}/messages` },
					send: { preSend: [buildWabaMessageBody] },
					output: dataRoot,
				},
			},
			{
				name: 'Send to Phone',
				value: 'sendToPhone',
				action: 'Send a WABA message to a phone number',
				description: 'Send text, a file or a template to a phone number from a WABA account',
				routing: {
					request: { method: 'POST', url: '/waba/messages' },
					send: { preSend: [buildWabaMessageBody] },
					output: dataRoot,
				},
			},
		],
		default: 'sendInChat',
	},
	{ ...wabaChatSelect, displayOptions: { show: { ...forMessages, operation: ['sendInChat', 'getAll'] } } },
	{
		...wabaAccountSelect,
		description: 'WABA account to send from',
		displayOptions: { show: { ...forMessages, operation: ['sendToPhone'] } },
		routing: { send: { type: 'body', property: 'waba_account_id', value: '={{ Number($value) }}' } },
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
	...wabaPayloadFields({ ...forMessages, operation: SEND_OPERATIONS }),
	{ ...messageUidField, displayOptions: { show: { ...forMessages, operation: ['get', 'getStatusHistory'] } } },
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...forMessages, operation: ['getAll'] } },
		routing: { send: { paginate: true }, operations: { pagination: paginateByPage } },
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
				routing: { request: { qs: { after: '={{$value}}' } } },
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				routing: { request: { qs: { before: '={{$value}}' } } },
			},
			{
				displayName: 'From Me',
				name: 'from_me',
				type: 'boolean',
				default: true,
				description: 'Whether to return only sent messages (on) or only received messages (off)',
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
		displayOptions: { show: { ...forMessages, operation: ['get', 'getAll', ...SEND_OPERATIONS] } },
		routing: { output: { postReceive: [simplifyMessages] } },
	},
];

export const wabaMessageReactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forReactions },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the reaction on a WABA message',
				description: 'Get the current reaction on a WABA message',
				routing: {
					request: { method: 'GET', url: '=/waba/messages/{{ $parameter.messageUid }}/reactions' },
					output: dataRoot,
				},
			},
			{
				name: 'Set',
				value: 'set',
				action: 'Set the reaction on a WABA message',
				description: 'Set or clear your reaction on a WABA message',
				routing: {
					request: { method: 'PATCH', url: '=/waba/messages/{{ $parameter.messageUid }}/reactions' },
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "message_uid": $parameter.messageUid, "reaction": $parameter.reaction } }}',
								},
							},
						],
					},
				},
			},
		],
		default: 'get',
	},
	{ ...messageUidField, displayOptions: { show: forReactions } },
	{
		displayName: 'Reaction',
		name: 'reaction',
		type: 'string',
		default: '',
		placeholder: 'e.g. 👍',
		description: 'A single emoji. Leave empty to clear your reaction.',
		displayOptions: { show: { ...forReactions, operation: ['set'] } },
		routing: { send: { type: 'body', property: 'reaction' } },
	},
];

export const wabaAccountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forAccounts },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a WABA account',
				description: 'Get the details of a WABA account',
				routing: {
					request: { method: 'GET', url: '=/waba/accounts/{{ $parameter.wabaAccount }}' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Analytics Result',
				value: 'getAnalytics',
				action: 'Get the result of a WABA analytics request',
				description: 'Get the state and, once ready, the data of an analytics request',
				routing: {
					request: {
						method: 'GET',
						url: '=/waba/accounts/{{ $parameter.wabaAccount }}/analytics/{{ $parameter.analyticsHandle }}',
					},
					output: dataRoot,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many WABA accounts',
				description: 'Get many WABA accounts of the workspace',
				routing: {
					request: { method: 'GET', url: '/waba/accounts' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data.waba_accounts' } }] },
				},
			},
			{
				name: 'Request Analytics',
				value: 'requestAnalytics',
				action: 'Request WABA account analytics',
				description: 'Start an analytics request. Poll it with Get Analytics Result.',
				routing: {
					request: { method: 'POST', url: '=/waba/accounts/{{ $parameter.wabaAccount }}/analytics' },
					output: dataRoot,
				},
			},
		],
		default: 'getAll',
	},
	{
		...wabaAccountSelect,
		displayOptions: { show: { ...forAccounts, operation: ['get', 'requestAnalytics', 'getAnalytics'] } },
	},
	{
		displayName:
			'Analytics are prepared in the background. Add a Wait node, then use Get Analytics Result with the returned handle until its state is "ready".',
		name: 'analyticsNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { ...forAccounts, operation: ['requestAnalytics'] } },
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'Start of the period. Periods older than 365 days are cut to the last 365 days.',
		displayOptions: { show: { ...forAccounts, operation: ['requestAnalytics'] } },
		routing: {
			send: { type: 'body', property: 'start', value: '={{ Math.floor(new Date($value).getTime() / 1000) }}' },
		},
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'End of the period. A future end is cut to now.',
		displayOptions: { show: { ...forAccounts, operation: ['requestAnalytics'] } },
		routing: {
			send: { type: 'body', property: 'end', value: '={{ Math.floor(new Date($value).getTime() / 1000) }}' },
		},
	},
	{
		displayName: 'Pricing Breakdown',
		name: 'dimensions',
		type: 'multiOptions',
		options: [
			{ name: 'Country', value: 'COUNTRY' },
			{ name: 'Pricing Category', value: 'PRICING_CATEGORY' },
			{ name: 'Pricing Type', value: 'PRICING_TYPE' },
		],
		default: [],
		description: 'Dimensions to break pricing analytics down by. Messaging analytics are not affected.',
		displayOptions: { show: { ...forAccounts, operation: ['requestAnalytics'] } },
		routing: {
			send: { type: 'body', property: 'dimensions', value: '={{ $value.length ? $value.join(",") : undefined }}' },
		},
	},
	{
		displayName: 'Analytics Handle',
		name: 'analyticsHandle',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 3fa07e9dcae4471cbfd0d0e28f6c5a1a',
		description: 'The "handle" returned by Request Analytics',
		displayOptions: { show: { ...forAccounts, operation: ['getAnalytics'] } },
	},
];

export const wabaTemplateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forTemplates },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a WABA template',
				description: 'Get the details of a WABA template, including its components',
				routing: {
					request: { method: 'GET', url: '=/waba/templates/{{ $parameter.templateId }}' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many WABA templates',
				description: 'Get many WABA templates of the workspace',
				routing: {
					request: { method: 'GET', url: '/waba/templates' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data.templates' } }] },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 10388',
		description: 'TimelinesAI ID of the template, as returned by Get Many',
		displayOptions: { show: { ...forTemplates, operation: ['get'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...forTemplates, operation: ['getAll'] } },
		routing: { send: { paginate: true }, operations: { pagination: paginateByPage } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...forTemplates, operation: ['getAll'], returnAll: [false] } },
		routing: { output: { maxResults: '={{$value}}' } },
	},
];
