"use client";

import { useState } from "react";
import { editorial } from "@/lib/catalog";
import { Icon } from "./icon";
import { Photo } from "./image";

export function Campaign() {
  const [active, setActive] = useState(0);
  const slide = editorial[active];
  function move(delta: number) {
    setActive((index) => (index + delta + editorial.length) % editorial.length);
  }
  return (
    <div
      className="campaign"
      aria-roledescription="carousel"
      aria-label="The Eleganza campaign"
    >
      <Photo
        key={slide.image}
        className={"campaign-image campaign-" + slide.image}
        name={slide.image}
        alt={slide.alt}
        priority={active === 0}
        sizes="(max-width: 760px) 100vw, 58vw"
      />
      <div className="campaign-meta">
        <div className="campaign-caption" aria-live="polite">
          <span>
            0{active + 1} / 0{editorial.length}
          </span>
          <em>{slide.title}</em>
        </div>
        <div className="campaign-buttons">
          <button aria-label="Previous campaign image" onClick={() => move(-1)}>
            <Icon name="left" size={17} />
          </button>
          <button aria-label="Next campaign image" onClick={() => move(1)}>
            <Icon name="right" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
