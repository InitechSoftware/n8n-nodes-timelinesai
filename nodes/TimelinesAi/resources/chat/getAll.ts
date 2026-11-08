import type { INodeProperties } from 'n8n-workflow';
import { paginateByPage } from '../../shared/pagination';
import { simplifyChats } from '../../shared/utils';

const showOnlyForChatGetMany = {
	operation: ['getAll'],
	resource: ['chat'],
};

export const chatGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: showOnlyForChatGetMany },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				// Always paginate: a Limit above the API page size (50) also needs more than one page.
				paginate: true,
			},
			operations: {
				pagination: paginateByPage,
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForChatGetMany,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			output: {
				maxResults: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: showOnlyForChatGetMany },
		default: {},
		options: [
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether to return only closed chats (on) or only open chats (off)',
				routing: { request: { qs: { closed: '={{$value}}' } } },
			},
			{
				displayName: 'Contact Phone',
				name: 'whatsapp_phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. +14155550123',
				description:
					'Comma-separated phone numbers. Matches direct chats with these contacts and groups that contain them.',
				routing: { request: { qs: { whatsapp_phone: '={{$value}}' } } },
			},
			{
				displayName: 'Created After',
				name: 'created_after',
				type: 'dateTime',
				default: '',
				routing: { request: { qs: { created_after: '={{$value}}' } } },
			},
			{
				displayName: 'Created Before',
				name: 'created_before',
				type: 'dateTime',
				default: '',
				routing: { request: { qs: { created_before: '={{$value}}' } } },
			},
			{
				displayName: 'Group',
				name: 'group',
				type: 'boolean',
				default: false,
				description: 'Whether to return only group chats (on) or only direct chats (off)',
				routing: { request: { qs: { group: '={{$value}}' } } },
			},
			{
				displayName: 'Labels',
				name: 'label',
				type: 'string',
				default: '',
				placeholder: 'e.g. customer,vip',
				description: 'Comma-separated labels. Returns chats with at least one of them.',
				routing: { request: { qs: { label: '={{$value}}' } } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. acme sales',
				description: 'Comma-separated strings. Returns chats whose name contains any of them.',
				routing: { request: { qs: { name: '={{$value}}' } } },
			},
			{
				displayName: 'Read',
				name: 'read',
				type: 'boolean',
				default: false,
				description: 'Whether to return only read chats (on) or only unread chats (off)',
				routing: { request: { qs: { read: '={{$value}}' } } },
			},
			{
				displayName: 'Responsible',
				name: 'responsible',
				type: 'string',
				default: '',
				placeholder: 'e.g. john.doe@acme.com',
				description: 'Comma-separated emails of the teammates the chats are assigned to',
				routing: { request: { qs: { responsible: '={{$value}}' } } },
			},
			{
				displayName: 'WhatsApp Account IDs',
				name: 'whatsapp_account_id',
				type: 'string',
				default: '',
				placeholder: 'e.g. 14155550123@s.whatsapp.net',
				description: 'Comma-separated WhatsApp account IDs (WID format) the chats belong to',
				routing: { request: { qs: { whatsapp_account_id: '={{$value}}' } } },
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForChatGetMany },
		description: 'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [simplifyChats],
			},
		},
	},
];
