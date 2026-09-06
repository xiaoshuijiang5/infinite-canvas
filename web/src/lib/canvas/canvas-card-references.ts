import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

export function isCanvasCardNode(node: CanvasNodeData) {
    return [CanvasNodeType.CharacterCard, CanvasNodeType.PropCard, CanvasNodeType.SceneCard].includes(node.type as CanvasNodeType);
}

export function cardImageReferenceText(node: CanvasNodeData, label: string) {
    const name = cardReferenceTitle(node);
    const kind = node.type === CanvasNodeType.CharacterCard ? "角色" : node.type === CanvasNodeType.PropCard ? "道具" : "场景";
    return `${label}（${kind}：${name}）`;
}

export function prependVideoCardImageReferences(prompt: string, cards: CanvasNodeData[], labels: Map<string, string>) {
    const references = cards.map((card) => {
        const label = labels.get(card.id);
        return label ? cardImageReferenceText(card, label) : "";
    }).filter(Boolean);
    // Remove the old text-only card declarations. Actual image labels remain in the prompt.
    const body = prompt.replace(/@(?:角色|道具|场景)卡为[^\s]+/g, "").trim();
    return [...references.filter((reference) => !body.includes(reference)), body].filter(Boolean).join(" ");
}

export function cardReferenceTitle(node: CanvasNodeData) {
    return node.metadata?.cardName?.trim() || node.title;
}

export function matchedCardNodeIds(prompt: string, nodes: CanvasNodeData[]) {
    const text = prompt.trim();
    if (!text) return [];
    const cards = nodes
        .filter(isCanvasCardNode)
        .map((node) => ({ node, name: node.metadata?.cardName?.trim() || "" }))
        .filter((item) => item.name)
        .sort((a, b) => b.name.length - a.name.length);
    const occupied = new Array(text.length).fill(false);
    const matched = new Set<string>();

    // Scene names can share a prefix (for example "空间" and "空间厨房").
    // Resolve longer, concrete names first so a prefix card is only used for its own mention.
    cards.forEach(({ node, name }) => {
        let start = text.indexOf(name);
        while (start !== -1) {
            const end = start + name.length;
            if (!occupied.slice(start, end).some(Boolean)) {
                matched.add(node.id);
                occupied.fill(true, start, end);
            }
            start = text.indexOf(name, end);
        }
    });
    return cards
        .filter(({ node }) => matched.has(node.id))
        .map(({ node }) => node.id);
}
