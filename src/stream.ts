export default class Stream {
  #data: Uint8Array;
  #index: number;

  get index() {
    return this.#index;
  }

  *[Symbol.iterator]() {
    for (let next = this.next(); !next.done; next = this.next()) {
      yield next.value;
    }
  }

  constructor(data: Uint8Array) {
    this.#data = data;
    this.#index = 0;
  }

  next() {
    const result = ((): { done: true } | { done: false; value: number } => {
      if (this.#index >= this.#data.length) {
        return { done: true };
      }

      return { done: false, value: this.#data[this.#index++] };
    })();

    const unwrap = () => {
      if (result.done) {
        throw new Error("Stream out of bounds");
      }

      return result.value;
    };

    return { ...result, unwrap };
  }

  peek(): number | undefined {
    return this.peekAt(0);
  }

  peekAt(index: number): number | undefined {
    if (index < 0) {
      throw new Error(`Unable to peek (${index})`);
    }

    return this.#data[this.#index + index];
  }

  take(amount: number): Uint8Array {
    if (amount <= 0) {
      throw new Error(`Unable to take (${amount})`);
    }

    const data = this.#data.subarray(this.#index, this.#index + amount);
    this.#index += amount;
    return data;
  }
}
