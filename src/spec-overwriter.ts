/**
 * Utility for applying overwrite-spec to Kubernetes resource specs.
 * Performs deep merging of overwrite values into the original spec.
 */

/**
 * Checks if a value is a plain object (not an array, null, or other types).
 */
function isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep merges the overwrite object into the target object.
 * Only properties present in overwrite will be modified in target.
 * Supports nested objects.
 * 
 * @param target - The target object to merge into (will be modified)
 * @param overwrite - The object containing values to overwrite
 */
export function deepMerge(target: any, overwrite: any): void {
    for (const key in overwrite) {
        if (Object.hasOwn(overwrite, key)) {
            const overwriteValue = overwrite[key];
            const targetValue = target[key];

            if (isPlainObject(overwriteValue) && isPlainObject(targetValue)) {
                // Both are plain objects, recurse
                deepMerge(targetValue, overwriteValue);
            } else {
                // Overwrite the value (handles primitives, arrays, and null)
                target[key] = overwriteValue;
            }
        }
    }
}

/**
 * Applies overwrite-spec to a Kubernetes resource.
 * Creates spec object if it doesn't exist.
 * 
 * @param resource - The Kubernetes resource object
 * @param overwriteSpec - The overwrite-spec object with values to merge
 * @returns The modified resource (same object reference)
 */
export function applyOverwriteSpec(resource: any, overwriteSpec: Record<string, any>): any {
    if (!resource.spec) {
        resource.spec = {};
    }
    deepMerge(resource.spec, overwriteSpec);
    return resource;
}
