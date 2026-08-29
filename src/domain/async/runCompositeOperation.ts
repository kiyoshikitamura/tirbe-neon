export type CompositeOperationResult<T> = {
  complete: boolean;
  completed: T[];
  remaining: T[];
};

/** Runs requested server operations in order and preserves the failed/unexecuted tail for retry. */
export async function runCompositeOperation<T>(
  requested: readonly T[],
  execute: (entry: T, index: number) => Promise<boolean>,
): Promise<CompositeOperationResult<T>> {
  const completed: T[] = [];
  for (let index = 0; index < requested.length; index += 1) {
    if (!await execute(requested[index], index)) {
      return { complete: false, completed, remaining: requested.slice(index) };
    }
    completed.push(requested[index]);
  }
  return { complete: true, completed, remaining: [] };
}
