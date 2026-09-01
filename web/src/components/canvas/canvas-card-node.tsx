import { useRef } from "react";
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
    const updateName = (cardName: string) => onChange?.({ cardName });

    return (
        <div className="flex h-full w-full flex-col gap-2.5 p-3" data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: theme.toolbar.itemHover, color: theme.node.muted }}>
                    {isCharacter ? <UserRound className="size-4" /> : <ImagePlus className="size-4" />}
                </span>
                <input
                    value={node.metadata?.cardName || ""}
                    onChange={(event) => updateName(event.target.value)}
                    placeholder={t(`canvas.card.${isCharacter ? "characterName" : "name"}`)}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none placeholder:font-normal"
                    style={{ color: theme.node.text }}
                />
            </div>
            {isCharacter ? (
                <>
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                        <CardImageSlot label={t("canvas.card.face")} image={face} onChange={(cardFaceImage) => onChange?.({ cardFaceImage })} />
                        <CardImageSlot label={t("canvas.card.outfit")} image={outfit} onChange={(cardOutfitImage) => onChange?.({ cardOutfitImage })} />
                    </div>
                    <CardVoiceSlot voice={voice} onChange={(cardVoice) => onChange?.({ cardVoice })} />
                </>
            ) : (
                <CardImageSlot label={t("canvas.card.image")} image={image} onChange={(cardImage) => onChange?.({ cardImage })} className="flex-1" />
            )}
        </div>
    );
}

function CardImageSlot({ label, image, onChange, className = "" }: { label: string; image?: CanvasCardMedia; onChange: (image: CanvasCardMedia) => void; className?: string }) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const inputRef = useRef<HTMLInputElement>(null);
    const selectImage = async (file?: File) => {
        if (!file) return;
        const uploaded = await uploadImage(file);
        onChange({ url: uploaded.url, storageKey: uploaded.storageKey, mimeType: uploaded.mimeType, bytes: uploaded.bytes, width: uploaded.width, height: uploaded.height });
    };
    return (
        <button type="button" className={`group relative min-h-0 overflow-hidden rounded-lg border text-left transition hover:opacity-85 ${className}`} style={{ background: theme.toolbar.itemHover, borderColor: theme.toolbar.border }} onClick={() => inputRef.current?.click()}>
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
        <div className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2" style={{ background: theme.toolbar.itemHover }}>
            <Volume2 className="size-3.5 shrink-0" style={{ color: theme.node.muted }} />
            {voice?.url ? <audio src={voice.url} controls className="h-7 min-w-0 flex-1" /> : <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: theme.node.muted }}>{t("canvas.card.voice")}</span>}
            <button type="button" className="grid size-7 shrink-0 place-items-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text }} title={t("canvas.card.uploadVoice")} onClick={() => inputRef.current?.click()}><Music2 className="size-3.5" /></button>
            <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => void selectVoice(event.target.files?.[0])} />
        </div>
    );
}
