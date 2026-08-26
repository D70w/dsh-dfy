import argparse
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parent.parent
HARNESS = ROOT.parent / "deepseek-harness"


def port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.2)
        return probe.connect_ex(("127.0.0.1", port)) == 0


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


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Whale Pet browser E2E against an owned DSH process.")
    parser.add_argument("--dsh-home", required=True, type=Path)
    parser.add_argument("--port", type=int, default=3088)
    args = parser.parse_args()

    dsh_home = args.dsh_home.resolve(strict=True)
    built_cli = HARNESS / "apps" / "cli" / "lib" / "bin.js"
    source_cli = HARNESS / "apps" / "cli" / "src" / "bin.ts"
    if not built_cli.is_file() and not source_cli.is_file():
        parser.error(f"DeepSeek Harness checkout not found at {HARNESS}")
    if port_open(args.port):
        parser.error(f"port {args.port} is already occupied; refusing to attach to an unowned server")

    environment = os.environ.copy()
    environment["DSH_HOME"] = str(dsh_home)
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    cli_command = ["node", str(built_cli.relative_to(HARNESS)), "web", "--port", str(args.port)] \
        if built_cli.is_file() \
        else ["node", "--import", "tsx/esm", str(source_cli.relative_to(HARNESS)), "web", "--port", str(args.port)]
    server = subprocess.Popen(
        cli_command,
        cwd=HARNESS,
        env=environment,
        creationflags=flags,
    )
    try:
        deadline = time.monotonic() + 60
        while not port_open(args.port):
            if server.poll() is not None:
                raise RuntimeError(f"DSH exited during startup with code {server.returncode}")
            if time.monotonic() >= deadline:
                raise TimeoutError("DSH did not listen within 60 seconds")
            time.sleep(0.25)
        test_environment = environment.copy()
        test_environment["WHALE_E2E_BASE_URL"] = f"http://127.0.0.1:{args.port}"
        for script in [
            "browser_e2e.py",
            "browser_motion_acceptance.py",
            "browser_release_gates.py",
        ]:
            result = subprocess.run(
                [sys.executable, str(ROOT / "tests" / script)],
                cwd=ROOT,
                env=test_environment,
                check=False,
            )
            if result.returncode != 0:
                return result.returncode
        return 0
    finally:
        stop_process_tree(server)
        deadline = time.monotonic() + 5
        while port_open(args.port) and time.monotonic() < deadline:
            time.sleep(0.1)
        if port_open(args.port):
            raise RuntimeError(f"owned DSH process left port {args.port} occupied")


if __name__ == "__main__":
    raise SystemExit(main())
