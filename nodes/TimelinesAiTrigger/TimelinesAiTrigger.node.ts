import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { timelinesApiRequest } from '../TimelinesAi/shared/transport';

type WebhookInfo = { id: number; event_type: string; url: string; enabled: boolean };

/** Every event the TimelinesAI Public API can deliver, in UI order. */
const EVENTS: Array<[name: string, value: string]> = [
	['New Message', 'message:new'],
	['New Incoming Message', 'message:received:new'],
	['New Outgoing Message', 'message:sent:new'],
	['Message Reaction', 'message:reaction'],
	['Message Delivered', 'message:delivered'],
	['Message Read', 'message:read'],
	['Message Edited', 'message:edited'],
	['Message Deleted', 'message:deleted'],
	['New Chat', 'chat:new'],
	['New Incoming Chat', 'chat:incoming:new'],
	['New Outgoing Chat', 'chat:outgoing:new'],
	['Chat Assigned', 'chat:responsible:assigned'],
	['Chat Unassigned', 'chat:responsible:unassigned'],
	['Chat Renamed', 'chat:renamed'],
	['Incoming Call Missed', 'call:incoming:missed'],
	['Incoming Call Ended', 'call:incoming:ended'],
	['Outgoing Call Ended', 'call:outgoing:ended'],
	['WhatsApp Account Connected', 'whatsapp:account:connected'],
	['WhatsApp Account Disconnected', 'whatsapp:account:disconnected'],
	['WhatsApp Message Sync Suspended', 'whatsapp:account:suspended'],
	['WhatsApp Message Sync Resumed', 'whatsapp:account:resumed'],
	['WhatsApp Reach-Out Timelock Active', 'whatsapp:account:reachout_timelock:active'],
	['WhatsApp Reach-Out Timelock Cleared', 'whatsapp:account:reachout_timelock:cleared'],
	['WABA New Incoming Message', 'waba:message:received'],
	['WABA Message Delivered', 'waba:message:delivered'],
	['WABA Message Read', 'waba:message:read'],
	['WABA Message Failed', 'waba:message:failed'],
	['WABA New Incoming Chat', 'waba:chat:incoming'],
	['WABA New Outgoing Chat', 'waba:chat:outgoing'],
	['WABA Chat Assigned', 'waba:chat:assigned'],
	['WABA Chat Unassigned', 'waba:chat:unassigned'],
	['WABA Chat Closed', 'waba:chat:closed'],
	['WABA Chat Reopened', 'waba:chat:reopened'],
	['WABA Account Active', 'waba:account:active'],
	['WABA Account Disabled', 'waba:account:disabled'],
	['WABA Account Disconnected', 'waba:account:disconnected'],
	['WABA Template Approved', 'waba:template:approved'],
	['WABA Template Rejected', 'waba:template:rejected'],
	['WABA Template Disabled', 'waba:template:disabled'],
];

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

async function listSubscriptions(this: IHookFunctions): Promise<WebhookInfo[]> {
	const response = (await timelinesApiRequest.call(this, 'GET', '/webhooks')) as { data?: WebhookInfo[] };
	return response.data ?? [];
}

