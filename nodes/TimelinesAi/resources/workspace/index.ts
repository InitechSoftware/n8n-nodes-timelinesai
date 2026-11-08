import {
	NodeOperationError,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';
import { timelinesApiRequest } from '../../shared/transport';

const forWorkspace = { resource: ['workspace'] };

type TeammatesResponse = {
	data?: { teammates?: Array<{ user_id: number; email?: string | null; role?: string; status?: string }> };
};

/**
 * The invite endpoint does not fail for an existing teammate: it silently
 * changes their role and team to the values in the request. Unless the user
 * opts in with "Update Existing Teammate", refuse before calling it.
 */
async function guardExistingTeammate(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (this.getNodeParameter('updateExisting', false) as boolean) return requestOptions;

	const email = String(this.getNodeParameter('email', '')).trim().toLowerCase();
	const response = (await timelinesApiRequest.call(this, 'GET', '/workspace/teammates')) as TeammatesResponse;
	const existing = (response.data?.teammates ?? []).find(
		(teammate) => String(teammate.email ?? '').trim().toLowerCase() === email,
	);

	if (existing) {
		throw new NodeOperationError(this.getNode(), `${email} is already a teammate`, {
			description: `This email belongs to teammate ${existing.user_id} (${existing.role ?? 'unknown role'}, ${existing.status ?? 'unknown status'}). Inviting it again would change their role and team. To do that on purpose, turn on "Update Existing Teammate".`,
			itemIndex: this.getItemIndex(),
		});
	}
	return requestOptions;
}

export const workspaceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forWorkspace },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the workspace',
				description: 'Get the workspace plan, seats and quota use',
				routing: {
					request: { method: 'GET', url: '/workspace' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Get Teammates',
				value: 'getTeammates',
				action: 'Get teammates of the workspace',
				description: 'Get all teammates of the workspace, including pending invitations',
				routing: {
					request: { method: 'GET', url: '/workspace/teammates' },
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'data.teammates' } }],
					},
				},
			},
			{
				name: 'Invite Teammate',
				value: 'inviteTeammate',
				action: 'Invite a teammate to the workspace',
				description: 'Invite a teammate by email. They receive a setup email.',
				routing: {
					request: { method: 'POST', url: '/workspace/invitations' },
					send: { preSend: [guardExistingTeammate] },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Revoke Invitation',
				value: 'revokeInvitation',
				action: 'Revoke a teammate invitation',
				description: 'Revoke an invitation that has not been accepted yet',
				routing: {
					request: { method: 'DELETE', url: '=/workspace/invitations/{{ $parameter.userId }}' },
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }],
					},
				},
			},
		],
		default: 'get',
	},

	// ----- Invite -----
	{
		displayName: 'Update Existing Teammate',
		name: 'updateExisting',
		type: 'boolean',
		default: false,
		description:
			'Whether to allow this email to belong to an existing teammate. If on, TimelinesAI changes that teammate\'s role and team to the values below instead of inviting. If off, the node fails for an existing teammate.',
		displayOptions: { show: { ...forWorkspace, operation: ['inviteTeammate'] } },
	},
	{
		displayName:
			'This changes the role and team of the existing teammate with this email. TimelinesAI may also mark them as invited again.',
		name: 'updateExistingNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: { ...forWorkspace, operation: ['inviteTeammate'], updateExisting: [true] },
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: { show: { ...forWorkspace, operation: ['inviteTeammate'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'inviteFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...forWorkspace, operation: ['inviteTeammate'] } },
		options: [
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'first_name' } },
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'last_name' } },
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				options: [
					{ name: 'Admin', value: 'admin' },
					{ name: 'Agent', value: 'agent' },
					{ name: 'Collaborator', value: 'collaborator' },
					{ name: 'Team Supervisor', value: 'team_supervisor' },
					{ name: 'Teammate', value: 'teammate' },
				],
				default: 'teammate',
				routing: { send: { type: 'body', property: 'role' } },
			},
			{
				displayName: 'Team',
				name: 'team_title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Sales',
				description: 'Name of the team to add the teammate to. Defaults to "Default team".',
				routing: { send: { type: 'body', property: 'team_title' } },
			},
		],
	},

	// ----- Revoke -----
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		default: 0,
		required: true,
		description: 'User ID of the invited teammate, from Invite Teammate or Get Teammates',
		displayOptions: { show: { ...forWorkspace, operation: ['revokeInvitation'] } },
	},
];
