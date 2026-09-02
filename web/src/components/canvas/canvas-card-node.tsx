import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { ImagePlus, Music2, Upload, UserRound, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { uploadMediaFile } from "@/services/file-storage";
import { uploadImage } from "@/services/image-storage";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasCardMedia, type CanvasNodeData, type CanvasNodeMetadata } from "@/types/canvas";

export function CanvasCardNode({ node, onChange }: { node: CanvasNodeData; onChange?: (patch: Partial<CanvasNodeMetadata>) => void }) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const isCharacter = node.type === CanvasNodeType.CharacterCard;
    const image = node.metadata?.cardImage;
    const face = node.metadata?.cardFaceImage;
    const outfit = node.metadata?.cardOutfitImage;
    const voice = node.metadata?.cardVoice;
    const defaultImageInputRef = useRef<HTMLInputElement>(null);
    const cancelCardClickRef = useRef<(() => void) | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const updateName = (cardName: string) => onChange?.({ cardName });
    const namePlaceholder = t(`canvas.card.${isCharacter ? "characterName" : "name"}`);

    useEffect(() => () => cancelCardClickRef.current?.(), []);

    const handleCardMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest("[data-canvas-card-media]")) return;
        const isDragHandle = event.target instanceof Element && Boolean(event.target.closest("[data-canvas-card-drag]"));
        cancelCardClickRef.current?.();
        const startX = event.clientX;
        const startY = event.clientY;
        let moved = false;
        const clear = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (cancelCardClickRef.current === clear) cancelCardClickRef.current = null;
        };
        const onMove = (moveEvent: MouseEvent) => {
            if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) moved = true;
        };
        const onUp = () => {
            clear();
            if (!moved && !isDragHandle) defaultImageInputRef.current?.click();
        };
        cancelCardClickRef.current = clear;
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div className="flex h-full w-full flex-col gap-2.5 p-3" data-canvas-no-zoom onMouseDown={handleCardMouseDown} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div data-canvas-card-drag className="relative flex h-12 min-w-0 shrink-0 items-center gap-2 px-1">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: theme.toolbar.itemHover, color: theme.node.muted }}>
                    {isCharacter ? <UserRound className="size-4" /> : <ImagePlus className="size-4" />}
                </span>
                <span className="min-w-0 max-w-[calc(100%-144px)] flex-1 truncate text-sm font-semibold opacity-70" style={{ color: theme.node.text }}>{node.metadata?.cardName || namePlaceholder}</span>
                {isHovered ? <input value={node.metadata?.cardName || ""} onChange={(event) => updateName(event.target.value)} placeholder={namePlaceholder} className="absolute right-1 top-1/2 h-8 w-32 -translate-y-1/2 rounded-md border bg-transparent px-2 text-sm font-semibold outline-none placeholder:font-normal" style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} /> : null}
            </div>
            {isCharacter ? (
                <>
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                        <CardImageSlot label={t("canvas.card.face")} image={face} inputRef={defaultImageInputRef} onChange={(cardFaceImage) => onChange?.({ cardFaceImage })} />
                        <CardImageSlot label={t("canvas.card.outfit")} image={outfit} onChange={(cardOutfitImage) => onChange?.({ cardOutfitImage })} />
                    </div>
                    <CardVoiceSlot voice={voice} onChange={(cardVoice) => onChange?.({ cardVoice })} />
                </>
            ) : (
                <CardImageSlot label={t("canvas.card.image")} image={image} inputRef={defaultImageInputRef} onChange={(cardImage) => onChange?.({ cardImage })} className="flex-1" />
            )}
        </div>
    );
}

function CardImageSlot({ label, image, inputRef: sharedInputRef, onChange, className = "" }: { label: string; image?: CanvasCardMedia; inputRef?: RefObject<HTMLInputElement | null>; onChange: (image: CanvasCardMedia) => void; className?: string }) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const localInputRef = useRef<HTMLInputElement>(null);
    const cancelImageClickRef = useRef<(() => void) | null>(null);
    const inputRef = sharedInputRef || localInputRef;
    const selectImage = async (file?: File) => {
        if (!file) return;
        const uploaded = await uploadImage(file);
        onChange({ url: uploaded.url, storageKey: uploaded.storageKey, mimeType: uploaded.mimeType, bytes: uploaded.bytes, width: uploaded.width, height: uploaded.height });
    };
    useEffect(() => () => cancelImageClickRef.current?.(), []);
    const handleMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        cancelImageClickRef.current?.();
        const startX = event.clientX;
        const startY = event.clientY;
        let moved = false;
        const clear = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (cancelImageClickRef.current === clear) cancelImageClickRef.current = null;
        };
        const onMove = (moveEvent: MouseEvent) => {
            if (Math.abs(moveEvent.clientX - startX) > 3 || Math.abs(moveEvent.clientY - startY) > 3) moved = true;
        };
        const onUp = () => {
            clear();
            if (!moved) inputRef.current?.click();
        };
        cancelImageClickRef.current = clear;
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };
    return (
        <button type="button" data-canvas-card-media className={`group relative min-h-0 overflow-hidden rounded-lg border text-left transition hover:opacity-85 ${className}`} style={{ background: theme.toolbar.itemHover, borderColor: theme.toolbar.border }} onMouseDown={handleMouseDown} onClick={(event) => { if (event.detail === 0) inputRef.current?.click(); }}>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void selectImage(event.target.files?.[0])} />
            {image?.url ? <img src={image.url} alt={label} className="size-full object-cover" /> : <span className="flex size-full flex-col items-center justify-center gap-1.5" style={{ color: theme.node.muted }}><Upload className="size-4" /><span className="text-[10px]">{label}</span></span>}
            {image?.url ? <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-center text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{t("canvas.card.replace")}</span> : null}
        </button>
    );
}

function CardVoiceSlot({ voice, onChange }: { voice?: CanvasCardMedia; onChange: (voice: CanvasCardMedia) => void }) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const inputRef = useRef<HTMLInputElement>(null);
    const selectVoice = async (file?: File) => {
        if (!file) return;
        const uploaded = await uploadMediaFile(file, "audio");
        onChange({ url: uploaded.url, storageKey: uploaded.storageKey, mimeType: uploaded.mimeType, bytes: uploaded.bytes, durationMs: uploaded.durationMs });
    };
    return (
        <div className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2" style={{ background: theme.toolbar.itemHover }} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <Volume2 className="size-3.5 shrink-0" style={{ color: theme.node.muted }} />
            {voice?.url ? <audio src={voice.url} controls className="h-7 min-w-0 flex-1" /> : <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: theme.node.muted }}>{t("canvas.card.voice")}</span>}
            <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text }} title={t("canvas.card.uploadVoice")} onClick={() => inputRef.current?.click()}><Music2 className="size-3.5" /></button>
            <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void selectVoice(event.target.files?.[0])} />
        </div>
    );
}
