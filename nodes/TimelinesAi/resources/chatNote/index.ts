import type { INodeProperties } from 'n8n-workflow';
import { CHAT_ID, chatSelect } from '../../shared/descriptions';
import { requireNonEmpty } from '../../shared/utils';

const showOnlyForChatNotes = {
	resource: ['chatNote'],
};

export const chatNoteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForChatNotes },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a note in a chat',
				description: 'Add an internal note to a chat. Notes are not sent to the contact.',
				routing: {
					request: {
						method: 'POST',
						url: `=/chats/${CHAT_ID}/notes`,
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
					},
				},
			},
		],
		default: 'create',
	},
	{
		...chatSelect,
		displayOptions: { show: showOnlyForChatNotes },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		description: 'Note text, up to 10,000 characters. Shown as is, without formatting.',
		displayOptions: { show: showOnlyForChatNotes },
		routing: {
			send: {
				type: 'body',
				property: 'text',
				// The API accepts empty notes; an expression resolving to "" would create one.
				preSend: [requireNonEmpty('text', 'Text')],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showOnlyForChatNotes },
		options: [
			{
				displayName: 'Private',
				name: 'is_private',
				type: 'boolean',
				default: true,
				description: 'Whether the note is private (on) or visible to the whole team (off)',
				routing: { send: { type: 'body', property: 'is_private' } },
			},
		],
	},
];
