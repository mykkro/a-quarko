from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    errors, failed, loaded = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("response", lambda response: loaded.append(response.url) if "/assets/textures/" in response.url and response.ok else None)
    page.on("requestfailed", lambda request: failed.append(request.url) if "/assets/textures/" in request.url else None)
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    expect(page.locator("#customize")).to_be_visible(timeout=60000)
    materials = page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()")
    assert set(materials) == {"sand", "stone", "moss", "leaf", "fish", "limestone", "brick", "slate", "terracotta"}
    for name, material in materials.items():
        assert material["loaded"], name
        assert material["width"] >= 1024 and material["height"] >= 1024
        assert material["colorSpace"] == "srgb"
        assert material["dataColorSpace"] == ""
        assert material["hasHeight"] and material["hasRoughness"]
    assert len(loaded) == 9 and not failed, (loaded, failed)
    print("Nine generated color maps and eighteen linear detail maps loaded", flush=True)
    page.screenshot(path="screenshots/aquarium-textures-light.png")
    page.locator("#customize").click()
    page.locator("#count-river").fill("0")
    page.wait_for_timeout(200)
    page.locator("#count-river").fill("4")
    page.locator("#terrain-type").select_option("hills")
    page.wait_for_timeout(300)
    page.locator("#close-editor").click()
    page.locator("#light").click()
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    page.screenshot(path="screenshots/aquarium-textures-dark.png")
    page.locator("#light").click()
    page.mouse.move(900, 530)
    page.mouse.wheel(0, -600)
    page.wait_for_timeout(300)
    page.screenshot(path="screenshots/aquarium-textures-detail.png")
    assert len(loaded) == 9, "Rebuilds should reuse the loaded textures"
    assert not errors, errors
    browser.close()
    print("PASS: texture assets, bump/roughness maps, scene rebuilds, both themes and close-up rendering; no runtime errors")
