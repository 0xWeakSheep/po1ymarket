import "@testing-library/jest-dom/vitest";

/** `LandingNav` 等组件使用 IntersectionObserver；jsdom 未实现。 */
class IntersectionObserverMock {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
}
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

/** GSAP ScrollTrigger / motion libs expect `matchMedia` in jsdom. */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
