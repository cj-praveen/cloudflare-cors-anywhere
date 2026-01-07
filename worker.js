const blacklistUrls = [];
const whitelistOrigins = [".*"];

function isListedInWhitelist(uri, listing) {
    let isListed = false;
    if (typeof uri === "string") {
        listing.forEach(pattern => {
            if (uri.match(pattern) !== null) {
                isListed = true;
            }
        });
    } else {
        isListed = true;
    }
    return isListed;
}

addEventListener("fetch", event => {
    event.respondWith((async () => {

        const isPreflightRequest = event.request.method === "OPTIONS";
        const originUrl = new URL(event.request.url);

        function setupCORSHeaders(headers) {
            headers.set(
                "Access-Control-Allow-Origin",
                event.request.headers.get("Origin")
            );

            if (isPreflightRequest) {
                headers.set(
                    "Access-Control-Allow-Methods",
                    event.request.headers.get("access-control-request-method")
                );

                const requestedHeaders =
                    event.request.headers.get("access-control-request-headers");

                if (requestedHeaders) {
                    headers.set("Access-Control-Allow-Headers", requestedHeaders);
                }

                headers.delete("X-Content-Type-Options");
            }

            return headers;
        }

        const targetUrl = decodeURIComponent(
            decodeURIComponent(originUrl.search.slice(1))
        );

        const originHeader = event.request.headers.get("Origin");

        if (
            !isListedInWhitelist(targetUrl, blacklistUrls) &&
            isListedInWhitelist(originHeader, whitelistOrigins)
        ) {

            let customHeaders = event.request.headers.get("x-cors-headers");
            if (customHeaders !== null) {
                try {
                    customHeaders = JSON.parse(customHeaders);
                } catch (_) {
                    customHeaders = null;
                }
            }

            if (originUrl.search.startsWith("?")) {

                const filteredHeaders = {};
                for (const [key, value] of event.request.headers.entries()) {
                    if (
                        key.match("^origin") === null &&
                        key.match("eferer") === null &&
                        key.match("^cf-") === null &&
                        key.match("^x-forw") === null &&
                        key.match("^x-cors-headers") === null
                    ) {
                        filteredHeaders[key] = value;
                    }
                }

                if (customHeaders !== null) {
                    Object.entries(customHeaders).forEach(
                        ([k, v]) => (filteredHeaders[k] = v)
                    );
                }

                if (!filteredHeaders["User-Agent"]) {
                    filteredHeaders["User-Agent"] =
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
                }

                const proxyRequest = new Request(targetUrl, {
                    method: event.request.method,
                    headers: filteredHeaders,
                    redirect: "follow",
                    body:
                        event.request.method === "GET" ||
                        event.request.method === "HEAD"
                            ? null
                            : event.request.body
                });

                const response = await fetch(proxyRequest);

                let responseHeaders = new Headers(response.headers);
                const exposedHeaders = [];
                const allResponseHeaders = {};

                for (const [key, value] of response.headers.entries()) {
                    exposedHeaders.push(key);
                    allResponseHeaders[key] = value;
                }

                exposedHeaders.push("cors-received-headers");
                responseHeaders = setupCORSHeaders(responseHeaders);

                responseHeaders.set(
                    "Access-Control-Expose-Headers",
                    exposedHeaders.join(",")
                );
                responseHeaders.set(
                    "cors-received-headers",
                    JSON.stringify(allResponseHeaders)
                );

                const responseBody = isPreflightRequest
                    ? null
                    : await response.arrayBuffer();

                return new Response(responseBody, {
                    headers: responseHeaders,
                    status: isPreflightRequest ? 200 : response.status,
                    statusText: isPreflightRequest ? "OK" : response.statusText
                });
            }

            return new Response("Missing target URL", { status: 400 });
        }

        return new Response("Forbidden", { status: 403 });

    })());
});
