import { Children, cloneElement, isValidElement, type ReactNode } from "react";

export type MarketingDictionary = Readonly<Record<string, string>>;

export function translateMarketingTree(node: ReactNode, dictionary: MarketingDictionary): ReactNode {
  if (typeof node === "string") return dictionary[node] ?? node;
  if (Array.isArray(node)) return node.map((child) => translateMarketingTree(child, dictionary));
  if (!isValidElement<{ children?: ReactNode; [key: string]: unknown }>(node)) return node;

  const props = { ...node.props };
  for (const key of ["title", "description", "eyebrow", "label", "text", "question"]) {
    if (typeof props[key] === "string") props[key] = dictionary[props[key] as string] ?? props[key];
  }
  if ("children" in props) {
    props.children = Children.map(props.children, (child) => translateMarketingTree(child, dictionary));
  }
  return cloneElement(node, props);
}
