/**
 * Optimizations.js
 *
 * Performance optimizations for node-fetch including:
 * - HTTP agent pooling (connection reuse)
 * - Request header caching
 * - Response body buffer pooling
 * - URL parsing optimization
 */

import http from 'node:http';
import https from 'node:https';

// HTTP Agent pooling - reuse connections
const httpAgent = new http.Agent({
	keepAlive: true,
	keepAliveMsecs: 30000,
	maxSockets: 256,
	maxFreeSockets: 256,
	timeout: 60000,
	scheduling: 'fifo'
});

const httpsAgent = new https.Agent({
	keepAlive: true,
	keepAliveMsecs: 30000,
	maxSockets: 256,
	maxFreeSockets: 256,
	timeout: 60000,
	scheduling: 'fifo'
});

// Flag to enable/disable optimizations (useful for testing)
let optimizationsEnabled = true;

/**
 * Enable or disable optimizations
 * @param {boolean} enabled
 */
export function setOptimizationsEnabled(enabled) {
	optimizationsEnabled = enabled;
}

/**
 * Get optimized agent for the given protocol
 * @param {string} protocol - 'http:' or 'https:'
 * @returns {http.Agent | https.Agent | undefined}
 */
export function getOptimizedAgent(protocol) {
	if (!optimizationsEnabled) {
		return undefined;
	}
	return protocol === 'https:' ? httpsAgent : httpAgent;
}

// Header caching - cache common header combinations
const headerCache = new Map();
const MAX_HEADER_CACHE_SIZE = 1000;

/**
 * Get cached headers or create new ones
 * @param {string} key - Cache key
 * @param {Function} factory - Factory function to create headers if not cached
 * @returns {Object}
 */
export function getCachedHeaders(key, factory) {
	if (headerCache.has(key)) {
		return {...headerCache.get(key)};
	}

	const headers = factory();

	if (headerCache.size >= MAX_HEADER_CACHE_SIZE) {
		// Simple LRU: remove first item
		const firstKey = headerCache.keys().next().value;
		headerCache.delete(firstKey);
	}

	headerCache.set(key, headers);
	return {...headers};
}

/**
 * Generate cache key for headers
 * @param {Headers} headers - Request headers
 * @returns {string}
 */
export function generateHeaderCacheKey(headers) {
	const sortedEntries = Array.from(headers.entries()).sort();
	return JSON.stringify(sortedEntries);
}

// Buffer pooling - reuse buffers for response bodies
class BufferPool {
	constructor(maxPoolSize = 100, bufferSize = 16384) {
		this.pool = [];
		this.maxPoolSize = maxPoolSize;
		this.bufferSize = bufferSize;
	}

	acquire(size = this.bufferSize) {
		if (this.pool.length > 0 && size <= this.bufferSize) {
			return this.pool.pop();
		}
		return Buffer.allocUnsafe(size);
	}

	release(buffer) {
		if (this.pool.length < this.maxPoolSize && buffer.length === this.bufferSize) {
			this.pool.push(buffer);
		}
	}

	clear() {
		this.pool = [];
	}
}

export const bufferPool = new BufferPool();

// URL parsing optimization - cache parsed URLs
const urlCache = new Map();
const MAX_URL_CACHE_SIZE = 1000;

/**
 * Get cached parsed URL or parse new one
 * @param {string | URL} url - URL to parse
 * @returns {URL}
 */
export function getOptimizedURL(url) {
	if (url instanceof URL) {
		return url;
	}

	const urlStr = String(url);

	if (urlCache.has(urlStr)) {
		const cached = urlCache.get(urlStr);
		// Return a new URL object to avoid mutation
		return new URL(cached.href);
	}

	const parsedURL = new URL(urlStr);

	if (urlCache.size >= MAX_URL_CACHE_SIZE) {
		// Simple LRU: remove first item
		const firstKey = urlCache.keys().next().value;
		urlCache.delete(firstKey);
	}

	urlCache.set(urlStr, parsedURL);
	return parsedURL;
}

/**
 * Clear all caches - useful for testing and memory management
 */
export function clearOptimizationCaches() {
	headerCache.clear();
	urlCache.clear();
	bufferPool.clear();
}

/**
 * Get optimization statistics
 * @returns {Object}
 */
export function getOptimizationStats() {
	return {
		headerCacheSize: headerCache.size,
		urlCacheSize: urlCache.size,
		bufferPoolSize: bufferPool.pool.length,
		httpAgentSockets: Object.keys(httpAgent.sockets).length,
		httpsAgentSockets: Object.keys(httpsAgent.sockets).length,
		httpAgentFreeSockets: Object.keys(httpAgent.freeSockets).length,
		httpsAgentFreeSockets: Object.keys(httpsAgent.freeSockets).length
	};
}
