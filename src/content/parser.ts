/**
 * XML parsing using libxml2-wasm
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';

export interface XMLNode {
  name: string;
  attributes: Record<string, string>;
  children: XMLNode[];
  text?: string;
}

export class XMLParser {
  parse(xmlContent: string): XMLNode | null {
    try {
      const doc = XmlDocument.fromString(xmlContent);
      const result = this.convertElement(doc.root);
      doc.dispose();
      return result;
    } catch {
      return null;
    }
  }

  private convertElement(element: XmlElement): XMLNode {
    const node: XMLNode = {
      name: element.name,
      attributes: {},
      children: [],
      text: '',
    };

    for (const attr of element.attrs) {
      node.attributes[attr.name] = attr.value;
    }

    let child = element.firstChild;
    while (child) {
      if ('name' in child && 'content' in child) {
        node.children.push(this.convertElement(child as XmlElement));
      } else if ('content' in child) {
        node.text = (node.text ?? '') + child.content;
      }
      child = child.next;
    }

    return node;
  }
}

export class XMLWalker {
  private root: XMLNode | null = null;

  constructor(xmlContent: string) {
    this.root = new XMLParser().parse(xmlContent);
  }

  getRoot(): XMLNode | null {
    return this.root;
  }

  findElement(name: string): XMLNode | null {
    return this.findElementRecursive(this.root, name);
  }

  private findElementRecursive(element: XMLNode | null, name: string): XMLNode | null {
    if (!element) {
      return null;
    }

    if (element.name === name) {
      return element;
    }

    for (const child of element.children) {
      const found = this.findElementRecursive(child, name);
      if (found) {
        return found;
      }
    }

    return null;
  }

  getIDs(): Map<string, XMLNode> {
    const ids = new Map<string, XMLNode>();
    this.collectIDsRecursive(this.root, ids);
    return ids;
  }

  private collectIDsRecursive(element: XMLNode | null, ids: Map<string, XMLNode>): void {
    if (!element) {
      return;
    }

    if (element.attributes['id']) {
      ids.set(element.attributes['id'], element);
    }

    if (element.attributes['xml:id']) {
      ids.set(element.attributes['xml:id'], element);
    }

    for (const child of element.children) {
      this.collectIDsRecursive(child, ids);
    }
  }

  getTextContent(element: XMLNode): string {
    return element.text ?? '';
  }

  getAttributes(element: XMLNode): Record<string, string> {
    return element.attributes;
  }

  hasAttribute(element: XMLNode, name: string): boolean {
    return name in element.attributes;
  }
}
