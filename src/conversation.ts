export class Queue<T> {
  private count: number;
  private lowestCount: number;
  private max_length: number;
  private max_token_length: number;
  private items: Map<number, T>;

  constructor() {
    this.count = 0;
    this.lowestCount = 0;
    this.max_length = 100;
    this.max_token_length = 400;
    this.items = new Map();
  }

  setMaxLength(max_length: number) {
    this.max_length = max_length;
  }

  setMaxTokenLength(max_token_length: number) {
    this.max_token_length = max_token_length;
  }

  enqueue(element: T): void {
    this.items.set(this.count, element);
    this.count++;
    if (this.size() > this.max_length) {
      for (let i=0; i < this.size() - this.max_length; i++) {
        this.dequeue();
      }
    }
  }

  dequeue(): T {
    if (this.isEmpty()) {
      return undefined as T;
    }
    const result: T = this.items.get(this.lowestCount) as T;
    this.items.delete(this.lowestCount);
    this.lowestCount++;
    return result;
  }

  peek(): T {
    if (this.isEmpty()) {
      return undefined as T;
    }
    return this.items.get(this.lowestCount) as T;
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  clear(): void {
    this.items = new Map();
    this.count = 0;
    this.lowestCount = 0;
  }


  size(): number {
    return this.items.size;
  }


  toString(): string {
    if (this.isEmpty()) {
      return '';
    }
    let objString: string = `${this.items.get(this.count-1)}`;
    for (let i = this.count - 2; i >= this.lowestCount && objString.length <= this.max_token_length; i--) {
      objString = `${this.items.get(i)}\n${objString}`;
    }
    return objString;
  }
}