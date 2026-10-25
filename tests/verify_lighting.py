from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    page.locator("#customize").click()

    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    assert sum(f["type"] == "neon" for f in state()["fish"]) == 8
    presets = []
    for value in ["morning", "day", "sunset", "night"]:
        page.locator("#time-of-day").select_option(value)
        current = state()["lighting"]
        assert current["timeOfDay"] == value
        presets.append((current["sun"], current["intensity"], tuple(current["position"])))
    assert len(set(presets)) == 4
    night = state()["lighting"]
    page.locator("#time-of-day").select_option("day")
    assert state()["lighting"]["neonEmission"] < night["neonEmission"]
    page.locator("#time-of-day").select_option("sunset")
    page.locator("#close-editor").click()
    page.screenshot(path="screenshots/aquarium-sunset.png")
    page.locator("#customize").click()
    page.locator("#time-of-day").select_option("night")
    page.locator("#neon-color").select_option("pink")
    pink = state()["lighting"]["neonColor"]
    page.locator("#neon-color").select_option("lime")
    assert state()["lighting"]["neonColor"] != pink
    page.locator("#neon-glow").fill("0")
    assert state()["lighting"]["neonEmission"] == 0
    assert state()["lighting"]["glowOpacity"] == 0
    page.locator("#neon-color").select_option("cyan")
    page.locator("#neon-glow").fill("1.4")
    before = state()["lighting"]
    page.locator("#close-editor").click()
    page.locator("#light").click()
    assert state()["lighting"] == before, "Interface theme must not change the light preset"
    page.screenshot(path="screenshots/aquarium-neon-night.png")
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#time-of-day")).to_have_value("night")
    expect(page.locator("#neon-glow")).to_have_value("1.4")
    page.locator("#count-neon").fill("0")
    expect(page.locator(".edition")).to_have_text("47 little lives. One tiny ecosystem.")
    assert not any(f["type"] == "neon" for f in state()["fish"])
    page.locator("#reset-reef").click()
    expect(page.locator("#time-of-day")).to_have_value("day")
    expect(page.locator("#neon-glow")).to_have_value("1")
    assert sum(f["type"] == "neon" for f in state()["fish"]) == 8
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="time-of-day"]')).to_have_text("Denní doba")
    expect(page.locator('#time-of-day option[value="sunset"]')).to_have_text("Západ slunce")
    expect(page.locator('label[for="neon-glow"]')).to_have_text("Záře neonek")
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#time-of-day").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    assert not errors, errors
    browser.close()
    print("PASS: four lighting presets, neon colors/glow/counts, theme independence, persistence, reset, Czech labels, mobile layout; no runtime errors")
