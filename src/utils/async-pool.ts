import { Queue } from './queue.ts';

type Result = [promise: Promise<any>, value: any];

export function create_async_pool<T, R>(concurrency: number, iterator: (value: T) => Promise<R>) {
	const queue = new Queue<T>();
	const executing = new Set<Promise<Result>>();

	async function consume() {
		const [promise, value] = await Promise.race(executing);

		executing.delete(promise);
		return value;
	}

	return {
		add(item: T) {
			queue.push(item);
		},
		addMany(items: T[]) {
			for (let i = 0, ilen = items.length; i < ilen; i++) {
				const item = items[i];
				queue.push(item);
			}
		},
		async *flush() {
			let item: T | undefined;

			while ((item = queue.shift()) !== undefined) {
				const promise = iterator(item).then((value): Result => [promise, value]);

				executing.add(promise);
				if (executing.size >= concurrency) {
					yield (await consume()) as R;
				}
			}

			while (executing.size > 0) {
				yield (await consume()) as R;
			}
		},
	};
}
