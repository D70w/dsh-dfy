import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent.parent
HARNESS = ROOT.parent / "deepseek-harness"
BUILT_CLI = HARNESS / "apps" / "cli" / "lib" / "bin.js"
SOURCE_CLI = HARNESS / "apps" / "cli" / "src" / "bin.ts"
PORT = int(os.environ.get("WHALE_LIFECYCLE_PORT", "3091"))
BASE_URL = f"http://127.0.0.1:{PORT}"


def port_open() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.2)
        return probe.connect_ex(("127.0.0.1", PORT)) == 0


def stop_process_tree(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        process.send_signal(signal.CTRL_BREAK_EVENT)
        try:
            process.wait(timeout=5)
            return
        except subprocess.TimeoutExpired:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
    else:
        process.terminate()
        try:
            process.wait(timeout=5)
            return
        except subprocess.TimeoutExpired:
            process.kill()
    process.wait(timeout=5)


def cli_command(*args: str) -> list[str]:
    if BUILT_CLI.is_file():
        return ["node", str(BUILT_CLI.relative_to(HARNESS)), *args]
    return ["node", "--import", "tsx/esm", str(SOURCE_CLI.relative_to(HARNESS)), *args]


def run_cli(environment: dict[str, str], *args: str) -> None:
    subprocess.run(
        cli_command(*args),
        cwd=HARNESS,
        env=environment,
        check=True,
    )


def start_web(environment: dict[str, str]) -> subprocess.Popen[bytes]:
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    process = subprocess.Popen(
        cli_command("web", "--port", str(PORT)),
        cwd=HARNESS,
        env=environment,
        creationflags=flags,
    )
    deadline = time.monotonic() + 70
    while not port_open():
        if process.poll() is not None:
            raise RuntimeError(f"isolated DSH exited during startup with {process.returncode}")
        if time.monotonic() >= deadline:
            stop_process_tree(process)
            raise TimeoutError("isolated DSH did not listen within 70 seconds")
        time.sleep(0.25)
    return process


def stop_web(process: subprocess.Popen[bytes]) -> None:
    stop_process_tree(process)
    deadline = time.monotonic() + 6
    while port_open() and time.monotonic() < deadline:
        time.sleep(0.1)
    if port_open():
        raise RuntimeError(f"owned DSH process left port {PORT} occupied")


if port_open():
    raise SystemExit(f"port {PORT} is occupied; refusing to attach to an unowned process")
if not BUILT_CLI.is_file() and not SOURCE_CLI.is_file():
    raise SystemExit(f"DeepSeek Harness checkout is missing at {HARNESS}")


with tempfile.TemporaryDirectory(prefix="dsh-whale-lifecycle-", ignore_cleanup_errors=True) as temporary:
    # A brand-new DSH home otherwise waits for interactive welcome setup before
    # the web server listens. Lifecycle verification must be fully unattended.
    (Path(temporary) / "settings.yaml").write_text(
        "ui-onboarding:\n  welcomeNoticeVersion: 2026-08-13.1\n",
        encoding="utf-8",
    )
    environment = os.environ.copy()
    environment["DSH_HOME"] = temporary
    run_cli(environment, "plugin", "--profile", "web", "add", "--workspace-root", str(ROOT))

    installed_server = start_web(environment)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            )
            page = browser.new_page(viewport={"width": 1280, "height": 800}, locale="zh-CN")
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=70_000)
            page.locator("[data-whale-pet-entry]").wait_for(state="attached", timeout=20_000)
            page.wait_for_function(
                "element => element.getAttribute('data-whale-renderer') === 'ready'",
                arg=page.locator("[data-whale-renderer]").element_handle(),
                timeout=20_000,
            )
            assert page.locator("[data-whale-rig-canvas]").get_attribute("data-whale-animation-source") == "approved-test-runtime"
            browser.close()
    finally:
        stop_web(installed_server)

    run_cli(environment, "plugin", "--profile", "web", "remove", "--workspace-root", "dsh-dfy")
    removed_server = start_web(environment)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            )
            page = browser.new_page(viewport={"width": 1280, "height": 800}, locale="zh-CN")
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=70_000)
            page.wait_for_timeout(750)
            assert page.locator("[data-whale-pet-entry]").count() == 0
            assert page.locator('style[data-plugin="dsh-dfy"]').count() == 0
            browser.close()
        try:
            response = urlopen(
                f"{BASE_URL}/dsh-dfy/assets/v2/production-v1/idle/see-through-idle-rig-v2/manifest.json",
                timeout=3,
            )
            body = response.read()
            # The full Web app may serve its HTML fallback for an unknown path.
            # It must not serve the disposed plugin's JSON asset anymore.
            assert not response.headers.get_content_type().startswith("application/json")
            assert b"see-through" not in body
        except HTTPError as error:
            assert error.code == 404, error.code
    finally:
        stop_web(removed_server)

print("PASS: isolated profile install/start exposes the approved desktop runtime; remove/restart leaves no UI, style or asset route")
