import { CanvasNodeType, type CanvasNodeData, type ConnectionHandle } from "@/types/canvas";

export type CanvasMediaLayout = "horizontal" | "vertical" | "grid";

const CANVAS_MEDIA_LAYOUT_GAP = 16;

export function arrangeMediaNodes(nodes: CanvasNodeData[], selectedIds: ReadonlySet<string>, layout: CanvasMediaLayout) {
    const selected = nodes.filter((node) => selectedIds.has(node.id));
    if (selected.length < 2) return nodes;

    const bounds = nodeBounds(selected);
    const sorted = [...selected].sort((a, b) => (layout === "horizontal" ? a.position.x - b.position.x || a.position.y - b.position.y : a.position.y - b.position.y || a.position.x - b.position.x));
    const positions = new Map<string, { x: number; y: number }>();

    if (layout === "horizontal") {
        let x = bounds.left;
        sorted.forEach((node) => {
            positions.set(node.id, { x, y: bounds.top });
            x += node.width + CANVAS_MEDIA_LAYOUT_GAP;
        });
    } else if (layout === "vertical") {
        let y = bounds.top;
        sorted.forEach((node) => {
            positions.set(node.id, { x: bounds.right - node.width, y });
            y += node.height + CANVAS_MEDIA_LAYOUT_GAP;
        });
    } else {
        const columns = Math.min(3, sorted.length);
        const columnWidths = Array.from({ length: columns }, () => 0);
        const rowHeights = Array.from({ length: Math.ceil(sorted.length / columns) }, () => 0);
        sorted.forEach((node, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            columnWidths[column] = Math.max(columnWidths[column], node.width);
            rowHeights[row] = Math.max(rowHeights[row], node.height);
        });
        let columnOffset = 0;
        const columnOffsets = columnWidths.map((width) => {
            const offset = columnOffset;
            columnOffset += width + CANVAS_MEDIA_LAYOUT_GAP;
            return offset;
        });
        let rowOffset = 0;
        const rowOffsets = rowHeights.map((height) => {
            const offset = rowOffset;
            rowOffset += height + CANVAS_MEDIA_LAYOUT_GAP;
            return offset;
        });
        sorted.forEach((node, index) => {
            positions.set(node.id, { x: bounds.left + columnOffsets[index % columns], y: bounds.top + rowOffsets[Math.floor(index / columns)] });
        });
    }

    return nodes.map((node) => {
        const position = positions.get(node.id);
        if (position === undefined) return node;
        return { ...node, position };
    });
}

export function nodeBounds(nodes: CanvasNodeData[]) {
    return nodes.reduce(
        (acc, node) => ({
            left: Math.min(acc.left, node.position.x),
            top: Math.min(acc.top, node.position.y),
            right: Math.max(acc.right, node.position.x + node.width),
            bottom: Math.max(acc.bottom, node.position.y + node.height),
        }),
        { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );
}

export function findGroupDropTarget(movedIds: Set<string>, nodes: CanvasNodeData[]) {
    if (nodes.some((node) => movedIds.has(node.id) && node.type === CanvasNodeType.Group)) return null;
    const movingNodes = nodes.filter((node) => movedIds.has(node.id) && node.type !== CanvasNodeType.Group);
    if (!movingNodes.length) return null;
    return (
        [...nodes].reverse().find((group) => {
            if (group.type !== CanvasNodeType.Group || movedIds.has(group.id)) return false;
            return movingNodes.some((node) => {
                const centerX = node.position.x + node.width / 2;
                const centerY = node.position.y + node.height / 2;
                return centerX >= group.position.x && centerX <= group.position.x + group.width && centerY >= group.position.y && centerY <= group.position.y + group.height;
            });
        }) || null
    );
}

export function snapNodesIntoGroup(movedIds: Set<string>, nodes: CanvasNodeData[], group: CanvasNodeData) {
    const movingNodes = nodes.filter((node) => movedIds.has(node.id) && node.type !== CanvasNodeType.Group);
    if (!movingNodes.length) return nodes;
    const pad = 24;
    const bounds = nodeBounds(movingNodes);
    const left = group.position.x + pad;
    const top = group.position.y + pad;
    const right = group.position.x + group.width - pad;
    const bottom = group.position.y + group.height - pad;
    const dx = bounds.right - bounds.left > right - left ? left - bounds.left : bounds.left < left ? left - bounds.left : bounds.right > right ? right - bounds.right : 0;
    const dy = bounds.bottom - bounds.top > bottom - top ? top - bounds.top : bounds.top < top ? top - bounds.top : bounds.bottom > bottom ? bottom - bounds.bottom : 0;
    return nodes.map((node) => {
        if (!movedIds.has(node.id) || node.type === CanvasNodeType.Group) return node;
        return { ...node, position: { x: node.position.x + dx, y: node.position.y + dy }, metadata: { ...node.metadata, groupId: group.id } };
    });
}

export function findContainingGroupId(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    const centerX = node.position.x + node.width / 2;
    const centerY = node.position.y + node.height / 2;
    return (
        [...nodes]
            .reverse()
            .find((group) => group.type === CanvasNodeType.Group && group.id !== node.id && centerX >= group.position.x && centerX <= group.position.x + group.width && centerY >= group.position.y && centerY <= group.position.y + group.height)?.id ||
        undefined
    );
}

export function getConnectionTargetAnchor(node: CanvasNodeData, current: ConnectionHandle) {
    return {
        x: current.handleType === "source" ? node.position.x : node.position.x + node.width,
        y: node.position.y + node.height / 2,
    };
}

export function normalizeConnection(firstNodeId: string, secondNodeId: string, nodes: CanvasNodeData[], firstHandleType: "source" | "target") {
    const first = nodes.find((node) => node.id === firstNodeId);
    const second = nodes.find((node) => node.id === secondNodeId);
    if (!first || !second || first.id === second.id) return null;
    if (second.type === CanvasNodeType.Group) return null;
    if (first.type === CanvasNodeType.Config && second.type === CanvasNodeType.Config) return null;
    if (second.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    if (first.type === CanvasNodeType.Config && firstHandleType === "target") return { fromNodeId: second.id, toNodeId: first.id };
    if (first.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    return { fromNodeId: first.id, toNodeId: second.id };
}
