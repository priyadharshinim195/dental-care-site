import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Hero from "../site/Hero";
import { DEFAULT_CONTENT, DEFAULT_SETTINGS, FALLBACK_HERO } from "../site/defaults";

const settings = { ...DEFAULT_SETTINGS };

describe("hero slideshow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders all six images and starts on the first", () => {
    const { container } = render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT} settings={settings} scrolled={false} />);
    const slides = container.querySelectorAll(".hero-slide");
    expect(slides).toHaveLength(6);
    expect(container.querySelector(".hero-slides")).toHaveStyle({ "--hero-fade": "400ms" });
    expect(slides[0]).toHaveAttribute("loading", "eager");
    expect(slides[0]).toHaveAttribute("fetchpriority", "high");
    expect(Array.from(slides).slice(1).every((slide) => slide.getAttribute("loading") === "lazy")).toBe(true);
    expect(Array.from(slides).slice(1).every((slide) => slide.getAttribute("fetchpriority") === "low")).toBe(true);
    expect(slides[0]).toHaveClass("is-active");
    expect(slides[1]).not.toHaveClass("is-active");
  });

  it("advances every interval and loops back to the first image after the last", () => {
    const { container } = render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT} settings={settings} scrolled={false} />);
    const activeIndex = () => Array.from(container.querySelectorAll(".hero-slide")).findIndex((el) => el.classList.contains("is-active"));
    expect(activeIndex()).toBe(0);
    for (let step = 1; step <= 6; step += 1) {
      act(() => vi.advanceTimersByTime(2000));
      expect(activeIndex()).toBe(step % 6);
    }
  });

  it("uses the configured interval", () => {
    const { container } = render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT}
      settings={{ ...settings, hero_interval_ms: 4000 }} scrolled={false} />);
    act(() => vi.advanceTimersByTime(3900));
    expect(container.querySelector(".hero-slide.is-active")).toHaveAttribute("src", FALLBACK_HERO[0].url);
    act(() => vi.advanceTimersByTime(200));
    expect(container.querySelectorAll(".hero-slide")[1]).toHaveClass("is-active");
  });

  it("keeps the original hero copy", () => {
    render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT} settings={settings} scrolled={false} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AJITHA");
    expect(screen.getByText(DEFAULT_CONTENT["hero.text"])).toBeInTheDocument();
  });

  it("keeps the hero slideshow free of branding overlays", () => {
    const { container } = render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT}
      settings={settings} scrolled={false} />);
    expect(container.querySelector(".hero-brand-logo")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".hero-slide")).toHaveLength(6);
  });

  it("keeps the slideshow changing while the hero title remains", () => {
    const { container } = render(<Hero slides={FALLBACK_HERO} content={DEFAULT_CONTENT}
      settings={settings} scrolled={false} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector(".hero-slide.is-active")).toHaveAttribute("src", FALLBACK_HERO[1].url);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AJITHA");
  });

  it("shows a single image without starting a timer", () => {
    const { container } = render(<Hero slides={[FALLBACK_HERO[0]]} content={DEFAULT_CONTENT} settings={settings} scrolled={false} />);
    act(() => vi.advanceTimersByTime(10000));
    expect(container.querySelectorAll(".hero-slide.is-active")).toHaveLength(1);
  });
});
