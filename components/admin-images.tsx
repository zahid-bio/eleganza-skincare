"use client";

import { useState, type ChangeEvent } from "react";
import { builtInProductImages, type ProductImage } from "@/lib/catalog";
import { productImageUrl } from "./image";

export function ProductImageManager({
  initialPrimary = "oil-packshot",
  initialAlt = "",
  initialDetails = [],
}: {
  initialPrimary?: string;
  initialAlt?: string;
  initialDetails?: ProductImage[];
}) {
  const [primary, setPrimary] = useState(initialPrimary || "oil-packshot");
  const [alt, setAlt] = useState(initialAlt);
  const [details, setDetails] = useState<ProductImage[]>(initialDetails);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | null): Promise<string[]> {
    if (!files || files.length === 0) return [];
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("file", file));
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !json.urls) {
        throw new Error(json.error || "Image upload failed.");
      }
      return json.urls;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
      return [];
    } finally {
      setUploading(false);
    }
  }

  async function handlePrimaryUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const urls = await uploadFiles(input.files);
    if (urls[0]) setPrimary(urls[0]);
    input.value = "";
  }

  async function handleDetailUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const urls = await uploadFiles(input.files);
    if (urls.length) {
      setDetails((prev) => [
        ...prev,
        ...urls.map((url, idx) => ({
          name: url,
          alt: "",
          label: `Gallery ${prev.length + idx + 1}`,
        })),
      ]);
    }
    input.value = "";
  }

  function updateDetail(
    index: number,
    patch: Partial<ProductImage>,
  ) {
    setDetails((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeDetail(index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function promoteDetail(index: number) {
    const target = details[index];
    if (!target) return;
    const prevPrimary = primary;
    const prevAlt = alt;
    setPrimary(target.name);
    setAlt(target.alt);
    setDetails((prev) =>
      prev.map((item, i) =>
        i === index
          ? { name: prevPrimary, alt: prevAlt, label: item.label || "Studio view" }
          : item,
      ),
    );
  }

  return (
    <div className="admin-images-box">
      <input type="hidden" name="image" value={primary} />
      <input
        type="hidden"
        name="detailImagesJson"
        value={JSON.stringify(details)}
      />

      <div className="admin-images-header">
        <strong>Product images</strong>
        <span>Upload photos or choose an image path / URL.</span>
      </div>

      <div className="admin-primary-image">
        <div className="admin-image-preview">
          <img src={productImageUrl(primary)} alt={alt || "Primary image"} />
        </div>
        <div className="admin-image-controls">
          <label>
            Primary image path or URL
            <input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              placeholder="/api/media/... or https://... or oil-packshot"
              maxLength={500}
            />
          </label>
          <div className="admin-image-actions">
            <label className="button button-outline admin-upload-btn">
              {uploading ? "Uploading…" : "Upload primary image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={handlePrimaryUpload}
                disabled={uploading}
              />
            </label>
            <select
              aria-label="Choose built-in studio image"
              value={
                builtInProductImages.some((asset) => asset.key === primary)
                  ? primary
                  : ""
              }
              onChange={(e) => {
                if (e.target.value) setPrimary(e.target.value);
              }}
            >
              <option value="">Studio presets…</option>
              {builtInProductImages.map((asset) => (
                <option key={asset.key} value={asset.key}>
                  {asset.label}
                </option>
              ))}
            </select>
          </div>
          <label>
            Primary image alt text
            <input
              name="alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the primary product photo"
              maxLength={240}
            />
          </label>
        </div>
      </div>

      <div className="admin-gallery-header">
        <span>Additional gallery images ({details.length})</span>
        <div className="admin-gallery-btns">
          <label className="button button-outline admin-upload-btn">
            {uploading ? "Uploading…" : "+ Upload gallery images"}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={handleDetailUpload}
              disabled={uploading}
            />
          </label>
          <button
            type="button"
            className="button button-outline admin-small-btn"
            onClick={() =>
              setDetails((prev) => [
                ...prev,
                {
                  name: "oil-detail",
                  alt: "",
                  label: `Gallery ${prev.length + 1}`,
                },
              ])
            }
          >
            + Add image slot
          </button>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {details.length > 0 && (
        <div className="admin-gallery-list">
          {details.map((img, index) => (
            <div className="admin-gallery-item" key={`${index}-${img.name}`}>
              <div className="admin-image-preview admin-image-preview-sm">
                <img
                  src={productImageUrl(img.name)}
                  alt={img.alt || img.label}
                />
              </div>
              <div className="admin-gallery-fields">
                <div className="admin-fields">
                  <label>
                    Image path or URL
                    <input
                      value={img.name}
                      onChange={(e) =>
                        updateDetail(index, { name: e.target.value })
                      }
                      maxLength={500}
                    />
                  </label>
                  <label>
                    Label
                    <input
                      value={img.label}
                      onChange={(e) =>
                        updateDetail(index, { label: e.target.value })
                      }
                      maxLength={60}
                    />
                  </label>
                </div>
                <label>
                  Alt text
                  <input
                    value={img.alt}
                    onChange={(e) =>
                      updateDetail(index, { alt: e.target.value })
                    }
                    maxLength={240}
                  />
                </label>
                <div className="admin-gallery-item-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => promoteDetail(index)}
                  >
                    Make primary
                  </button>
                  <button
                    type="button"
                    className="text-button admin-danger-link"
                    onClick={() => removeDetail(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
