import { test, expect } from "@playwright/test";

async function create(page, opponent = "friend", difficulty = "medium") {
  await page.goto("/");
  await page
    .locator(".game-card")
    .filter({ has: page.getByRole("heading", { name: "Chess", exact: true }) })
    .getByRole("button", { name: "Create a room" })
    .click();
  await page.getByLabel("Your name").fill("Ana");
  const difficultySelect = page.getByRole("combobox", {
    name: "Bot difficulty",
  });
  await expect(difficultySelect).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Opponent", exact: true })
    .selectOption(opponent);
  if (opponent === "bot") await difficultySelect.selectOption(difficulty);
  else await expect(difficultySelect).toHaveCount(0);
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  return page.locator(".room-code strong").innerText();
}
async function move(page, from, to) {
  await page.locator(`.chess-square[data-square="${from}"]`).click();
  await expect(page.locator(`.chess-square[data-square="${to}"]`)).toHaveClass(
    /legal/,
  );
  await page.locator(`.chess-square[data-square="${to}"]`).click();
}

test("two-player chess swaps sides, synchronizes moves, reconnects and finishes by checkmate", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const code = await create(page);
  await expect(page.getByRole("button", { name: "Start game" })).toBeDisabled();
  const context = await browser.newContext();
  const guest = await context.newPage();
  try {
    await guest.goto(`/?room=${code}`);
    await guest.getByLabel("Your name").fill("Ben");
    await guest.getByRole("button", { name: "Join room", exact: true }).click();
    await expect(
      guest.getByRole("radio", { name: "Black - Ben" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Black - Ben" }).click();
    await expect(
      guest.getByRole("radio", { name: "White - Ben" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Start game" }).click();
    await expect(page.locator(".chess-square")).toHaveCount(64);
    await expect(page.locator(".chess-square").first()).toHaveAttribute(
      "data-square",
      "h1",
    );
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 900);
    const square = page.locator('.chess-square[data-square="e7"]');
    const pieceSize = await square.locator(".chess-piece").boundingBox();
    const squareSize = await square.boundingBox();
    expect(pieceSize.height).toBeLessThanOrEqual(squareSize.height);
    await move(guest, "f2", "f3");
    await expect(page.locator(".chess-moves")).toContainText("f3");
    await page.reload();
    await expect(page.locator(".chess-status")).toContainText("Black to move");
    await move(page, "e7", "e5");
    await move(guest, "g2", "g4");
    await move(page, "d8", "h4");
    await expect(
      page.getByRole("heading", { name: "Ana wins by checkmate." }),
    ).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Ana wins by checkmate." }),
    ).toBeVisible();
    await expect(page.locator(".chess-board")).toBeVisible();
    await expect(page.locator(".chess-moves")).toContainText("Qh4#");
    await expect(
      page.getByRole("button", { name: "Resign", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "One more game" }).click();
    await expect(page.locator(".chess-status")).toContainText("White to move");
    await guest.getByRole("button", { name: "Offer draw" }).click();
    await page.getByRole("button", { name: "Accept draw" }).click();
    await expect(
      page.getByRole("heading", { name: "Draw by agreement." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back to lobby" }).click();
    for (const player of [page, guest]) {
      await expect(
        player.getByRole("heading", { name: "Pull up a chair." }),
      ).toBeVisible();
      await expect(player.locator(".room-code strong")).toHaveText(code);
      await expect(player.locator(".chess-board")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Start game" }).click();
    await expect(page.locator(".chess-status")).toContainText("White to move");
    await expect(guest.locator(".chess-status")).toContainText("White to move");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("chess renderer offers all promotions and sends the selected piece reliably", async ({
  page,
}) => {
  await page.goto("/api/health");
  await page.evaluate(async () => {
    const { mount } = await import("/plugins/chess/client.js");
    const element = document.createElement("div");
    document.body.replaceChildren(element);
    const frame = {
      seq: 0,
      you: "w",
      turn: "w",
      check: false,
      history: [],
      lastMove: null,
      outcome: null,
      drawOffer: null,
      thinking: false,
      seats: { w: { id: "a", name: "Ana" }, b: { id: "b", name: "Ben" } },
      board: [
        { square: "a7", color: "w", type: "p" },
        { square: "h1", color: "w", type: "k" },
        { square: "h8", color: "b", type: "k" },
      ],
      legal: ["q", "r", "b", "n"].map((promotion) => ({
        from: "a7",
        to: "a8",
        promotion,
      })),
    };
    window.chessMoves = [];
    mount(element, {
      you: "a",
      getRoom: () => ({
        phase: "playing",
        players: [{ id: "a", side: "w" }],
        gameInfo: frame,
      }),
      onFrame: () => () => {},
      act: async (move) => {
        window.chessMoves.push(move);
        return true;
      },
    });
  });
  await move(page, "a7", "a8");
  await expect(page.locator(".chess-promotion")).toBeVisible();
  for (const name of ["queen", "rook", "bishop", "knight"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "knight", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.chessMoves))
    .toEqual([{ type: "move", from: "a7", to: "a8", promotion: "n" }]);
  await expect(page.locator(".chess-promotion")).toBeHidden();
});

test("lobby bot settings, playing Black, keyboard moves, mobile layout and resignation", async ({
  page,
}) => {
  await create(page, "bot", "easy");
  await page
    .getByRole("combobox", { name: "Opponent", exact: true })
    .selectOption("friend");
  await expect(page.getByRole("button", { name: "Start game" })).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Bot difficulty" }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Opponent", exact: true })
    .selectOption("bot");
  await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
  await page
    .getByRole("combobox", { name: "Bot difficulty" })
    .selectOption("hard");
  await expect(
    page.getByRole("combobox", { name: "Bot difficulty" }),
  ).toHaveValue("hard");
  await page
    .getByRole("combobox", { name: "Time control" })
    .selectOption("1+0");
  await expect(
    page.getByRole("combobox", { name: "Time control" }),
  ).toHaveValue("1+0");
  await page.getByRole("radio", { name: "Black - Bot" }).click();
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator(".chess-status")).toContainText("Black to move", {
    timeout: 15000,
  });
  const myClock = page.getByRole("timer", { name: "Black clock" });
  await expect(myClock).toHaveClass(/active/);
  await expect(page.getByRole("timer", { name: "White clock" })).toHaveText(
    /^(1:00|0:59)$/,
  );
  await expect(myClock).toHaveText(/^0:5\d$/, { timeout: 3000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const pawn = page.locator('.chess-square[data-square="e7"]');
  await pawn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('.chess-square[data-square="e5"]')).toHaveClass(
    /legal/,
  );
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('.chess-square[data-square="e5"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chess-moves")).toContainText("e5");
  await page.getByRole("button", { name: "Resign", exact: true }).click();
  await page.getByRole("button", { name: "Confirm resignation" }).click();
  await expect(
    page.getByRole("heading", { name: "hard bot wins by resignation." }),
  ).toBeVisible();
  await expect(page.locator(".final-scores .score")).toContainText("0");
  await page.getByRole("button", { name: "Back to lobby" }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Time control" }),
  ).toHaveValue("1+0");
  await expect(
    page.getByRole("combobox", { name: "Bot difficulty" }),
  ).toHaveValue("hard");
});

test("an expired room session is cleared so a new room can be created", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem("gameToken", "expired-room-session"),
  );
  await page.reload();
  await expect(
    page.getByText(
      "Your room is no longer available. Create or join a new room.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("gameToken")))
    .toBeNull();
  await create(page, "bot");
});
