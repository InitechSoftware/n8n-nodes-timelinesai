import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
} from 'n8n-workflow';

type ApiErrorBody = {
	message?: string;
	error_code?: string;
	errors?: Array<{ fields?: string[]; msg?: string }>;
	title?: string;
	detail?: string;
};

type Hint = { message: string; fix: string };

/** Readable headline and fix per TimelinesAI `error_code`. */
const BY_CODE: Record<string, Hint> = {
	missing_credentials: {
		message: 'TimelinesAI received no API token',
		fix: 'Open the TimelinesAI API credential and paste the Public API token.',
	},
	invalid_token: {
		message: 'TimelinesAI rejected the API token',
		fix: 'The token is wrong or was regenerated in TimelinesAI. Paste the current token into the TimelinesAI API credential.',
	},
	permission_denied: {
		message: 'This token is not allowed to do that',
		fix: 'Use a token of a teammate whose role allows this action, or ask a workspace admin.',
	},
	insufficient_scope: {
		message: 'This token does not have the scope for this operation',
		fix: 'Create a token with the required scope in TimelinesAI and update the credential.',
	},
	plan_feature_unavailable: {
		message: 'This feature is not included in the workspace plan',
		fix: 'Upgrade the TimelinesAI plan, or remove this step from the workflow.',
	},
	quota_exceeded: {
		message: 'The workspace messaging quota is used up',
		fix: 'Buy more quota in TimelinesAI (Account → Subscription), or wait for the next quota period.',
	},
	rate_limit_exceeded: {
		message: 'TimelinesAI is rate limiting these requests',
		fix: 'Slow the workflow down, for example with Loop Over Items and a Wait node between items.',
	},
	not_found: {
		message: 'TimelinesAI could not find that item',
		fix: 'Check the ID. It may have been deleted, or belong to another workspace.',
	},
	account_inactive: {
		message: 'The WhatsApp account is not connected',
		fix: 'Reconnect the WhatsApp account in TimelinesAI, or send from another account.',
	},
	service_window_closed: {
		message: 'The 24-hour WhatsApp service window is closed',
		fix: 'Free text can only be sent within 24 hours of the contact\'s last message. Send an approved template instead (Message Type: Template).',
	},
	template_not_approved: {
		message: 'The WABA template is not approved',
		fix: 'Pick an approved template. Only templates approved by Meta can be sent.',
	},
	template_wrong_waba: {
		message: 'The template belongs to a different WABA account',
		fix: 'Pick a template of the WABA account that sends the message.',
	},
	template_variables_mismatch: {
		message: 'The template variables do not match the template',
		fix: 'Enter exactly one value per placeholder in Header Variables and Body Variables, in order.',
	},
	not_supported: {
		message: 'TimelinesAI does not support this for the chosen item',
		fix: 'Check that the chat, account or message type supports this operation.',
	},
	validation_error: {
		message: 'TimelinesAI rejected the request',
		fix: 'Check the fields listed after the message.',
	},
};

/** Fallbacks when there is no (known) `error_code`. */
function byStatus(status: number): Hint {
	if (status === 401) return BY_CODE.invalid_token;
	if (status === 403) return BY_CODE.permission_denied;
	if (status === 404) return BY_CODE.not_found;
	if (status === 413) return { message: 'The file is too large for TimelinesAI', fix: 'Send a smaller file.' };
	if (status === 429) return BY_CODE.rate_limit_exceeded;
	if (status >= 500) {
		return {
			message: 'TimelinesAI could not process the request',
			fix: 'This is a temporary server problem. Try again later, or turn on "Retry On Fail" in the node settings.',
		};
	}
	return { message: 'TimelinesAI rejected the request', fix: 'Check the node parameters.' };
}

/**
 * postReceive step for every operation. Requests run with
 * `ignoreHttpStatusErrors`, so error responses arrive here: turn them into a
 * NodeApiError with a readable headline, a fix, and the API's own message and
 * error code. The HTTP status is kept as `httpCode`, so callers (such as the
 * pagination retry on 429) can still branch on it.
 */
export async function throwOnApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = response.statusCode;
	if (status < 400) return items;

	const body = (typeof response.body === 'object' && response.body !== null ? response.body : {}) as ApiErrorBody;
	const hint = (body.error_code && BY_CODE[body.error_code]) || byStatus(status);
	const apiMessage = body.message || body.detail || body.title || (typeof response.body === 'string' ? response.body.slice(0, 200) : '');
	const fieldErrors = (body.errors ?? [])
		.map((e) => `${(e.fields ?? []).join(', ') || 'request'}: ${e.msg ?? ''}`.trim())
		.filter(Boolean);

	const details = [
		hint.fix,
		apiMessage && `TimelinesAI says: "${apiMessage}"`,
		fieldErrors.length ? `Fields: ${fieldErrors.join('; ')}` : '',
		body.error_code ? `Error code: ${body.error_code}` : '',
	].filter(Boolean);

	const error = new NodeApiError(this.getNode(), (body as JsonObject) ?? {}, {
		message: hint.message,
		description: details.join(' '),
		httpCode: String(status),
		itemIndex: this.getItemIndex(),
	});
	// NodeApiError derives httpCode from the error object, which our body lacks; set it explicitly
	// so callers such as the pagination retry can still detect a 429. (When the package is linked
	// for development with its own copy of n8n-workflow, n8n re-wraps this error and reports
	// httpCode "none"; message and description survive, and the retry sees the original.)
	error.httpCode = String(status);
	throw error;
}

/**
 * Puts `throwOnApiError` first in the postReceive chain of every operation
 * option. Operation-level routing runs before parameter-level steps such as
 * Simplify, so errors are reported before any output transformation.
 */
export function withApiErrorHandling(properties: INodeProperties[]): INodeProperties[] {
	return properties.map((property) => {
		if (property.name !== 'operation' || !Array.isArray(property.options)) return property;
		return {
			...property,
			options: property.options.map((option) => {
				const routed = option as { routing?: IDataObject };
				if (!routed.routing) return option;
				const routing = routed.routing as {
					output?: { postReceive?: unknown[] };
				};
				return {
					...option,
					routing: {
						...routing,
						output: {
							...(routing.output ?? {}),
							postReceive: [throwOnApiError, ...(routing.output?.postReceive ?? [])],
						},
					},
				};
			}),
		} as INodeProperties;
	});
}
