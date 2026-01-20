/**
 * Registry for tracking EPUB resources and their IDs
 */

import type { Resource } from './types.js';

/**
 * Registry for managing resources and their IDs
 */
export class ResourceRegistry {
  private resources: Map<string, Resource>;
  private ids: Map<string, Set<string>>;

  constructor() {
    this.resources = new Map();
    this.ids = new Map();
  }

  /**
   * Register a resource from manifest
   */
  registerResource(resource: Resource): void {
    this.resources.set(resource.url, resource);
    // Also copy the IDs to the registry
    for (const id of resource.ids) {
      this.registerID(resource.url, id);
    }
  }

  /**
   * Register an ID in a resource
   */
  registerID(resourceURL: string, id: string): void {
    if (!id || this.resources.has(resourceURL)) {
      return;
    }

    if (!this.ids.has(resourceURL)) {
      this.ids.set(resourceURL, new Set());
    }

    const resourceIDs = this.ids.get(resourceURL);
    resourceIDs?.add(id);

    // Also add to the resource object for consistency
    const resource = this.resources.get(resourceURL);
    if (resource) {
      resource.ids.add(id);
    }
  }

  /**
   * Get a resource by URL
   */
  getResource(url: string): Resource | undefined {
    return this.resources.get(url);
  }

  /**
   * Check if a resource exists
   */
  hasResource(url: string): boolean {
    return this.resources.has(url);
  }

  /**
   * Check if an ID exists in a resource
   */
  hasID(resourceURL: string, id: string): boolean {
    const resourceIDs = this.ids.get(resourceURL);
    return resourceIDs?.has(id) ?? false;
  }

  /**
   * Get all resources
   */
  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get all resource URLs
   */
  getResourceURLs(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Get resources in spine
   */
  getSpineResources(): Resource[] {
    return Array.from(this.resources.values()).filter((r) => r.inSpine);
  }

  /**
   * Check if a resource is in spine
   */
  isInSpine(url: string): boolean {
    const resource = this.resources.get(url);
    return resource?.inSpine ?? false;
  }
}
