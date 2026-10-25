from playwright.sync_api import sync_playwright, expect

# Packs download lazily, once a visible material uses them.
WAIT_TEXTURES = "async names => { const m = await import('./aquarium.js'); await Promise.race([m.whenTexturesLoaded(names), new Promise((_, fail) => setTimeout(() => fail(new Error('textures not loaded: ' + names)), 60000))]); }"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="en-US", color_scheme="light")
    errors, failed, loaded = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("response", lambda response: loaded.append(response.url) if "/assets/textures/" in response.url and response.url.endswith((".jpg", ".png")) and response.ok else None)
    page.on("requestfailed", lambda request: failed.append(request.url) if "/assets/textures/" in request.url else None)
    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    expect(page.locator("#customize")).to_be_visible(timeout=60000)
    # The default miniature shows these; the rest download only when used.
    default_packs = ["sand", "stone", "moss", "fish", "limestone", "slate", "shell", "shrimp", "plankton"]
    page.evaluate(WAIT_TEXTURES, default_packs)
    materials = page.evaluate("async () => (await import('./aquarium.js')).materialSnapshot()")
    assert set(materials) == {"sand", "stone", "moss", "leaf", "fish", "limestone", "brick", "slate", "terracotta", "shell", "shrimp", "plankton"}
    for name, material in materials.items():
        if name not in default_packs:
            assert not material["loaded"], name
            continue
        assert material["loaded"], name
        assert material["width"] >= 1024 and material["height"] >= 1024
        assert material["url"].endswith(".jpg")
        assert material["colorSpace"] == "srgb"
        assert material["dataColorSpace"] == ""
        assert material["hasHeight"] and material["hasRoughness"]
    # Stalled requests are retried, so compare distinct files rather than requests.
    assert {url.rsplit("/", 1)[-1] for url in loaded} == {name + "-albedo-v1.jpg" for name in default_packs}, (loaded, failed)
    requests_before_rebuilds = len(loaded)
    assert not any(name in url for url in loaded for name in ["leaf", "brick", "terracotta"])
    print(f"{len(default_packs)} JPEG color maps with linear detail maps loaded; unused packs skipped", flush=True)
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
    assert len(loaded) == requests_before_rebuilds, "Rebuilds should reuse the loaded textures"
    assert not errors, errors
    browser.close()
    print("PASS: texture assets, bump/roughness maps, scene rebuilds, both themes and close-up rendering; no runtime errors")
