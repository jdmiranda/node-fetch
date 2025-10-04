/**
 * Comprehensive benchmark for node-fetch optimizations
 * Tests req/sec for various scenarios
 */

import http from 'node:http';
import fetch, {getOptimizationStats, clearOptimizationCaches} from './src/index.js';

// Simple test server
const server = http.createServer((req, res) => {
	if (req.url === '/json') {
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({message: 'Hello World', timestamp: Date.now()}));
	} else if (req.url === '/text') {
		res.setHeader('Content-Type', 'text/plain');
		res.end('Hello World');
	} else if (req.url === '/large') {
		res.setHeader('Content-Type', 'application/json');
		const data = {items: Array.from({length: 1000}, (_, i) => ({id: i, value: `item-${i}`}))};
		res.end(JSON.stringify(data));
	} else {
		res.statusCode = 404;
		res.end('Not Found');
	}
});

const PORT = 3456;

/**
 * Run benchmark for a given scenario
 */
async function runBenchmark(name, url, iterations = 1000) {
	console.log(`\n${name}`);
	console.log('='.repeat(60));

	const start = Date.now();
	const promises = [];

	for (let i = 0; i < iterations; i++) {
		promises.push(
			fetch(url)
				.then(res => res.text())
				.catch(err => console.error('Fetch error:', err.message))
		);
	}

	await Promise.all(promises);

	const duration = (Date.now() - start) / 1000;
	const rps = iterations / duration;

	console.log(`Total requests: ${iterations}`);
	console.log(`Duration: ${duration.toFixed(2)}s`);
	console.log(`Requests/sec: ${rps.toFixed(2)}`);

	const stats = getOptimizationStats();
	console.log('\nOptimization Stats:');
	console.log(`  Header cache size: ${stats.headerCacheSize}`);
	console.log(`  URL cache size: ${stats.urlCacheSize}`);
	console.log(`  Buffer pool size: ${stats.bufferPoolSize}`);
	console.log(`  HTTP active sockets: ${stats.httpAgentSockets}`);
	console.log(`  HTTPS active sockets: ${stats.httpsAgentSockets}`);
	console.log(`  HTTP free sockets: ${stats.httpAgentFreeSockets}`);
	console.log(`  HTTPS free sockets: ${stats.httpsAgentFreeSockets}`);

	return rps;
}

/**
 * Run sequential benchmark
 */
async function runSequentialBenchmark(name, url, iterations = 100) {
	console.log(`\n${name}`);
	console.log('='.repeat(60));

	const start = Date.now();

	for (let i = 0; i < iterations; i++) {
		try {
			const res = await fetch(url);
			await res.text();
		} catch (err) {
			console.error('Fetch error:', err.message);
		}
	}

	const duration = (Date.now() - start) / 1000;
	const rps = iterations / duration;

	console.log(`Total requests: ${iterations}`);
	console.log(`Duration: ${duration.toFixed(2)}s`);
	console.log(`Requests/sec: ${rps.toFixed(2)}`);

	return rps;
}

/**
 * Main benchmark suite
 */
async function main() {
	await new Promise(resolve => {
		server.listen(PORT, () => {
			console.log(`Test server running on http://localhost:${PORT}`);
			resolve();
		});
	});

	try {
		console.log('\n' + '='.repeat(60));
		console.log('NODE-FETCH OPTIMIZATION BENCHMARK');
		console.log('='.repeat(60));

		// Clear caches before starting
		clearOptimizationCaches();

		// Scenario 1: Parallel small JSON requests
		await runBenchmark(
			'Scenario 1: Parallel Small JSON (1000 requests)',
			`http://localhost:${PORT}/json`,
			1000
		);

		// Scenario 2: Parallel text requests
		await runBenchmark(
			'Scenario 2: Parallel Text Requests (1000 requests)',
			`http://localhost:${PORT}/text`,
			1000
		);

		// Scenario 3: Parallel large JSON requests
		await runBenchmark(
			'Scenario 3: Parallel Large JSON (500 requests)',
			`http://localhost:${PORT}/large`,
			500
		);

		// Scenario 4: Sequential requests (tests connection reuse)
		await runSequentialBenchmark(
			'Scenario 4: Sequential Requests (200 requests)',
			`http://localhost:${PORT}/json`,
			200
		);

		// Scenario 5: Mixed parallel requests
		console.log('\nScenario 5: Mixed Parallel Requests (600 requests)');
		console.log('='.repeat(60));
		const start = Date.now();
		const promises = [];

		for (let i = 0; i < 200; i++) {
			promises.push(fetch(`http://localhost:${PORT}/json`).then(r => r.text()));
			promises.push(fetch(`http://localhost:${PORT}/text`).then(r => r.text()));
			promises.push(fetch(`http://localhost:${PORT}/large`).then(r => r.text()));
		}

		await Promise.all(promises);

		const duration = (Date.now() - start) / 1000;
		const rps = 600 / duration;

		console.log(`Total requests: 600`);
		console.log(`Duration: ${duration.toFixed(2)}s`);
		console.log(`Requests/sec: ${rps.toFixed(2)}`);

		const finalStats = getOptimizationStats();
		console.log('\nFinal Optimization Stats:');
		console.log(`  Header cache size: ${finalStats.headerCacheSize}`);
		console.log(`  URL cache size: ${finalStats.urlCacheSize}`);
		console.log(`  Buffer pool size: ${finalStats.bufferPoolSize}`);
		console.log(`  HTTP active sockets: ${finalStats.httpAgentSockets}`);
		console.log(`  HTTPS active sockets: ${finalStats.httpsAgentSockets}`);
		console.log(`  HTTP free sockets: ${finalStats.httpAgentFreeSockets}`);
		console.log(`  HTTPS free sockets: ${finalStats.httpsAgentFreeSockets}`);

		console.log('\n' + '='.repeat(60));
		console.log('BENCHMARK COMPLETE');
		console.log('='.repeat(60) + '\n');
	} finally {
		server.close();
	}
}

main().catch(console.error);
