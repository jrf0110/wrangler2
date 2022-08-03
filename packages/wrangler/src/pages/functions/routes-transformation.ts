import { join as pathJoin } from "node:path";
import type { RouteConfig } from "./routes";

/**
 * TODO can we do better naming?
 */
export function convertRoutesToGlobPatterns(
	routes: Pick<RouteConfig, "routePath" | "middleware">[]
): string[] {
	const convertedRoutes = routes.map(({ routePath, middleware }) => {
		const globbedRoutePath: string = routePath.replace(/:\w+\*?.*/, "*");

		// Middleware mountings need to end in glob so that they can handle their
		// own sub-path routes
		if (
			typeof middleware === "string" ||
			(Array.isArray(middleware) && middleware.length === 0)
		) {
			if (!globbedRoutePath.endsWith("*")) {
				return pathJoin(globbedRoutePath, "*");
			}
		}

		return globbedRoutePath;
	});

	return Array.from(new Set(convertedRoutes));
}
