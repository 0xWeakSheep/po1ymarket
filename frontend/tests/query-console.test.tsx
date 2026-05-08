import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import HomePage from "@/app/page";
import { QueryConsole } from "@/components/dashboard/QueryConsole";

describe("QueryConsole", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:3001");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recommended_sources: [{ url: "https://docs.example.com/resolution", score: 0.84 }],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders both query modes", () => {
    render(<QueryConsole />);

    expect(screen.getByText(/use market id/i)).toBeInTheDocument();
    expect(screen.getByText(/use custom market/i)).toBeInTheDocument();
  });

  it("runs the example custom market interaction and shows ranked output from the API", async () => {
    const user = userEvent.setup();

    render(<QueryConsole />);

    await user.click(screen.getByRole("button", { name: /example custom market/i }));
    await user.click(screen.getByRole("button", { name: /find sources/i }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "http://127.0.0.1:3001/api/v1/recommendations",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("0.84")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "docs.example.com" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "docs.example.com" })).toHaveAttribute(
        "href",
        "https://docs.example.com/resolution",
      );
    });
  });

  it("loads a preset example into the market id field", async () => {
    const user = userEvent.setup();

    render(<QueryConsole />);

    await user.click(screen.getByRole("button", { name: /example market id/i }));

    expect(screen.getByLabelText(/market id/i)).toHaveValue("540816");
  });

  it("disables submit when the API base URL is not configured", () => {
    vi.unstubAllEnvs();

    render(<QueryConsole />);

    expect(screen.getByRole("button", { name: /find sources/i })).toBeDisabled();
    expect(screen.getByText(/NEXT_PUBLIC_API_BASE_URL/i)).toBeInTheDocument();
  });
});

describe("HomePage", () => {
  it("renders hero, workbench link to dashboard, and FAQ", () => {
    render(<HomePage />);

    const main = screen.getByRole("main");
    expect(within(main).getByRole("navigation")).toBeInTheDocument();

    expect(
      within(main).getByRole("heading", {
        level: 1,
        name: /find signal before the market moves/i,
      }),
    ).toBeInTheDocument();

    expect(within(main).getByRole("heading", { name: /faq/i })).toBeInTheDocument();

    const workbench = within(main).getByRole("link", { name: /^workbench$/i });
    expect(workbench).toHaveAttribute("href", "/dashboard");

    expect(document.getElementById("intro")).not.toBeNull();
    expect(document.getElementById("faq")).not.toBeNull();
  });
});

describe("DashboardPage", () => {
  it("renders workbench overview, console, and API reference", () => {
    render(<DashboardPage />);

    const main = screen.getByRole("main");
    expect(within(main).getByRole("navigation")).toBeInTheDocument();

    expect(
      within(main).getByRole("heading", {
        name: /^how it works$/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole("heading", {
        name: /api reference/i,
      }),
    ).toBeInTheDocument();

    expect(document.getElementById("intro")).not.toBeNull();
    expect(document.getElementById("console")).not.toBeNull();
    expect(document.getElementById("api")).not.toBeNull();
  });
});
