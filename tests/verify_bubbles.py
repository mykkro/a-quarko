from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width":1440,"height":960}, locale="en-US")
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(content_type="text/css", body=""))
    errors=[]
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type=="error" and "THREE.WebGLProgram" in message.text else None)
    page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
    page.locator("#customize").click()
    def state():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")
    page.locator("#bubble-mode").select_option("fine")
    page.locator("#bubble-interval").fill("35")
    page.locator("#release-bubbles").click()
    assert state()["bubbles"]["fine"]>100 and state()["bubbles"]["large"]==0
    page.locator("#close-editor").click()
    page.wait_for_timeout(3000)
    page.locator("#pause").click()
    frozen=state()["bubbles"]
    page.wait_for_timeout(250)
    assert state()["bubbles"]==frozen
    page.screenshot(path="screenshots/aquarium-fine-bubble-burst.png")
    page.locator("#customize").click()
    page.locator("#bubble-mode").select_option("large")
    page.locator("#release-bubbles").click()
    assert state()["bubbles"]["large"]>=9 and state()["bubbles"]["fine"]==0
    page.locator("#bubble-strength").fill("1.5")
    page.locator("#bubble-mode").select_option("off")
    assert state()["bubbles"]["active"]==0
    expect(page.locator("#release-bubbles")).to_be_disabled()
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    expect(page.locator("#bubble-mode")).to_have_value("off")
    expect(page.locator("#bubble-strength")).to_have_value("1.5")
    expect(page.locator("#bubble-interval")).to_have_value("35")
    page.locator("#visual-style").select_option("planted")
    page.locator("#bubble-mode").select_option("large")
    page.locator("#release-bubbles").click()
    assert state()["bubbles"]["large"]>=9
    page.locator("#reset-reef").click()
    expect(page.locator("#bubble-mode")).to_have_value("mixed")
    expect(page.locator("#bubble-interval")).to_have_value("14")
    page.locator("#close-editor").click()
    page.locator("#language").select_option("cs")
    page.locator("#customize").click()
    expect(page.locator('label[for="bubble-mode"]')).to_have_text("Dávky bublinek")
    expect(page.locator("#release-bubbles")).to_have_text("Vypustit bublinky")
    page.set_viewport_size({"width":390,"height":844})
    page.locator("#bubble-mode").scroll_into_view_if_needed()
    assert page.locator("#reef-editor").evaluate("el => el.scrollWidth<=el.clientWidth")
    assert not errors,errors
    browser.close()
    print("PASS: bubble shaders, fine/large/off, pause, persistence, reset, both styles, Czech and mobile controls")
