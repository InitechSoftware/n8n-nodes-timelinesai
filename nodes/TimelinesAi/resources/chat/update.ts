import type { INodeProperties } from 'n8n-workflow';
import { chatSelect } from '../../shared/descriptions';
import { simplifyChats } from '../../shared/utils';

const showOnlyForChatUpdate = {
	operation: ['update'],
	resource: ['chat'],
};

export const chatUpdateDescription: INodeProperties[] = [
	{
		...chatSelect,
		displayOptions: { show: showOnlyForChatUpdate },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForChatUpdate },
		options: [
			{
				displayName: 'AI Agent Enabled',
				name: 'chatgpt_autoresponse_enabled',
				type: 'boolean',
				default: false,
				description: 'Whether the TimelinesAI AI Agent replies automatically in this chat',
				routing: { send: { type: 'body', property: 'chatgpt_autoresponse_enabled' } },
			},
			{
				displayName: 'Closed',
				name: 'closed',
				type: 'boolean',
				default: false,
				description: 'Whether the chat is closed (on) or open (off)',
				routing: { send: { type: 'body', property: 'closed' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. John Doe',
				description: 'New chat name. Must be unique in the workspace.',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Read',
				name: 'read',
				type: 'boolean',
				default: true,
				description: 'Whether the chat is marked as read (on) or unread (off)',
				routing: { send: { type: 'body', property: 'read' } },
			},
			{
				displayName: 'Responsible',
				name: 'responsible',
				type: 'string',
				default: '',
				placeholder: 'e.g. john.doe@acme.com',
				description:
					'Registration email of the teammate to assign the chat to. Leave empty to unassign the chat.',
				routing: { send: { type: 'body', property: 'responsible' } },
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForChatUpdate },
		description: 'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [simplifyChats],
			},
		},
	},
];
