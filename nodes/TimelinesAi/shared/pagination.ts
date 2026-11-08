import {
	NodeApiError,
	NodeOperationError,
	sleepUnlessExecutionCancelled,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];

function rateLimitDelay(error: unknown, attempt: number): number | undefined {
	const e = error as { httpCode?: string | number; cause?: { response?: { headers?: IDataObject } } };
	if (String(e?.httpCode) !== '429' || attempt >= RETRY_DELAYS_MS.length) return undefined;
	const retryAfter = Number(e.cause?.response?.headers?.['retry-after']);
	return Number.isFinite(retryAfter) && retryAfter > 0
		? Math.min(retryAfter * 1000, 60000)
		: RETRY_DELAYS_MS[attempt];
}

/**
 * One page through the node's normal routing. Rate-limited pages (HTTP 429)
 * are retried with backoff, so a long "Return All" does not lose the pages it
 * already fetched.
 */
async function fetchPage(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	for (let attempt = 0; ; attempt++) {
		let failure: unknown;
		try {
			return await this.makeRoutingRequest(requestOptions);
		} catch (error) {
			failure = error;
		}

		const delay = rateLimitDelay(failure, attempt);
		if (delay !== undefined) {
			await sleepUnlessExecutionCancelled(this, delay);
			continue;
		}
		// Routed requests already fail with NodeApiError; keep it so the API's message survives.
		if (failure instanceof NodeApiError || failure instanceof NodeOperationError) throw failure;
		throw new NodeApiError(this.getNode(), failure as JsonObject);
	}
}

/**
 * Pagination for TimelinesAI list endpoints, which page with `?page=N`.
 *
 * n8n's built-in generic pagination replaces the query string on each
 * follow-up request (dropping filters) and keeps only the last page when items
 * are extracted from a nested property. This function keeps the original
 * query, requests one page at a time through the node's normal routing (so
 * every postReceive step, like rootProperty and Simplify, applies per page),
 * and stops at the first short or empty page, or once "Limit" is reached.
 */
export async function paginateByPage(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const limit = requestOptions.maxResults ? Number(requestOptions.maxResults) : Infinity;
	const baseQs = (requestOptions.options.qs ?? {}) as IDataObject;
	let page = Number(baseQs.page ?? 1);
	let pageSize: number | undefined;
	const results: INodeExecutionData[] = [];

	for (;;) {
		requestOptions.options.qs = { ...baseQs, page };
		const items = await fetchPage.call(this, requestOptions);
		results.push(...items);

		pageSize ??= items.length;
		if (items.length === 0 || items.length < pageSize || results.length >= limit) break;
		page += 1;
	}

	return results.slice(0, limit);
}
