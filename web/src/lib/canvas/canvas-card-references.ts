import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

export function isCanvasCardNode(node: CanvasNodeData) {
    return [CanvasNodeType.CharacterCard, CanvasNodeType.PropCard, CanvasNodeType.SceneCard].includes(node.type as CanvasNodeType);
}

export function cardMentionLabel(node: CanvasNodeData) {
    const name = node.metadata?.cardName?.trim();
    if (!name) return "";
    const kind = node.type === CanvasNodeType.CharacterCard ? "角色" : node.type === CanvasNodeType.PropCard ? "道具" : "场景";
    return `@${kind}：${name}`;
}

export function cardReferenceTitle(node: CanvasNodeData) {
    return node.metadata?.cardName?.trim() || node.title;
}

export function matchedCardNodeIds(prompt: string, nodes: CanvasNodeData[]) {
    const text = prompt.trim();
    if (!text) return [];
    return nodes
        .filter(isCanvasCardNode)
        .filter((node) => {
            const name = node.metadata?.cardName?.trim();
            return Boolean(name && text.includes(name));
        })
        .sort((a, b) => (b.metadata?.cardName?.length || 0) - (a.metadata?.cardName?.length || 0))
        .map((node) => node.id);
}
