import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

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
		const items = await this.makeRoutingRequest(requestOptions);
		results.push(...items);

		pageSize ??= items.length;
		if (items.length === 0 || items.length < pageSize || results.length >= limit) break;
		page += 1;
	}

	return results.slice(0, limit);
}
