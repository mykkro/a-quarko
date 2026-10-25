from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    page.locator("#customize").click()

    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    initial = state()
    assert not initial["ribbons"]["textured"]
    page.locator("#plant-surface").select_option("textured")
    textured = state()
    assert textured["ribbons"]["textured"]
    assert all(textured["plantSurfaces"]["standard"])
    assert textured["plantSurfaces"]["rotala"] and textured["plantSurfaces"]["lotus"]
    assert textured["plants"] == initial["plants"]
    leaf = page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot().leaf")
    assert leaf["loaded"] and leaf["width"] >= 1024 and leaf["hasHeight"] and leaf["hasRoughness"]
    page.locator("#plant-surface").select_option("smooth")
    assert not state()["ribbons"]["textured"]
    assert not any(state()["plantSurfaces"]["standard"])
    page.locator("#plant-surface").select_option("textured")
    assert sum(c["type"] == "kelp" for c in initial["ribbons"]["clumps"]) == 5
    assert sum(c["type"] == "grass" for c in initial["ribbons"]["clumps"]) == 35
    assert initial["ribbons"]["doubleSided"]
    assert all(c["vertices"] > 500 for c in initial["ribbons"]["clumps"])
    page.locator("#count-kelp").fill("0")
    page.wait_for_timeout(250)
    assert not any(c["type"] == "kelp" for c in state()["ribbons"]["clumps"])
    page.locator("#count-kelp").fill("8")
    page.locator("#terrain-type").select_option("hills")
    page.wait_for_timeout(300)
    assert sum(c["type"] == "kelp" for c in state()["ribbons"]["clumps"]) == 8
    page.locator("#close-editor").click()
    before = state()["ribbons"]["time"]
    page.wait_for_timeout(300)
    assert state()["ribbons"]["time"] > before
    page.locator("#pause").click()
    before = state()["ribbons"]["time"]
    page.wait_for_timeout(300)
    assert state()["ribbons"]["time"] == before
    page.locator("#pause").click()
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#count-kelp")).to_have_value("8")
    expect(page.locator("#plant-surface")).to_have_value("textured")
    page.locator("#reset-reef").click()
    expect(page.locator("#count-kelp")).to_have_value("5")
    expect(page.locator("#plant-surface")).to_have_value("auto")
    page.locator("#visual-style").select_option("planted")
    assert state()["ribbons"]["textured"]
    assert state()["water"]["specks"] > 0
    page.locator("#close-editor").click()
    page.screenshot(path="screenshots/aquarium-textured-natural-plants.png")
    page.locator("#customize").click()
    page.locator("#visual-style").select_option("miniature")
    assert not state()["ribbons"]["textured"]
    page.locator("#plant-surface").select_option("textured")
    page.locator("#close-editor").click()
    page.mouse.move(900, 530)
    page.mouse.wheel(0, -450)
    page.screenshot(path="screenshots/aquarium-textured-leaves-detail.png")
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="plant-surface"]')).to_have_text("Povrch rostlin")
    expect(page.locator('label[for="count-kelp"]')).to_have_text("Páskovité chaluhy")
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#count-kelp").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    assert not errors, errors
    browser.close()
    print("PASS: textured/smooth leaves, all plant materials, both styles, kelp counts, shader rendering, animation/pause, persistence, reset, Czech and mobile controls")
