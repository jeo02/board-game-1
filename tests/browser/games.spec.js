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
async function canvasHasInk(page) {
  return page
    .locator("canvas")
    .evaluate((canvas) =>
      [
        ...canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data,
      ].some((value, index) => index % 4 !== 3 && value < 240),
    );
}
test("landing page, game filters, rules, invalid room and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Early Career Game Night");
  await expect(page.locator(".game-card")).toHaveCount(6);
  await expect(page.locator(".collection-count")).toContainText("06 games");
  await expect(
    page
      .locator(".game-card")
      .filter({ hasText: "Gartic Phone" })
      .getByRole("link", { name: "Play on Gartic Phone" }),
  ).toHaveAttribute("href", "https://garticphone.com/");
  await expect(
    page
      .locator(".game-card")
      .filter({ hasText: "skribbl.io" })
      .getByRole("link", { name: "Play on skribbl.io" }),
  ).toHaveAttribute("href", "https://skribbl.io/");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Party games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Drawing & guessing", exact: true })
    .click();
  await expect(page.locator(".game-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Arcade", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-card")).toContainText("Slither Showdown");
  await page.getByRole("button", { name: "Team games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-card")).toContainText("Name Droppers");
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(6);
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
  for (const [index, p] of players.entries()) {
    await draw(p);
    if (index === 0) await expect.poll(() => canvasHasInk(bob)).toBe(false);
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
  await expect.poll(() => canvasHasInk(guest)).toBe(true);
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
test("slither: pick colors, play live, join mid-round, and see the leaderboard", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await page
    .locator(".game-card")
    .filter({ hasText: "Slither Showdown" })
    .getByRole("button", { name: "Create a room" })
    .click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByRole("combobox", { name: "Round length" }).selectOption("1");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  const code = await page.locator(".room-code strong").innerText();
  await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
  await page.getByRole("radio", { name: "Sky", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Sky", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  const guest = await join(browser, code, "Jamie");
  await expect(
    guest.getByRole("radio", { name: "Sky, taken by Alex" }),
  ).toBeDisabled();
  await expect(
    guest.getByRole("radio", { name: "Grape", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await guest.getByRole("radio", { name: "Bubblegum", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Bubblegum, taken by Jamie" }),
  ).toBeDisabled();
  await page.screenshot({ path: "test-results/slither-lobby.png" });
  await page.getByRole("button", { name: "Start game" }).click();
  for (const p of [page, guest]) {
    await expect(p.getByRole("application")).toBeVisible();
    await expect(p.locator(".slither-stage")).toHaveAttribute(
      "data-state",
      "alive",
    );
    await expect(p.locator(".slither-overlay")).toBeHidden();
    await expect(p.getByLabel("Live leaderboard").locator("li")).toHaveCount(2);
  }
  await page.getByRole("application").press("ArrowRight");
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowLeft");
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const loop = () => {
          frames++;
          if (performance.now() - start < 1000) requestAnimationFrame(loop);
          else resolve(frames);
        };
        requestAnimationFrame(loop);
      }),
  );
  test
    .info()
    .annotations.push({ type: "render fps", description: String(fps) });
  expect(fps).toBeGreaterThan(20);
  const canvasHasArt = await page.getByRole("application").evaluate((c) => {
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4 * 97)
      colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return colors.size;
  });
  expect(canvasHasArt).toBeGreaterThan(5);
  await page.screenshot({ path: "test-results/slither-arena.png" });
  const late = await browser.newContext();
  const latePage = await late.newPage();
  await latePage.goto(
    new URL(`/?room=${code}`, test.info().project.use.baseURL).href,
  );
  await latePage.getByLabel("Your name").fill("Riley");
  await latePage
    .getByRole("button", { name: "Join room", exact: true })
    .click();
  await expect(latePage.getByRole("application")).toBeVisible();
  await expect(page.getByLabel("Live leaderboard").locator("li")).toHaveCount(
    3,
  );
  await latePage.setViewportSize({ width: 390, height: 844 });
  await expect(latePage.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await latePage.screenshot({ path: "test-results/slither-mobile.png" });
  await expect(
    guest.getByRole("button", { name: "End round now" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "End round now" }).click();
  await expect(page.getByLabel("Final leaderboard").locator("li")).toHaveCount(
    3,
  );
  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "takes the crown!",
  );
  await expect(guest.getByLabel("Final leaderboard")).toContainText("Riley");
  await page.screenshot({
    path: "test-results/slither-results.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to lobby" }).click();
  await expect(
    guest.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await guest.context().close();
  await late.close();
});
test("slither: after crashing, a countdown leads to a Respawn button", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page
    .locator(".game-card")
    .filter({ hasText: "Slither Showdown" })
    .getByRole("button", { name: "Create a room" })
    .click();
  await page.getByLabel("Your name").fill("Solo");
  await page.getByRole("combobox", { name: "Round length" }).selectOption("1");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await page.getByRole("button", { name: "Start game" }).click();
  const arena = page.getByRole("application");
  const stage = page.locator(".slither-stage");
  await expect(stage).toHaveAttribute("data-state", "alive");
  const box = await arena.boundingBox();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
  await expect(stage).toHaveAttribute("data-state", "dead", {
    timeout: 30_000,
  });
  const overlay = page.locator(".slither-overlay");
  await expect(overlay).toContainText("Bonk! You hit the wall.");
  await expect(
    overlay.getByLabel(/Respawn available in \d seconds/),
  ).toBeVisible();
  const respawn = page.getByRole("button", { name: "Respawn" });
  await expect(respawn).toBeHidden();
  await page.waitForTimeout(1500);
  await expect(stage).toHaveAttribute("data-state", "dead");
  await expect(respawn).toBeVisible({ timeout: 4000 });
  await expect(respawn).toBeFocused();
  await page.screenshot({ path: "test-results/slither-respawn.png" });
  await page.waitForTimeout(1000);
  await expect(stage).toHaveAttribute("data-state", "dead");
  await respawn.click();
  await expect(stage).toHaveAttribute("data-state", "alive");
  await expect(overlay).toBeHidden();
  await expect(stage).toHaveAttribute("data-length", "10");
});
test("name droppers: team lobby, secret draft, hidden cards, disputes and team results", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await page
    .locator(".game-card")
    .filter({ hasText: "Name Droppers" })
    .getByRole("button", { name: "Create a room" })
    .click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByRole("combobox", { name: "Deck size" }).selectOption("30");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pull up a chair." }),
  ).toBeVisible();
  const code = await page.locator(".room-code strong").innerText();
  const jamie = await join(browser, code, "Jamie");
  const sam = await join(browser, code, "Sam");
  const riley = await join(browser, code, "Riley");
  const players = [page, jamie, sam, riley];
  const sunrise = page.getByRole("region", { name: "Team Sunrise" });
  const midnight = page.getByRole("region", { name: "Team Midnight" });
  await expect(sunrise.locator("li")).toHaveText(["Alex (you)", "Sam"]);
  await expect(midnight.locator("li")).toHaveText(["Jamie", "Riley"]);
  await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
  await jamie.getByRole("button", { name: "Join Team Sunrise" }).click();
  await expect(sunrise.locator("li")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Start game" })).toBeDisabled();
  await expect(
    page.getByText("Every team needs at least 2 players"),
  ).toBeVisible();
  await jamie.getByRole("button", { name: "Join Team Midnight" }).click();
  await expect(midnight.locator("li")).toHaveCount(2);
  await page.screenshot({ path: "test-results/names-lobby.png" });
  await page.getByRole("button", { name: "Start game" }).click();

  for (const p of players) {
    await expect(
      p.getByRole("heading", { name: "Keep 8 names you like." }),
    ).toBeVisible();
    const cards = p.locator(".nd-pick");
    await expect(cards).toHaveCount(16);
    for (let i = 0; i < 8; i++) {
      await cards.nth(i).click();
      await expect(cards.nth(i)).toHaveAttribute("aria-pressed", "true");
    }
    if (p === page)
      await page.screenshot({ path: "test-results/names-draft.png" });
    await p.getByRole("button", { name: "Lock in my picks" }).click();
    // The last player to lock in ends the draft right away.
    if (p !== riley)
      await expect(
        p.getByRole("button", { name: "Change my picks" }),
      ).toBeVisible();
  }

  async function giverPage() {
    for (let i = 0; i < 40; i++) {
      for (const p of players)
        if (await p.getByRole("button", { name: "Start my turn" }).isVisible())
          return p;
      await page.waitForTimeout(250);
    }
    throw new Error("No one was offered the next turn");
  }
  const teamOf = async (p) =>
    (await p.locator(".nd-team").first().innerText()).includes("(you)") ? 0 : 1;
  const giver = await giverPage();
  const giverTeam = await teamOf(giver);
  const teammate = (
    await Promise.all(players.map(async (p) => [p, await teamOf(p)]))
  ).find(([p, t]) => p !== giver && t === giverTeam)[0];
  const opponent = players.find((p) => p !== giver && p !== teammate);
  await giver.getByRole("button", { name: "Start my turn" }).click();
  const card = giver.locator(".nd-card h3");
  await expect(card).toBeVisible();
  const name = await card.innerText();
  await expect(opponent.locator(".nd-card h3")).toHaveText(name);
  await expect(teammate.getByText("Shout your guesses!")).toBeVisible();
  await expect(teammate.locator(".nd-card")).toHaveCount(0);
  await giver.screenshot({ path: "test-results/names-giver.png" });
  await opponent.screenshot({ path: "test-results/names-watcher.png" });
  await giver.getByRole("button", { name: "Skip" }).click();
  await expect(card).not.toHaveText(name);
  // Clear the whole deck in one turn.
  for (let i = 0; i < 40; i++) {
    const got = giver.getByRole("button", { name: "Got it!" });
    if (!(await got.isVisible())) break;
    await got.click();
    await expect(got)
      .toBeEnabled({ timeout: 5000 })
      .catch(() => {});
  }
  await expect(
    opponent.getByRole("heading", { name: "Any disagreements?" }),
  ).toBeVisible();
  await opponent.getByRole("button", { name: "Doesn’t count" }).first().click();
  await expect(giver.getByRole("button", { name: "Count it" })).toBeVisible();
  await expect(giver.getByText("1 card left this round.")).toBeVisible();
  await expect(
    page.getByLabel("Live leaderboard").locator("li").first(),
  ).toContainText(giverTeam === 0 ? "Team Sunrise" : "Team Midnight");
  await expect(
    page.getByLabel("Live leaderboard").locator("li").first().locator(".score"),
  ).not.toHaveText(/^0/);
  await giver.screenshot({ path: "test-results/names-review.png" });
  await giver.getByRole("button", { name: "Looks good, next turn" }).click();

  // The disputed card is back, and the other team clears it.
  const second = await giverPage();
  expect(await teamOf(second)).not.toBe(giverTeam);
  await expect(second.locator(".nd-chip")).toHaveText("1/32 cards left");
  await second.getByRole("button", { name: "Start my turn" }).click();
  await second.getByRole("button", { name: "Got it!" }).click();
  await second.getByRole("button", { name: "Looks good, next turn" }).click();
  await expect(
    page.getByRole("heading", { name: "The deck is empty. Reshuffle!" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/names-break.png" });
  await page.getByRole("button", { name: "Start round 2" }).click();
  await expect(page.locator(".nd-round strong")).toHaveText("One word");
  await expect(page.getByLabel("Live leaderboard").locator("li")).toHaveCount(
    2,
  );

  await page.getByRole("button", { name: "End round now" }).click();
  for (const p of players)
    await expect(p.getByLabel("Final leaderboard").locator("li")).toHaveCount(
      2,
    );
  await expect(
    page.getByLabel("Final leaderboard").locator("li").first(),
  ).toContainText(/R1 \d+ · R2 0/);
  await expect(page.locator(".results-heading h2")).toHaveText(
    /Team (Sunrise|Midnight) takes the crown!/,
  );
  await page.screenshot({
    path: "test-results/names-results.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
