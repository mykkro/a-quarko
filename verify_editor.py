from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    page.locator("#customize").click()
    page.locator("#reset-reef").click()
    assert page.locator('[id^="count-"]').count() == 26

    def snapshot():
        return page.evaluate("async () => (await import('./aquarium.js')).populationSnapshot()")

    initial = snapshot()
    assert len(initial["fish"]) == 50 and len(initial["crawlers"]) == 5
    assert {f["type"] for f in initial["fish"]} == {"sun", "lagoon", "moon", "neon", "angel", "betta", "puffer"}
    print("All seven fish varieties and both bottom dwellers created", flush=True)
    page.evaluate("""() => document.querySelectorAll('[id^="count-"]').forEach(el => {
      el.value = 0; el.dispatchEvent(new Event('input', {bubbles:true}));
    })""")
    expect(page.locator(".edition")).to_have_text("0 little lives. One tiny ecosystem.")
    empty = snapshot()
    assert not empty["fish"] and not empty["crawlers"] and empty["plants"] == 0 and empty["meshes"] == 0
    page.evaluate("""() => document.querySelectorAll('[id^="count-"]').forEach(el => {
      el.value = 2; el.dispatchEvent(new Event('input', {bubbles:true}));
    })""")
    expect(page.locator(".edition")).to_have_text("18 little lives. One tiny ecosystem.")
    assert snapshot()["plants"] == 14
    page.locator("#school-motion").select_option("wander")
    page.locator("#activity").fill("2")
    page.keyboard.press("Escape")
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    assert snapshot()["settings"]["schoolMotion"] == "wander"
    assert snapshot()["settings"]["activity"] == 2
    assert snapshot()["settings"]["snail"] == 2
    print("Zero counts, all varieties, and saved movement settings passed", flush=True)
    assert len(snapshot()["landmarks"]) == 4
    terrain_samples = []
    for terrain_type in ["flat", "dunes", "hills", "basin", "terraces"]:
        page.locator("#terrain-type").select_option(terrain_type)
        page.wait_for_timeout(200)
        state = snapshot()
        assert state["terrain"]["type"] == terrain_type
        assert state["terrain"]["vertices"] > 6000
        assert abs(state["terrain"]["samples"][-1]["y"] - .06) < .0001
        terrain_samples.append([s["y"] for s in state["terrain"]["samples"]])
    assert len({tuple(v) for v in terrain_samples}) == 5
    page.locator("#relief").fill("1.8")
    page.wait_for_timeout(200)
    page.keyboard.press("Escape")
    page.reload(wait_until="domcontentloaded")
    page.locator("#customize").click()
    assert abs(snapshot()["settings"]["relief"] - 1.8) < .00001, snapshot()["settings"]
    assert snapshot()["settings"]["terrainType"] == "terraces"
    print("Five terrain profiles, maximum relief, ornaments and persistence passed", flush=True)
    for mode in ["cruise", "wander", "dart"]:
        page.locator("#school-motion").select_option(mode)
        before = snapshot()
        page.wait_for_timeout(700)
        after = snapshot()
        assert all(a["position"] != b["position"] for a, b in zip(before["fish"], after["fish"]))
        assert all(a["position"] != b["position"] for a, b in zip(before["crawlers"], after["crawlers"]))
    page.locator("#reset-reef").click()
    expect(page.locator(".edition")).to_have_text("55 little lives. One tiny ecosystem.")
    page.locator("#close-editor").click()
    page.locator("#pause").click()
    before = snapshot()
    page.wait_for_timeout(300)
    assert before == snapshot()
    page.locator("#pause").click()
    page.locator("#feed").click()
    page.screenshot(path="screenshots/aquarium-terrain-preview.png")
    page.locator("#customize").click()
    page.locator("#school-motion").scroll_into_view_if_needed()
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.locator("#reef-editor").evaluate("el => el.getBoundingClientRect().width <= innerWidth")
    assert page.locator("#close-editor").evaluate("el => el.getBoundingClientRect().top >= 0")
    page.locator("#close-editor").click()
    page.locator("#light").click()
    assert not errors, errors
    print("PASS: 26 variety controls, populations, persistence, three school movements, individual movement, pause, feeding, reset, and mobile panel; no runtime errors", flush=True)
    browser.close()
