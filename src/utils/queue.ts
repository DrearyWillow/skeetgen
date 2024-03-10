interface QueueNode<T> {
	v: T;
	n?: QueueNode<T>;
}

export class Queue<T> {
	private h?: QueueNode<T>;
	private t?: QueueNode<T>;

	public size = 0;

	push(value: T) {
		const node: QueueNode<T> = { v: value, n: undefined };

		if (this.h) {
			this.t!.n = node;
			this.t = node;
		} else {
			this.h = node;
			this.t = node;
		}

		this.size++;
	}

	shift(): T | undefined {
		const curr = this.h;

		if (!curr) {
			return;
		}

		this.h = curr.n;
		this.size--;

		return curr.v;
	}
}
