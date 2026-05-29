#!/usr/bin/env python3
"""
Local server GUI for GameDudeSynth export page (Windows-friendly).

Features:
- Start/stop local HTTP server from a small GUI
- Serves this repository directory
- "/" maps to main-v2-export.html
- Open page in default browser
"""

from __future__ import annotations

import os
import sys
import socket
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox
from urllib.parse import urlparse
import webbrowser

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


HOST = "127.0.0.1"
DEFAULT_PORT = 3000
DEFAULT_PAGE = "main-v2-export.html"


def _resolve_serve_root() -> Path:
    """
    Directory to serve over HTTP (must contain main-v2-export.html).

    When the .exe lives in dist/, walk up to the real project root.
    """
    if getattr(sys, "frozen", False):
        start = Path(sys.executable).resolve().parent
    else:
        start = Path(__file__).resolve().parent

    bundle_marker = Path("public") / "gameboy-player.iife.js"
    current = start
    for _ in range(8):
        if (current / DEFAULT_PAGE).is_file() and (current / bundle_marker).is_file():
            return current
        if (current / DEFAULT_PAGE).is_file():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return start


ROOT_DIR = _resolve_serve_root()


class RootPageHandler(SimpleHTTPRequestHandler):
    """HTTP handler that serves the repo and redirects '/' to main page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):  # noqa: N802 (base class API)
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.path = f"/{DEFAULT_PAGE}"
        return super().do_GET()

    def log_message(self, fmt: str, *args):
        # Keep stdout quiet for GUI usage.
        pass


class ServerController:
    def __init__(self) -> None:
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._port: int | None = None

    def _is_running_unlocked(self) -> bool:
        return (
            self._server is not None
            and self._thread is not None
            and self._thread.is_alive()
        )

    def is_running(self) -> bool:
        with self._lock:
            return self._is_running_unlocked()

    @property
    def port(self) -> int | None:
        return self._port

    def start(self, port: int) -> None:
        with self._lock:
            if self._is_running_unlocked():
                return
            server = ThreadingHTTPServer((HOST, port), RootPageHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            self._server = server
            self._thread = thread
            self._port = port

    def stop(self) -> None:
        with self._lock:
            server = self._server
            thread = self._thread
            self._server = None
            self._thread = None
            self._port = None

        if server is not None:
            server.shutdown()
            server.server_close()
        if thread is not None and thread.is_alive():
            thread.join(timeout=2)


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("GameDudeSynth Local Server")
        self.resizable(False, False)

        self.controller = ServerController()

        self.port_var = tk.StringVar(value=str(DEFAULT_PORT))
        self.status_var = tk.StringVar(value="Stopped")
        self.url_var = tk.StringVar(value=self._build_url(DEFAULT_PORT))
        self.log_var = tk.StringVar(value=f"Serving folder: {ROOT_DIR}")

        self._build_ui()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self) -> None:
        frame = tk.Frame(self, padx=12, pady=12)
        frame.pack(fill="both", expand=True)

        tk.Label(frame, text="Port:").grid(row=0, column=0, sticky="w")
        tk.Entry(frame, textvariable=self.port_var, width=10).grid(row=0, column=1, sticky="w", padx=(6, 12))

        self.start_btn = tk.Button(frame, text="Start Server", width=14, command=self._start_server)
        self.start_btn.grid(row=0, column=2, padx=4)

        self.stop_btn = tk.Button(frame, text="Stop Server", width=14, command=self._stop_server, state="disabled")
        self.stop_btn.grid(row=0, column=3, padx=4)

        self.open_btn = tk.Button(frame, text="Open in Browser", width=14, command=self._open_browser, state="disabled")
        self.open_btn.grid(row=0, column=4, padx=(8, 0))

        tk.Label(frame, text="Status:").grid(row=1, column=0, sticky="w", pady=(12, 0))
        tk.Label(frame, textvariable=self.status_var).grid(row=1, column=1, columnspan=4, sticky="w", pady=(12, 0))

        tk.Label(frame, text="URL:").grid(row=2, column=0, sticky="w", pady=(6, 0))
        tk.Label(frame, textvariable=self.url_var, fg="blue").grid(row=2, column=1, columnspan=4, sticky="w", pady=(6, 0))

        tk.Label(frame, textvariable=self.log_var, wraplength=600, justify="left", fg="gray25").grid(
            row=3, column=0, columnspan=5, sticky="w", pady=(10, 0)
        )

    def _build_url(self, port: int) -> str:
        return f"http://{HOST}:{port}/{DEFAULT_PAGE}"

    def _find_available_port(self, preferred: int) -> int:
        if self._is_port_free(preferred):
            return preferred
        for port in range(preferred + 1, preferred + 50):
            if self._is_port_free(port):
                return port
        raise OSError("No free ports available in search range.")

    @staticmethod
    def _is_port_free(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            return s.connect_ex((HOST, port)) != 0

    def _start_server(self) -> None:
        if self.controller.is_running():
            return

        try:
            requested_port = int(self.port_var.get().strip())
            if requested_port < 1 or requested_port > 65535:
                raise ValueError
        except ValueError:
            messagebox.showerror("Invalid Port", "Enter a valid port number (1-65535).")
            return

        page_path = ROOT_DIR / DEFAULT_PAGE
        if not page_path.is_file():
            messagebox.showerror(
                "Export page missing",
                f"Could not find:\n{page_path}\n\n"
                "Run this app from the GameDudeSynth project folder "
                f"(where {DEFAULT_PAGE} and public/ live).\n"
                "If you use the compiled exe, keep it in the project root, not only in dist/.",
            )
            return

        try:
            port = self._find_available_port(requested_port)
            self.controller.start(port)
        except Exception as exc:  # noqa: BLE001
            messagebox.showerror("Start Failed", f"Could not start server:\n{exc}")
            return

        self.port_var.set(str(port))
        self.status_var.set("Running")
        self.url_var.set(self._build_url(port))
        self.log_var.set(f"Serving: {ROOT_DIR}")
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self.open_btn.config(state="normal")

    def _stop_server(self) -> None:
        if not self.controller.is_running():
            return
        self.controller.stop()
        self.status_var.set("Stopped")
        self.log_var.set("Server stopped.")
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.open_btn.config(state="disabled")

    def _open_browser(self) -> None:
        if not self.controller.is_running() or self.controller.port is None:
            return
        webbrowser.open(self._build_url(self.controller.port))

    def _on_close(self) -> None:
        try:
            self._stop_server()
        finally:
            self.destroy()


def main() -> None:
    os.chdir(ROOT_DIR)
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()

