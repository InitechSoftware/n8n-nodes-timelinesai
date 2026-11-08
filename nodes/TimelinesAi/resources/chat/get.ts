import type { INodeProperties } from 'n8n-workflow';
import { chatSelect } from '../../shared/descriptions';
import { simplifyChats } from '../../shared/utils';

const showOnlyForChatGet = {
	operation: ['get'],
	resource: ['chat'],
};

export const chatGetDescription: INodeProperties[] = [
	{
		...chatSelect,
		displayOptions: { show: showOnlyForChatGet },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: showOnlyForChatGet },
		description: 'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [simplifyChats],
			},
		},
	},
];
