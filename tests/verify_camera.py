from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 1440, "height": 960}, locale="en-US")
    page = context.new_page()
    page.set_default_timeout(90000)
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
    page.locator("#reset-view").wait_for()

    def camera():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot().camera")

    initial = camera()
    page.mouse.move(750, 500)
    page.mouse.down()
    page.mouse.move(830, 525, steps=5)
    page.mouse.up()
    assert camera()["az"] != initial["az"]
    before = camera()
    page.mouse.move(750, 500)
    page.mouse.down(button="right")
    page.mouse.move(830, 550, steps=5)
    page.mouse.up(button="right")
    assert camera()["target"] != before["target"] and camera()["az"] == before["az"]
    page.keyboard.down("Shift")
    page.mouse.down()
    page.mouse.move(900, 570, steps=4)
    page.mouse.up()
    page.keyboard.up("Shift")
    assert camera()["target"] != before["target"]
    for _ in range(4):
        page.mouse.wheel(0, -1800)
    page.wait_for_timeout(150)
    assert camera()["distance"] <= 1
    page.locator("#reset-view").click()
    assert camera()["distance"] == 28 and camera()["target"] == [0, 1.5, 0]
    page.locator("#customize").click()
    page.locator("#visual-style").select_option("planted")
    page.locator("#close-editor").click()
    page.mouse.move(750, 500)
    for _ in range(4):
        page.mouse.wheel(0, -1800)
    page.wait_for_timeout(150)
    assert camera()["distance"] <= 1
    page.locator("#reset-view").click()
    assert camera()["distance"] == 30 and camera()["target"] == [0, 3.3, 0]
    page.locator("#aquarium").focus()
    page.keyboard.press("+")
    assert camera()["distance"] < 30
    page.keyboard.press("Home")
    assert camera()["distance"] == 30
    assert not errors, errors
    context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="en-US")
    page = context.new_page()
    page.set_default_timeout(90000)
    page.route("https://fonts.googleapis.com/**", lambda route: route.fulfill(status=200, content_type="text/css", body=""))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://127.0.0.1:5173", wait_until="domcontentloaded")
    page.locator("#reset-view").wait_for()
    cdp = context.new_cdp_session(page)

    def touch(kind, points):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": i} for i, x, y in points]})
        page.wait_for_timeout(75)

    original = camera()
    touch("touchStart", [(1, 160, 420)])
    touch("touchMove", [(1, 190, 435)])
    touch("touchEnd", [])
    assert camera()["az"] != original["az"]
    page.locator("#reset-view").tap()
    touch("touchStart", [(1, 150, 420), (2, 230, 420)])
    touch("touchMove", [(1, 80, 420), (2, 300, 420)])
    zoomed = camera()
    assert zoomed["distance"] < 15 and abs(zoomed["az"] - .38) < .00001
    touch("touchMove", [(1, 100, 450), (2, 320, 450)])
    panned = camera()
    assert panned["target"] != zoomed["target"]
    touch("touchEnd", [(2, 320, 450)])
    touch("touchMove", [(1, 120, 460)])
    touch("touchEnd", [])
    assert camera()["activePointers"] == 0 and camera()["az"] != zoomed["az"]
    touch("touchStart", [(1, 150, 400)])
    touch("touchCancel", [])
    assert camera()["activePointers"] == 0
    page.locator("#reset-view").tap()
    assert camera()["distance"] == 28 and camera()["target"] == [0, 1.5, 0]
    page.locator("#language").select_option("cs")
    expect(page.locator("#reset-view")).to_have_attribute("aria-label", "Obnovit pohled")
    assert page.locator(".controls").evaluate("el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth")
    assert page.evaluate("visualViewport.scale") == 1
    assert not errors, errors
    context.close()
    browser.close()
    print("PASS: desktop orbit/pan/close zoom, both styles, reset/keyboard, real mobile touch pinch/pan/orbit, finger transitions, cancellation, Czech labels and mobile toolbar")
