import type { UrlPath } from "../../paths";

export const WorkerRouterVersion = 1;

export type WorkerRouter = {
	version: 1;
	include: string[];
	exclude: string[];
};

export function convertRouteNamesToAsterisks(input: string[]): string[] {
	return input.map((rule) => rule.replace(/:\w+\*?/g, "*"));
}

export function convertRouteListToFilterRules(routes: UrlPath[]): WorkerRouter {
	return {
		version: WorkerRouterVersion,
		include: convertRouteNamesToAsterisks(routes),
		exclude: [],
	};
}
