import { Children, cloneElement, isValidElement, type ReactNode } from "react";

export type MarketingDictionary = Readonly<Record<string, string>>;

export function translateMarketingTree(node: ReactNode, dictionary: MarketingDictionary): ReactNode {
  if (typeof node === "string") return translateText(node, dictionary);
  if (Array.isArray(node)) return node.map((child) => translateMarketingTree(child, dictionary));
  if (!isValidElement<{ children?: ReactNode; [key: string]: unknown }>(node)) return node;

  const props = { ...node.props };
  for (const key of ["title", "description", "detail", "eyebrow", "label", "text", "question"]) {
    if (typeof props[key] === "string") props[key] = translateText(props[key] as string, dictionary);
  }
  if ("children" in props) {
    props.children = Children.map(props.children, (child) => translateMarketingTree(child, dictionary));
  }
  return cloneElement(node, props);
}

function translateText(value: string, dictionary: MarketingDictionary) {
  const exact = dictionary[value];
  if (exact) return exact;

  const text = value.trim();
  const translated = dictionary[text];
  if (!text || !translated) return value;

  return `${value.slice(0, value.indexOf(text))}${translated}${value.slice(value.indexOf(text) + text.length)}`;
}
