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
    assert initial["water"]["specks"] > 0
    assert initial["presentation"] == {"style": "miniature", "tankVisible": False, "baseVisible": True}
    page.locator("#water-atmosphere").fill("0")
    page.locator("#water-specks").fill("0")
    assert state()["water"]["amount"] == 0 and state()["water"]["specks"] == 0
    page.locator("#water-atmosphere").fill("0.8")
    page.locator("#water-specks").fill("0.7")
    page.locator("#close-editor").click()
    page.screenshot(path="screenshots/aquarium-underwater-miniature.png")
    page.locator("#customize").click()
    page.locator("#visual-style").select_option("planted")
    planted = state()
    assert planted["presentation"] == {"style": "planted", "tankVisible": True, "baseVisible": False}
    assert len(planted["fish"]) == len(initial["fish"])
    assert planted["plants"] == initial["plants"]
    assert len(planted["crawlers"]) == len(initial["crawlers"])
    page.locator("#close-editor").click()
    page.locator("#light").click()
    page.screenshot(path="screenshots/aquarium-natural-tank.png")
    before = state()["water"]
    page.wait_for_timeout(500)
    assert state()["water"]["firstParticle"] != before["firstParticle"]
    page.locator("#pause").click()
    frozen = state()["water"]
    page.wait_for_timeout(300)
    assert state()["water"] == frozen
    page.locator("#pause").click()
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#visual-style")).to_have_value("planted")
    expect(page.locator("#water-specks")).to_have_value("0.7")
    expect(page.locator("#water-atmosphere")).to_have_value("0.8")
    page.locator("#visual-style").select_option("miniature")
    assert state()["presentation"]["baseVisible"]
    assert not state()["presentation"]["tankVisible"]
    page.locator("#reset-reef").click()
    expect(page.locator("#water-atmosphere")).to_have_value("0.65")
    expect(page.locator("#water-specks")).to_have_value("0.55")
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="visual-style"]')).to_have_text("Vizuální styl")
    expect(page.locator('#visual-style option[value="planted"]')).to_have_text("Přírodní osázené akvárium")
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth <= el.clientWidth")
    assert not errors, errors
    browser.close()
    print("PASS: underwater shaders and particles, both presentation styles, unchanged populations, pause, persistence, reset, Czech and mobile controls")