async function deleteSubscription(this: IHookFunctions, id: number): Promise<void> {
	try {
		await timelinesApiRequest.call(this, 'DELETE', `/webhooks/${id}`);
	} catch (error) {
		// Already gone is fine; anything else should surface.
		if (String((error as { httpCode?: string }).httpCode) !== '404') {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}

export class TimelinesAiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TimelinesAI Trigger',
		name: 'timelinesAiTrigger',
		icon: { light: 'file:../../icons/timelinesai.svg', dark: 'file:../../icons/timelinesai.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["events"].length + " event(s)" }}',
		description: 'Starts the workflow on TimelinesAI events, such as new messages or chat changes',
		defaults: { name: 'TimelinesAI Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'timelinesAiApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: EVENTS.map(([name, value]): INodePropertyOptions => ({ name, value })),
				description: 'Events that start the workflow',
			},
			{
				displayName:
					'Each selected event uses one of the workspace\'s webhooks. Workspaces have 10 by default; contact TimelinesAI support to raise the limit.',
				name: 'limitNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'WABA Account ID',
						name: 'wabaAccountId',
						type: 'string',
						default: '',
						placeholder: 'e.g. 56',
						description: 'Only start the workflow for WABA events of this WABA account',
					},
					{
						displayName: 'WhatsApp Account Phone',
						name: 'whatsappAccountPhone',
						type: 'string',
						default: '',
						placeholder: 'e.g. +14155550123',
						description: 'Only start the workflow for events of this WhatsApp (QR) account',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const subscribed = new Set(
					(await listSubscriptions.call(this)).filter((w) => w.url === url).map((w) => w.event_type),
				);
				return events.length > 0 && events.every((event) => subscribed.has(event));
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				if (!events.length) {
					throw new NodeOperationError(this.getNode(), 'No events selected', {
						description: 'Select at least one event under "Events".',
					});
				}

				const existing = (await listSubscriptions.call(this)).filter((w) => w.url === url);
				const created: number[] = [];
				const ids: number[] = existing.filter((w) => events.includes(w.event_type)).map((w) => w.id);

				// Subscriptions for events that are no longer selected belong to this trigger too: remove them.
				for (const stale of existing.filter((w) => !events.includes(w.event_type))) {
					await deleteSubscription.call(this, stale.id);
				}

				for (const event of events) {
					if (existing.some((w) => w.event_type === event)) continue;
					try {
						const response = (await timelinesApiRequest.call(this, 'POST', '/webhooks', {}, {
							event_type: event,
							url,
							enabled: true,
						})) as { data?: WebhookInfo };
						if (response.data?.id !== undefined) {
							created.push(response.data.id);
							ids.push(response.data.id);
						}
					} catch (error) {
						// Roll back what this attempt created, so a failed activation leaves nothing behind.
						for (const id of created) await deleteSubscription.call(this, id);
						const message = (error as { message?: string }).message ?? '';
						throw new NodeApiError(this.getNode(), error as JsonObject, {
							message: `Could not subscribe to "${event}"`,
							description: `${message} If the workspace has reached its webhook limit (10 by default), select fewer events or contact TimelinesAI support to raise it.`,
						});
					}
				}

				this.getWorkflowStaticData('node').webhookIds = ids;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const staticData = this.getWorkflowStaticData('node');
				const stored = (staticData.webhookIds as number[] | undefined) ?? [];

				let subscriptions: WebhookInfo[] = [];
				try {
					subscriptions = await listSubscriptions.call(this);
				} catch (error) {
					// If listing fails, still remove the IDs this trigger stored.
					this.logger.warn('TimelinesAI Trigger: could not list webhooks while deactivating', {
						error: (error as Error).message,
					});
				}
				const ids = new Set<number>([
					...stored,
					...subscriptions.filter((w) => w.url === url).map((w) => w.id),
				]);
				for (const id of ids) await deleteSubscription.call(this, id);

				delete staticData.webhookIds;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const filters = this.getNodeParameter('filters', {}) as {
			whatsappAccountPhone?: string;
			wabaAccountId?: string;
		};

		if (filters.whatsappAccountPhone) {
			const account = body.whatsapp_account as IDataObject | undefined;
			if (!account || digits(account.phone) !== digits(filters.whatsappAccountPhone)) return {};
		}

		if (filters.wabaAccountId) {
			const waba = body.waba_account as IDataObject | undefined;
			const chat = body.chat as IDataObject | undefined;
			const accountId = waba?.id ?? body.waba_account_id ?? chat?.waba_account_id;
			if (String(accountId ?? '') !== String(filters.wabaAccountId).trim()) return {};
		}

		return { workflowData: [this.helpers.returnJsonArray(body)] };
	}
}
