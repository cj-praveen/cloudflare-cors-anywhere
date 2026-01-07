# cloudflare-cors-anywhere
Cloudflare CORS proxy in a worker.

> This project is a self‑hosted fork of [Zibri/cloudflare-cors-anywhere](https://github.com/Zibri/cloudflare-cors-anywhere)

## Usage

Request a resource by passing the target URL as the query string

```
https://cloudflare-cors-anywhere.cjpraveen.workers.dev/?https://httpbin.org/get
```

- If no target URL is provided, the Worker returns `400 Bad Request`
- Requests that fail origin or URL checks return `403 Forbidden`
