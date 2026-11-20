"use client";

import { useEffect, useRef, useState } from "react";
import { money, type ProductImage, type StoreProduct } from "@/lib/catalog";
import { Icon } from "./icon";
import { Photo } from "./image";
import { Quantity, useStore } from "./store";

const frameNumber = (index: number) => String(index + 1).padStart(2, "0");

export function Gallery({ images }: { images: ProductImage[] }) {
  const [active, setActive] = useState(0);
  const [enlarged, setEnlarged] = useState(0);
  const lightbox = useRef<HTMLDialogElement>(null);
  const photo = images[active] ?? images[0];
  const modalPhoto = images[enlarged] ?? images[0];

  function open(index: number) {
    setEnlarged(index);
    lightbox.current?.showModal();
  }

  function moveEnlarged(delta: number) {
    setEnlarged((index) => (index + delta + images.length) % images.length);
  }

  if (!photo) return null;

  return (
    <div className="product-page__media">
      <button
        type="button"
        className="pdp-stage"
        aria-label={`Enlarge ${photo.label.toLowerCase()}`}
        onClick={() => open(active)}
      >
        <Photo
          name={photo.name}
          alt={photo.alt}
          priority={active === 0}
          sizes="(max-width: 780px) 94vw, 48vw"
        />
      </button>

      {images.length > 1 && (
        <div className="product-gallery" role="group" aria-label="Product views">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image.name}-${index}`}
              className="product-thumb-pill"
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <span className="product-thumb-pill__img">
                <Photo name={image.name} alt="" sizes="40px" />
              </span>
              <span>{image.label}</span>
            </button>
          ))}
        </div>
      )}

      <dialog
        className="product-lightbox"
        ref={lightbox}
        aria-label="Product image viewer"
        onClick={(event) => {
          if (event.target === event.currentTarget) lightbox.current?.close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") moveEnlarged(-1);
          if (event.key === "ArrowRight") moveEnlarged(1);
        }}
      >
        <div className="lightbox-content">
          <div className="lightbox-header">
            <p aria-live="polite">
              {modalPhoto.label}
              <small>
                {frameNumber(enlarged)} / {frameNumber(images.length - 1)}
              </small>
            </p>
            <button
              type="button"
              onClick={() => lightbox.current?.close()}
              className="icon-button"
              aria-label="Close full-size image"
              autoFocus
            >
              <Icon name="close" />
            </button>
          </div>
          <Photo
            name={modalPhoto.name}
            alt={modalPhoto.alt}
            sizes="(max-width: 690px) 90vw, 610px"
          />
          {images.length > 1 && (
            <div className="lightbox-steps">
              <button
                type="button"
                className="icon-button"
                aria-label="Previous image"
                onClick={() => moveEnlarged(-1)}
              >
                <Icon name="left" />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next image"
                onClick={() => moveEnlarged(1)}
              >
                <Icon name="right" />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}

export function PurchaseBox({ product }: { product: StoreProduct }) {
  const { add } = useStore();
  const [qty, setQty] = useState(1);
  const [inlineVisible, setInlineVisible] = useState(true);
  const inlineButton = useRef<HTMLButtonElement>(null);
  const max = Math.min(product.stock, 99);
  const safeQty = Math.min(qty, Math.max(1, max));

  useEffect(() => {
    const button = inlineButton.current;
    if (!button || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.intersectionRatio >= 0.9),
      { threshold: 0.9 },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  function addToBag() {
    add(product, safeQty);
  }

  return (
    <>
      <div className="pdp-purchase-row">
        {product.stock > 0 && (
          <Quantity
            label={product.name}
            qty={safeQty}
            max={max}
            setQty={setQty}
          />
        )}
        <button
          type="button"
          ref={inlineButton}
          disabled={max < 1}
          className="btn btn--fern pdp-add-btn"
          onClick={addToBag}
        >
          <Icon name="bag" size={17} />
          <span>
            {max
              ? `Add to bag — ${money(product.price * safeQty)}`
              : "Unavailable in preview"}
          </span>
        </button>
      </div>
      {max > 0 && (
        <div className="sticky-purchase" hidden={inlineVisible}>
          <span>{money(product.price * safeQty)}</span>
          <button
            type="button"
            className="btn btn--fern"
            onClick={addToBag}
          >
            <Icon name="bag" size={16} />
            Add to bag — {money(product.price * safeQty)}
          </button>
        </div>
      )}
    </>
  );
}

export function StoryAddToBagButton({
  product,
  label,
}: {
  product: StoreProduct;
  label?: string;
}) {
  const { add } = useStore();
  const max = Math.min(product.stock, 99);
  return (
    <button
      type="button"
      disabled={max < 1}
      className="btn btn--fern"
      onClick={() => add(product, 1)}
    >
      <Icon name="bag" size={16} />
      <span>{max ? label || `Add to bag — ${money(product.price)}` : "Out of stock"}</span>
    </button>
  );
}
