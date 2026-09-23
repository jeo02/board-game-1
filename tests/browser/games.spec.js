import { test, expect } from "@playwright/test";

async function create(page, game, name = "Alex") {
  await page.goto("/");
  await page
    .locator(".game-card")
    .filter({ hasText: game })
    .getByRole("button", { name: "Create a room" })
    .click();
  await page.getByLabel("Your name").fill(name);
  if (game === "Scribble Club") {
    await page
      .getByRole("combobox", { name: "Rounds", exact: true })
      .selectOption("1");
    await page
      .getByRole("combobox", { name: "Drawing time" })
      .selectOption("30");
  }
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  return await page.locator(".room-code strong").innerText();
}
async function join(browser, code, name) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    new URL(`/?room=${code}`, test.info().project.use.baseURL).href,
  );
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  return page;
}
async function draw(page) {
  const canvas = page.getByRole("img", { name: "Drawing canvas", exact: true });
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 70, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 140, { steps: 10 });
  await page.mouse.up();
}
test("landing page, game filters, rules, invalid room and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Early Career Game Night");
  await expect(page.locator(".game-card")).toHaveCount(3);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Party games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(3);
  await page.getByRole("button", { name: "How to play" }).first().click();
  await expect(page.locator("dialog")).toContainText("Gather 3–8 players");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Join a room", exact: true }).click();
  await page.getByLabel("Your name").fill("Nobody");
  await page.getByLabel("Room code").fill("ZZZZZZ");
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Room not found");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("three people complete a telephone game, see correct chains, and replay", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const code = await create(page, "Cosmic Telephone");
  await expect(page.getByRole("button", { name: "Start game" })).toBeDisabled();
  const bob = await join(browser, code, "Bob");
  const cam = await join(browser, code, "Cam");
  await cam.setViewportSize({ width: 390, height: 844 });
  await expect(cam.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const players = [page, bob, cam];
  await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
  await page.getByRole("button", { name: "Start game" }).click();
  for (const [i, p] of players.entries()) {
    await p.getByLabel("Your opening sentence").fill(`A space cat number ${i}`);
    await p.getByRole("button", { name: "Pass it on" }).click();
  }
  await expect(bob.locator("blockquote")).toHaveText("A space cat number 0");
  for (const p of players) {
    await draw(p);
    await p.getByRole("button", { name: "Pass it on" }).click();
  }
  for (const [i, p] of players.entries()) {
    await p.getByLabel("Your best guess").fill(`A cosmic kitten number ${i}`);
    await p.getByRole("button", { name: "Pass it on" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Well, that took a turn." }),
  ).toBeVisible();
  await expect(page.locator(".chain-entry")).toHaveCount(3);
  await expect(page.locator(".chain-entry").first()).toContainText(
    "A space cat number 0",
  );
  await expect(page.locator(".chain-entry").last()).toContainText(
    "A cosmic kitten number 2",
  );
  await page.screenshot({
    path: "test-results/telephone-results.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Bob’s story" }).click();
  await expect(page.locator(".chain-entry").first()).toContainText(
    "A space cat number 1",
  );
  await page.getByRole("button", { name: "One more game" }).click();
  await expect(page.getByLabel("Your opening sentence")).toBeVisible();
  await cam.getByRole("button", { name: "Leave", exact: true }).click();
  await cam.getByRole("button", { name: "Leave room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  await expect(page.locator(".notice")).toContainText("A player left");
  expect(errors).toEqual([]);
  await bob.context().close();
  await cam.context().close();
});
test("scribble synchronizes drawing, hides words, scores guesses, and finishes", async ({
  page,
  browser,
}) => {
  const code = await create(page, "Scribble Club");
  const guest = await join(browser, code, "Jamie");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(
    page.getByRole("heading", { name: "Pick your next masterpiece." }),
  ).toBeVisible();
  const word = await page.locator(".word-choices button").first().innerText();
  await page.locator(".word-choices button").first().click();
  await expect(guest.locator(".secret-word")).not.toHaveText(word);
  await draw(page);
  const canvas = guest.locator("canvas");
  await expect
    .poll(() =>
      canvas.evaluate((c) =>
        [...c.getContext("2d").getImageData(0, 0, c.width, c.height).data].some(
          (n, i) => i % 4 !== 3 && n < 240,
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Undo last stroke" }).click();
  await expect
    .poll(() =>
      canvas.evaluate((c) =>
        [
          ...c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
        ].every((n) => n === 255),
      ),
    )
    .toBe(true);
  await draw(page);
  await guest
    .getByLabel("Your guess", { exact: true })
    .fill("a terrible guess");
  await guest.getByRole("button", { name: "Send guess" }).click();
  await expect(page.locator(".messages")).toContainText("a terrible guess");
  await guest.getByLabel("Your guess", { exact: true }).fill(word);
  await guest.getByRole("button", { name: "Send guess" }).click();
  await expect(
    page.getByRole("heading", { name: "The word was…" }),
  ).toBeVisible();
  await expect(guest.locator(".secret-word")).toHaveText(word);
  await expect(guest.locator(".messages")).toContainText("guessed the word!");
  await page.screenshot({
    path: "test-results/scribble-round.png",
    fullPage: true,
  });
  await expect(guest.locator(".word-choices")).toBeVisible({ timeout: 10000 });
  const nextWord = await guest
    .locator(".word-choices button")
    .first()
    .innerText();
  await guest.locator(".word-choices button").first().click();
  await draw(guest);
  await page.getByLabel("Your guess", { exact: true }).fill(nextWord);
  await page.getByRole("button", { name: "Send guess" }).click();
  await expect(page.locator(".final-scores")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".final-scores li")).toHaveCount(2);
  await page.getByRole("button", { name: "Back to lobby" }).click();
  await expect(
    guest.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  await guest.context().close();
});
test("snake lobby color, live arena and leaderboard work for two players", async ({
  page,
  browser,
}) => {
  const code = await create(page, "Snake Sprint");
  const guest = await join(browser, code, "Jamie");
  await page.getByRole("button", { name: "Snake color #62b9ad" }).click();
  await expect(
    page.getByRole("button", { name: "Snake color #62b9ad" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.getByRole("img", { name: "Snake arena" })).toBeVisible();
  await expect(guest.getByRole("img", { name: "Snake arena" })).toBeVisible();
  await expect(page.getByLabel("Live leaderboard")).toContainText("Jamie");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("timer")).toContainText("s");
  const crash = page.getByRole("dialog", { name: "Snake crashed" });
  await expect(crash).toBeVisible({ timeout: 15000 });
  await expect(crash).toContainText("Your points are safe");
  await crash.getByRole("button", { name: "Respawn", exact: true }).click();
  await expect(crash).not.toBeVisible();
  await guest.context().close();
});
