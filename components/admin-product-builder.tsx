"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type DragEvent } from "react";
import {
  builtInProductImages,
  type BuilderBlock,
  type BuilderBlockType,
  defaultBuilderBlocks,
  defaultQuickFacts,
  money,
  type ProductImage,
  productUrl,
  type QuickFact,
} from "@/lib/catalog";
import { Photo, productImageUrl } from "./image";
import { ProductBuilderBlocks } from "./product-blocks";

export type AdminProductData = {
  slug: string;
  name: string;
  shortName: string;
  sku: string;
  category: "Skincare" | "Complexion";
  format: string;
  description: string;
  headline: string;
  ritual: string;
  facts: string;
  ingredients: string;
  packaging: string;
  quickFacts: QuickFact[];
  builderBlocks: BuilderBlock[];
  priceUsd: string;
  comparePriceUsd: string;
  costUsd: string;
  stock: number;
  published: boolean;
  image: string;
  alt: string;
  color: string;
  detailImages: ProductImage[];
  seoTitle: string;
  seoDescription: string;
  revision: string;
};

const WIDGET_PALETTE: {
  type: BuilderBlockType;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    type: "ritual",
    label: "Ritual & Steps",
    hint: "Split photo + numbered steps",
    icon: "☰",
  },
  {
    type: "feature",
    label: "Feature Highlight",
    hint: "Split editorial + Add to bag",
    icon: "◫",
  },
  {
    type: "benefits",
    label: "Benefits Grid",
    hint: "3-column benefit highlights",
    icon: "⊞",
  },
  {
    type: "specs",
    label: "Quick Specs",
    hint: "3-column hairline facts",
    icon: "▤",
  },
  {
    type: "accordion",
    label: "FAQ / Accordion",
    hint: "Expandable Q&A items",
    icon: "⌄",
  },
  {
    type: "banner",
    label: "Banner CTA",
    hint: "Full-width callout banner",
    icon: "▭",
  },
  {
    type: "image",
    label: "Image Showcase",
    hint: "Framed gallery photo + caption",
    icon: "⬒",
  },
];

