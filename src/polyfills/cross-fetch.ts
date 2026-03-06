export const fetch = (...args: any[]) => window.fetch(...args as [any, any]);
export const Headers = window.Headers;
export const Request = window.Request;
export const Response = window.Response;
export default fetch;