function createBlock(type: BuilderBlockType, productName: string): BuilderBlock {
  const id = `${type}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  switch (type) {
    case "ritual":
      return {
        id,
        type,
        eyebrow: "How to use",
        heading: "A quiet daily moment.",
        body: "Designed to fit seamlessly into your morning and evening routine.",
        image: "oil-macro",
        alt: productName,
        imageSide: "left",
        tone: "blush",
        steps: [
          "Start with clean, dry or slightly damp skin.",
          "Apply a measured amount evenly across the face.",
          "Follow with the next step in your Eleganza edit.",
        ],
        ctaType: "none",
      };
    case "feature":
      return {
        id,
        type,
        eyebrow: productName || "Eleganza Edit",
        heading: "Soft texture. Effortless finish.",
        body: "Formulated for comfortable everyday wear.",
        image: "oil-detail",
        alt: productName,
        imageSide: "right",
        tone: "sand",
        ctaType: "add_to_bag",
        ctaLabel: "Add to bag",
      };
    case "benefits":
      return {
        id,
        type,
        eyebrow: "Why it works",
        heading: "Thoughtful essentials.",
        body: "",
        tone: "cream",
        items: [
          {
            title: "Lightweight feel",
            detail: "Absorbs smoothly without heaviness or residue.",
          },
          {
            title: "Everyday layering",
            detail: "Pairs cleanly under or over your complexion routine.",
          },
          {
            title: "Refined finish",
            detail: "Leaves skin looking softly luminous and balanced.",
          },
        ],
      };
    case "specs":
      return {
        id,
        type,
        eyebrow: "Formula profile",
        heading: "",
        tone: "white",
        items: [
          { title: "Texture", detail: "Silky, fast-absorbing" },
          { title: "Scent", detail: "Light botanical" },
          { title: "Suitable for", detail: "All skin types" },
        ],
      };
    case "accordion":
      return {
        id,
        type,
        eyebrow: "Details",
        heading: "Common questions",
        tone: "white",
        items: [
          {
            title: "When should I apply this?",
            detail: "Use morning or evening as part of your daily ritual.",
          },
          {
            title: "Can I layer it with makeup?",
            detail:
              "Yes — give it a moment to settle before applying concealer or foundation.",
          },
        ],
      };
    case "banner":
      return {
        id,
        type,
        eyebrow: "Complete the routine",
        heading: "Simple steps, lasting glow.",
        body: "Pair skincare prep with lightweight complexion essentials.",
        tone: "blush",
        ctaType: "add_to_bag",
        ctaLabel: "Add to bag",
      };
    case "image":
      return {
        id,
        type,
        heading: "Studio still life",
        body: "Warm light and tactile packaging.",
        image: "campaign",
        alt: productName,
        tone: "cream",
      };
  }
}

export function ProductBuilderStudio({
  mode,
  initial,
  allProducts,
  createAction,
  saveAction,
  deleteAction,
}: {
  mode: "create" | "edit";
  initial: AdminProductData;
  allProducts: {
    slug: string;
    name: string;
    priceCents: number;
    compareAtCents: number | null;
    stock: number;
    published: boolean;
    image: string;
  }[];
  createAction: (data: FormData) => void;
  saveAction: (data: FormData) => void;
  deleteAction: (data: FormData) => void;
}) {
  const [formState, setFormState] = useState<AdminProductData>(initial);
  const [blocks, setBlocks] = useState<BuilderBlock[]>(
    initial.builderBlocks.length
      ? initial.builderBlocks
      : defaultBuilderBlocks({
          name: initial.name || "New Product",
          category: initial.category,
          headline: initial.headline,
          description: initial.description,
          ritual: initial.ritual,
          facts: initial.facts,
          image: initial.image,
          alt: initial.alt,
          detailImages: initial.detailImages,
        }),
  );
  const [quickFacts, setQuickFacts] = useState<QuickFact[]>(
    initial.quickFacts.length
      ? initial.quickFacts
      : defaultQuickFacts(initial.category, initial.format),
  );
  const [primaryImage, setPrimaryImage] = useState(initial.image || "oil-packshot");
  const [primaryAlt, setPrimaryAlt] = useState(initial.alt || "");
  const [detailImages, setDetailImages] = useState<ProductImage[]>(
    initial.detailImages,
  );
  const [tab, setTab] = useState<"elements" | "product" | "inspector">(
    mode === "create" ? "product" : "elements",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    blocks[0]?.id ?? null,
  );
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [previewGalleryIdx, setPreviewGalleryIdx] = useState(0);
  const [draggedWidget, setDraggedWidget] = useState<BuilderBlockType | null>(
    null,
  );
  const [draggedBlockIdx, setDraggedBlockIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const parsedPriceCents = Math.max(
    0,
    Math.round((Number.parseFloat(formState.priceUsd) || 0) * 100),
  );
  const parsedCompareCents = formState.comparePriceUsd.trim()
    ? Math.round((Number.parseFloat(formState.comparePriceUsd) || 0) * 100)
    : null;
  const hasCompare =
    parsedCompareCents != null && parsedCompareCents > parsedPriceCents;

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const previewGallery: ProductImage[] = [
    {
      name: primaryImage || "oil-packshot",
      alt: primaryAlt || formState.name || "Product",
      label: "Product",
    },
    ...detailImages,
  ];
  const activePreviewImage =
    previewGallery[previewGalleryIdx] ?? previewGallery[0];

  async function uploadFiles(files: FileList | null): Promise<string[]> {
    if (!files || !files.length) return [];
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !json.urls) {
        throw new Error(json.error || "Upload failed.");
      }
      return json.urls;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      return [];
    } finally {
      setUploading(false);
    }
  }

  function insertBlockAt(type: BuilderBlockType, index: number) {
    const fresh = createBlock(type, formState.name || "Product");
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, fresh);
      return next;
    });
    setSelectedId(fresh.id);
    setTab("inspector");
  }

  function moveBlock(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setBlocks((prev) => {
      if (
        fromIdx < 0 ||
        fromIdx >= prev.length ||
        toIdx < 0 ||
        toIdx > prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const adjusted = fromIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(adjusted, 0, moved);
      return next;
    });
  }

  function duplicateBlock(index: number) {
    const target = blocks[index];
    if (!target) return;
    const copy: BuilderBlock = {
      ...target,
      id: `${target.type}-${Date.now().toString(36)}`,
      steps: target.steps ? [...target.steps] : undefined,
      items: target.items ? target.items.map((i) => ({ ...i })) : undefined,
    };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
    setTab("inspector");
  }

  function removeBlock(index: number) {
    const removedId = blocks[index]?.id;
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    if (selectedId === removedId) {
      setSelectedId(null);
    }
  }

  function updateSelectedBlock(patch: Partial<BuilderBlock>) {
    if (!selectedId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)),
    );
  }

  function handleCanvasDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const widgetType =
      draggedWidget ||
      (event.dataTransfer.getData("application/x-eleganza-widget") as
        | BuilderBlockType
        | "");
    if (widgetType) {
      insertBlockAt(widgetType, targetIndex);
    } else if (draggedBlockIdx !== null) {
      moveBlock(draggedBlockIdx, targetIndex);
    }
    setDraggedWidget(null);
    setDraggedBlockIdx(null);
    setDropTargetIdx(null);
  }

  return (
    <div className="builder-shell">
      <form
        id="eleganza-product-builder-form"
        action={mode === "create" ? createAction : saveAction}
        className="builder-form-root"
      >
        {mode === "edit" && (
          <>
            <input type="hidden" name="slug" value={formState.slug} />
            <input type="hidden" name="updated" value={formState.revision} />
          </>
        )}
        <input type="hidden" name="image" value={primaryImage} />
        <input type="hidden" name="alt" value={primaryAlt} />
        <input
          type="hidden"
          name="detailImagesJson"
          value={JSON.stringify(detailImages)}
        />
        <input
          type="hidden"
          name="quickFactsJson"
          value={JSON.stringify(quickFacts)}
        />
        <input
          type="hidden"
          name="builderBlocksJson"
          value={JSON.stringify(blocks)}
        />
        <input type="hidden" name="name" value={formState.name} />
        <input type="hidden" name="shortName" value={formState.shortName} />
        {mode === "create" && (
          <>
            <input type="hidden" name="slug" value={formState.slug} />
            <input type="hidden" name="sku" value={formState.sku} />
          </>
        )}
        <input type="hidden" name="category" value={formState.category} />
        <input type="hidden" name="format" value={formState.format} />
        <input type="hidden" name="description" value={formState.description} />
        <input type="hidden" name="headline" value={formState.headline} />
        <input type="hidden" name="ritual" value={formState.ritual} />
        <input type="hidden" name="facts" value={formState.facts} />
        <input type="hidden" name="ingredients" value={formState.ingredients} />
        <input type="hidden" name="packaging" value={formState.packaging} />
        <input type="hidden" name="price" value={formState.priceUsd} />
        <input
          type="hidden"
          name="comparePrice"
          value={formState.comparePriceUsd}
        />
        <input type="hidden" name="cost" value={formState.costUsd} />
        <input type="hidden" name="stock" value={String(formState.stock)} />
        <input type="hidden" name="color" value={formState.color} />
        <input type="hidden" name="seoTitle" value={formState.seoTitle} />
        <input
          type="hidden"
          name="seoDescription"
          value={formState.seoDescription}
        />
        {formState.published && (
          <input type="hidden" name="published" value="on" />
        )}

        <div className="builder-topbar">
          <div className="builder-topbar__left">
            <Link className="btn btn--outline builder-back-btn" href="/admin/products">
              ← All products
            </Link>
            <div className="builder-switcher">
              {allProducts.map((item) => (
                <Link
                  key={item.slug}
                  href={`/admin/products?edit=${encodeURIComponent(item.slug)}`}
                  className={
                    mode === "edit" && formState.slug === item.slug
                      ? "builder-switcher__pill is-active"
                      : "builder-switcher__pill"
                  }
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/admin/products?new=1"
                className={
                  mode === "create"
                    ? "builder-switcher__pill is-active"
                    : "builder-switcher__pill builder-switcher__new"
                }
              >
                + New product
              </Link>
            </div>
          </div>

          <div className="builder-topbar__right">
            <div className="builder-viewport-toggle" role="group" aria-label="Preview width">
              <button
                type="button"
                className={viewport === "desktop" ? "is-active" : ""}
                onClick={() => setViewport("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                className={viewport === "mobile" ? "is-active" : ""}
                onClick={() => setViewport("mobile")}
              >
                Mobile
              </button>
            </div>
            {mode === "edit" && (
              <Link
                className="btn btn--outline builder-live-btn"
                href={productUrl(formState.slug)}
                target="_blank"
              >
                View live ↗
              </Link>
            )}
            <button type="submit" className="btn btn--fern builder-save-btn">
              {mode === "create" ? "Create product" : "Save product"}
            </button>
          </div>
        </div>
      </form>

      <div className="builder-workspace">
        <aside className="builder-sidebar" aria-label="Page builder controls">
          <div className="builder-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "elements"}
              onClick={() => setTab("elements")}
            >
              + Elements
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "product"}
              onClick={() => setTab("product")}
            >
              Product
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "inspector"}
              onClick={() => setTab("inspector")}
            >
              Inspector
            </button>
          </div>

          <div className="builder-sidebar-body">
            {tab === "elements" && (
              <div className="builder-palette">
                <p className="builder-help">
                  Drag any section onto the product page canvas, or click to add
                  it below.
                </p>
                <div className="builder-widget-grid">
                  {WIDGET_PALETTE.map((w) => (
                    <button
                      key={w.type}
                      type="button"
                      draggable
                      className="builder-widget-card"
                      onDragStart={(e) => {
                        setDraggedWidget(w.type);
                        setDraggedBlockIdx(null);
                        e.dataTransfer.setData(
                          "application/x-eleganza-widget",
                          w.type,
                        );
                      }}
                      onDragEnd={() => {
                        setDraggedWidget(null);
                        setDropTargetIdx(null);
                      }}
                      onClick={() => insertBlockAt(w.type, blocks.length)}
                    >
                      <span className="builder-widget-icon" aria-hidden="true">
                        {w.icon}
                      </span>
                      <strong>{w.label}</strong>
                      <small>{w.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "product" && (
              <div className="builder-panel-fields">
                <div className="builder-section-group">
                  <h3>Basics & Pricing</h3>
                  <label>
                    Product name
                    <input
                      required
                      value={formState.name}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, name: e.target.value }))
                      }
                      maxLength={110}
                    />
                  </label>
                  <div className="admin-fields">
                    <label>
                      SKU
                      <input
                        required
                        readOnly={mode === "edit"}
                        value={formState.sku}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, sku: e.target.value }))
                        }
                        maxLength={40}
                      />
                    </label>
                    <label>
                      Slug {mode === "create" && <span>(auto)</span>}
                      <input
                        readOnly={mode === "edit"}
                        value={formState.slug}
                        placeholder="auto-from-name"
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, slug: e.target.value }))
                        }
                        maxLength={120}
                      />
                    </label>
                  </div>
                  <div className="admin-fields">
                    <label>
                      Price (USD)
                      <input
                        required
                        inputMode="decimal"
                        value={formState.priceUsd}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            priceUsd: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Compared price (USD)
                      <input
                        inputMode="decimal"
                        placeholder="e.g. 49.97"
                        value={formState.comparePriceUsd}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            comparePriceUsd: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="admin-fields">
                    <label>
                      Stock
                      <input
                        type="number"
                        min={0}
                        max={9999999}
                        value={formState.stock}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            stock: Number.parseInt(e.target.value || "0", 10) || 0,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Landed cost (USD)
                      <input
                        inputMode="decimal"
                        value={formState.costUsd}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            costUsd: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="admin-fields">
                    <label>
                      Category
                      <select
                        value={formState.category}
                        onChange={(e) =>
                          setFormState((s) => ({
                            ...s,
                            category:
                              e.target.value === "Complexion"
                                ? "Complexion"
                                : "Skincare",
                          }))
                        }
                      >
                        <option value="Skincare">Skincare</option>
                        <option value="Complexion">Complexion</option>
                      </select>
                    </label>
                    <label>
                      Format
                      <input
                        value={formState.format}
                        onChange={(e) =>
                          setFormState((s) => ({ ...s, format: e.target.value }))
                        }
                        maxLength={60}
                      />
                    </label>
                  </div>
                  <label>
                    Summary description
                    <textarea
                      rows={3}
                      value={formState.description}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                      maxLength={1200}
                    />
                  </label>
                  <label>
                    Size & scent facts line
                    <input
                      value={formState.facts}
                      placeholder="e.g. 30 mL / 1 fl oz · Botanical finish"
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, facts: e.target.value }))
                      }
                      maxLength={180}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={formState.published}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          published: e.target.checked,
                        }))
                      }
                    />{" "}
                    Display this product in storefront
                  </label>
                </div>

                <div className="builder-section-group">
                  <h3>Images</h3>
                  <div className="builder-image-row">
                    <img
                      className="builder-thumb"
                      src={productImageUrl(primaryImage)}
                      alt={primaryAlt}
                    />
                    <div className="builder-image-row__inputs">
                      <input
                        value={primaryImage}
                        onChange={(e) => setPrimaryImage(e.target.value)}
                        placeholder="Primary image URL or preset"
                      />
                      <div className="builder-upload-row">
                        <label className="btn btn--outline builder-upload-pill">
                          {uploading ? "Uploading…" : "Upload primary"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                            disabled={uploading}
                            onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                              const urls = await uploadFiles(e.currentTarget.files);
                              if (urls[0]) setPrimaryImage(urls[0]);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <select
                          aria-label="Primary preset"
                          value={
                            builtInProductImages.some(
                              (a) => a.key === primaryImage,
                            )
                              ? primaryImage
                              : ""
                          }
                          onChange={(e) => {
                            if (e.target.value) setPrimaryImage(e.target.value);
                          }}
                        >
                          <option value="">Presets…</option>
                          {builtInProductImages.map((a) => (
                            <option key={a.key} value={a.key}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <label>
                    Primary alt text
                    <input
                      value={primaryAlt}
                      onChange={(e) => setPrimaryAlt(e.target.value)}
                      maxLength={240}
                    />
                  </label>

                  <div className="builder-subhead">
                    <span>Gallery views ({detailImages.length})</span>
                    <label className="btn btn--outline builder-upload-pill">
                      + Upload
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                        disabled={uploading}
                        onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                          const urls = await uploadFiles(e.currentTarget.files);
                          if (urls.length) {
                            setDetailImages((prev) => [
                              ...prev,
                              ...urls.map((url, idx) => ({
                                name: url,
                                alt: "",
                                label: `View ${prev.length + idx + 1}`,
                              })),
                            ]);
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {uploadError && (
                    <p className="form-error" role="alert">
                      {uploadError}
                    </p>
                  )}
                  {detailImages.map((img, idx) => (
                    <div className="builder-gallery-mini" key={`${idx}-${img.name}`}>
                      <img src={productImageUrl(img.name)} alt={img.alt} />
                      <div>
                        <input
                          value={img.label}
                          placeholder="Tab label (e.g. Texture)"
                          onChange={(e) =>
                            setDetailImages((prev) =>
                              prev.map((d, i) =>
                                i === idx ? { ...d, label: e.target.value } : d,
                              ),
                            )
                          }
                        />
                        <input
                          value={img.name}
                          placeholder="Image URL or preset"
                          onChange={(e) =>
                            setDetailImages((prev) =>
                              prev.map((d, i) =>
                                i === idx ? { ...d, name: e.target.value } : d,
                              ),
                            )
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="text-button admin-danger-link"
                        onClick={() =>
                          setDetailImages((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn--outline builder-small-btn"
                    onClick={() =>
                      setDetailImages((prev) => [
                        ...prev,
                        {
                          name: "oil-detail",
                          alt: "",
                          label: `View ${prev.length + 1}`,
                        },
                      ])
                    }
                  >
                    + Add gallery slot
                  </button>
                </div>

                <div className="builder-section-group">
                  <h3>Quick Facts Strip</h3>
                  {quickFacts.map((fact, idx) => (
                    <div className="admin-fields" key={idx}>
                      <input
                        value={fact.label}
                        placeholder="Label"
                        onChange={(e) =>
                          setQuickFacts((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, label: e.target.value } : f,
                            ),
                          )
                        }
                      />
                      <input
                        value={fact.value}
                        placeholder="Value"
                        onChange={(e) =>
                          setQuickFacts((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, value: e.target.value } : f,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="builder-section-group">
                  <h3>Accordions & SEO</h3>
                  <label>
                    Ingredients accordion copy
                    <textarea
                      rows={3}
                      value={formState.ingredients}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          ingredients: e.target.value,
                        }))
                      }
                      maxLength={3000}
                    />
                  </label>
                  <label>
                    Formula & packaging copy
                    <textarea
                      rows={2}
                      value={formState.packaging}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          packaging: e.target.value,
                        }))
                      }
                      maxLength={1200}
                    />
                  </label>
                  <label>
                    Search title (SEO)
                    <input
                      value={formState.seoTitle}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          seoTitle: e.target.value,
                        }))
                      }
                      maxLength={110}
                    />
                  </label>
                  <label>
                    Search description (SEO)
                    <textarea
                      rows={2}
                      value={formState.seoDescription}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          seoDescription: e.target.value,
                        }))
                      }
                      maxLength={230}
                    />
                  </label>
                </div>

                {mode === "edit" && (
                  <form action={deleteAction} className="builder-delete-wrap">
                    <input type="hidden" name="slug" value={formState.slug} />
                    <button
                      type="submit"
                      className="text-button admin-danger-link"
                    >
                      Delete product (if no orders exist)
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === "inspector" && (
              <div className="builder-panel-fields">
                {!selectedBlock ? (
                  <p className="builder-help">
                    Click any section on the live canvas to edit its content,
                    layout, colors, or image.
                  </p>
                ) : (
                  <div className="builder-section-group">
                    <div className="builder-subhead">
                      <h3>Editing: {selectedBlock.type}</h3>
                      <button
                        type="button"
                        className="text-button admin-danger-link"
                        onClick={() => {
                          const idx = blocks.findIndex(
                            (b) => b.id === selectedBlock.id,
                          );
                          if (idx >= 0) removeBlock(idx);
                        }}
                      >
                        Delete block
                      </button>
                    </div>

                    <label>
                      Eyebrow / small label
                      <input
                        value={selectedBlock.eyebrow ?? ""}
                        onChange={(e) =>
                          updateSelectedBlock({ eyebrow: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Heading
                      <input
                        value={selectedBlock.heading ?? ""}
                        onChange={(e) =>
                          updateSelectedBlock({ heading: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Body copy
                      <textarea
                        rows={3}
                        value={selectedBlock.body ?? ""}
                        onChange={(e) =>
                          updateSelectedBlock({ body: e.target.value })
                        }
                      />
                    </label>

                    <div className="admin-fields">
                      <label>
                        Background tone
                        <select
                          value={selectedBlock.tone || "blush"}
                          onChange={(e) =>
                            updateSelectedBlock({
                              tone: e.target.value as BuilderBlock["tone"],
                            })
                          }
                        >
                          <option value="blush">Blush (#f5ded2)</option>
                          <option value="sand">Warm Sand (#f3e8df)</option>
                          <option value="cream">Linen Cream (#fffaf5)</option>
                          <option value="white">Crisp White (#ffffff)</option>
                        </select>
                      </label>
                      {(selectedBlock.type === "ritual" ||
                        selectedBlock.type === "feature") && (
                        <label>
                          Image side
                          <select
                            value={selectedBlock.imageSide || "left"}
                            onChange={(e) =>
                              updateSelectedBlock({
                                imageSide: e.target.value as "left" | "right",
                              })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                      )}
                    </div>

                    {(selectedBlock.type === "ritual" ||
                      selectedBlock.type === "feature" ||
                      selectedBlock.type === "image") && (
                      <>
                        <label>
                          Section image path or URL
                          <input
                            value={selectedBlock.image ?? ""}
                            onChange={(e) =>
                              updateSelectedBlock({ image: e.target.value })
                            }
                          />
                        </label>
                        <div className="builder-upload-row">
                          <label className="btn btn--outline builder-upload-pill">
                            {uploading ? "Uploading…" : "Upload image"}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                              disabled={uploading}
                              onChange={async (
                                e: ChangeEvent<HTMLInputElement>,
                              ) => {
                                const urls = await uploadFiles(
                                  e.currentTarget.files,
                                );
                                if (urls[0])
                                  updateSelectedBlock({ image: urls[0] });
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                          <select
                            aria-label="Block image preset"
                            value={
                              builtInProductImages.some(
                                (a) => a.key === selectedBlock.image,
                              )
                                ? selectedBlock.image
                                : ""
                            }
                            onChange={(e) => {
                              if (e.target.value)
                                updateSelectedBlock({ image: e.target.value });
                            }}
                          >
                            <option value="">Presets…</option>
                            {builtInProductImages.map((a) => (
                              <option key={a.key} value={a.key}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedBlock.type === "ritual" && (
                      <div className="builder-list-editor">
                        <div className="builder-subhead">
                          <span>Numbered steps</span>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              updateSelectedBlock({
                                steps: [
                                  ...(selectedBlock.steps || []),
                                  "New ritual step.",
                                ],
                              })
                            }
                          >
                            + Add step
                          </button>
                        </div>
                        {(selectedBlock.steps || []).map((step, i) => (
                          <div className="builder-list-row" key={i}>
                            <input
                              value={step}
                              onChange={(e) =>
                                updateSelectedBlock({
                                  steps: (selectedBlock.steps || []).map(
                                    (s, idx) =>
                                      idx === i ? e.target.value : s,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="text-button admin-danger-link"
                              onClick={() =>
                                updateSelectedBlock({
                                  steps: (selectedBlock.steps || []).filter(
                                    (_, idx) => idx !== i,
                                  ),
                                })
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(selectedBlock.type === "benefits" ||
                      selectedBlock.type === "specs" ||
                      selectedBlock.type === "accordion") && (
                      <div className="builder-list-editor">
                        <div className="builder-subhead">
                          <span>Items</span>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() =>
                              updateSelectedBlock({
                                items: [
                                  ...(selectedBlock.items || []),
                                  { title: "New item", detail: "Details here." },
                                ],
                              })
                            }
                          >
                            + Add item
                          </button>
                        </div>
                        {(selectedBlock.items || []).map((item, i) => (
                          <div className="builder-item-card" key={i}>
                            <input
                              value={item.title}
                              placeholder="Title"
                              onChange={(e) =>
                                updateSelectedBlock({
                                  items: (selectedBlock.items || []).map(
                                    (it, idx) =>
                                      idx === i
                                        ? { ...it, title: e.target.value }
                                        : it,
                                  ),
                                })
                              }
                            />
                            <textarea
                              rows={2}
                              value={item.detail}
                              placeholder="Detail"
                              onChange={(e) =>
                                updateSelectedBlock({
                                  items: (selectedBlock.items || []).map(
                                    (it, idx) =>
                                      idx === i
                                        ? { ...it, detail: e.target.value }
                                        : it,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="text-button admin-danger-link"
                              onClick={() =>
                                updateSelectedBlock({
                                  items: (selectedBlock.items || []).filter(
                                    (_, idx) => idx !== i,
                                  ),
                                })
                              }
                            >
                              Remove item
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(selectedBlock.type === "ritual" ||
                      selectedBlock.type === "feature" ||
                      selectedBlock.type === "banner") && (
                      <div className="builder-list-editor">
                        <label>
                          Call to action
                          <select
                            value={selectedBlock.ctaType || "none"}
                            onChange={(e) =>
                              updateSelectedBlock({
                                ctaType: e.target
                                  .value as BuilderBlock["ctaType"],
                              })
                            }
                          >
                            <option value="none">None</option>
                            <option value="add_to_bag">Add to bag button</option>
                            <option value="link">Custom link button</option>
                          </select>
                        </label>
                        {selectedBlock.ctaType &&
                          selectedBlock.ctaType !== "none" && (
                            <label>
                              Button label
                              <input
                                value={selectedBlock.ctaLabel ?? "Add to bag"}
                                onChange={(e) =>
                                  updateSelectedBlock({
                                    ctaLabel: e.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                        {selectedBlock.ctaType === "link" && (
                          <label>
                            Link URL
                            <input
                              value={selectedBlock.ctaHref ?? "/collections/all"}
                              onChange={(e) =>
                                updateSelectedBlock({ ctaHref: e.target.value })
                              }
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="builder-canvas-stage" aria-label="Live product page preview">
          <div
            className={
              viewport === "mobile"
                ? "builder-canvas-frame is-mobile"
                : "builder-canvas-frame"
            }
          >
            <div
              className="builder-hero-preview"
              onClick={() => setTab("product")}
              title="Click to edit Hero Product Data"
            >
              <div className="builder-hero-badge">
                Product Hero (Click to edit name, price, images & facts)
              </div>
              <div className="product-breadcrumb">
                <span>Shop</span>
                <span>/</span>
                <span>{formState.name || "Untitled Product"}</span>
              </div>

              <div className="product-page__layout">
                <div className="product-page__media">
                  <div className="pdp-stage">
                    <Photo
                      name={activePreviewImage.name}
                      alt={activePreviewImage.alt}
                      sizes="480px"
                    />
                  </div>
                  {previewGallery.length > 1 && (
                    <div className="product-gallery">
                      {previewGallery.map((g, i) => (
                        <button
                          key={`${g.name}-${i}`}
                          type="button"
                          className="product-thumb-pill"
                          aria-pressed={i === previewGalleryIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewGalleryIdx(i);
                          }}
                        >
                          <span className="product-thumb-pill__img">
                            <Photo name={g.name} alt="" sizes="40px" />
                          </span>
                          <span>{g.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="product-page__info">
                  <h1>{formState.name || "New Product"}</h1>
                  <p className="product-page__summary">
                    {formState.description || "Describe your product here."}
                  </p>
                  <p className="product-page__facts">
                    {formState.facts || `${formState.format} · ${formState.category}`}
                  </p>
                  <div className="pdp-price-bar">
                    <strong className="pdp-price-main">
                      {money(parsedPriceCents)}
                    </strong>
                    {hasCompare && (
                      <>
                        <s className="price-compare">
                          {money(parsedCompareCents!)}
                        </s>
                        <span className="pdp-save-badge">
                          Save {money(parsedCompareCents! - parsedPriceCents)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pdp-purchase-row">
                    <div className="quantity">
                      <span>−</span>
                      <output>1</output>
                      <span>+</span>
                    </div>
                    <span className="btn btn--fern pdp-add-btn">
                      Add to bag — {money(parsedPriceCents)}
                    </span>
                  </div>
                  {quickFacts.length > 0 && (
                    <dl className="product-quick-facts">
                      {quickFacts.slice(0, 3).map((qf, idx) => (
                        <div key={idx}>
                          <dt>{qf.label}</dt>
                          <dd>{qf.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            </div>

            <div className="builder-blocks-canvas">
              <div
                className={
                  dropTargetIdx === 0
                    ? "builder-drop-zone is-over"
                    : "builder-drop-zone"
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTargetIdx(0);
                }}
                onDragLeave={() => setDropTargetIdx(null)}
                onDrop={(e) => handleCanvasDrop(0, e)}
              >
                {draggedWidget || draggedBlockIdx !== null
                  ? "Drop section here"
                  : ""}
              </div>

              <ProductBuilderBlocks
                blocks={blocks}
                product={{
                  slug: formState.slug || "preview",
                  name: formState.name || "Product",
                  price: parsedPriceCents,
                  stock: formState.stock,
                }}
                wrapBlock={(block, index, node) => (
                  <>
                    <div
                      className={
                        selectedId === block.id
                          ? "builder-block-wrap is-selected"
                          : "builder-block-wrap"
                      }
                      draggable
                      onDragStart={(e) => {
                        setDraggedBlockIdx(index);
                        setDraggedWidget(null);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedBlockIdx(null);
                        setDropTargetIdx(null);
                      }}
                      onClick={() => {
                        setSelectedId(block.id);
                        setTab("inspector");
                      }}
                    >
                      <div className="builder-block-toolbar">
                        <span className="builder-block-handle">
                          ⋮⋮ {block.type}
                        </span>
                        <div className="builder-block-actions">
                          <button
                            type="button"
                            title="Move up"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(index, index - 1);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Move down"
                            disabled={index === blocks.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(index, index + 2);
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateBlock(index);
                            }}
                          >
                            ⧉
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(index);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {node}
                    </div>
                    <div
                      className={
                        dropTargetIdx === index + 1
                          ? "builder-drop-zone is-over"
                          : "builder-drop-zone"
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropTargetIdx(index + 1);
                      }}
                      onDragLeave={() => setDropTargetIdx(null)}
                      onDrop={(e) => handleCanvasDrop(index + 1, e)}
                    >
                      {draggedWidget || draggedBlockIdx !== null
                        ? "Drop section here"
                        : ""}
                    </div>
                  </>
                )}
              />

              <div
                className={
                  dropTargetIdx === blocks.length
                    ? "builder-empty-drop is-over"
                    : "builder-empty-drop"
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTargetIdx(blocks.length);
                }}
                onDragLeave={() => setDropTargetIdx(null)}
                onDrop={(e) => handleCanvasDrop(blocks.length, e)}
              >
                <p>Drag an Elementor section from the left or click to append:</p>
                <div className="builder-quick-add">
                  {WIDGET_PALETTE.map((w) => (
                    <button
                      key={w.type}
                      type="button"
                      className="btn btn--outline builder-small-btn"
                      onClick={() => insertBlockAt(w.type, blocks.length)}
                    >
                      + {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
